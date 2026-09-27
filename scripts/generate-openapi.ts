/**
 * #315 gelombang 3 — generate OpenAPI dari skema Zod + pemindaian rute.
 *
 * - Membaca server/routes (semua .ts, kecuali *.test.*)
 * - Mencocokkan METHOD + path dengan validasiBody/Query/Params(schemaName)
 * - Mengubah skema lewat z.toJSONSchema (Zod 4)
 * - Menulis docs/openapi.json (+ salinan subset untuk kompatibilitas skrip lama)
 *
 * Tanpa Swagger UI. Jalankan: npm run openapi:generate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import * as allSchemas from "../server/schemas/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const routesDir = path.join(root, "server", "routes");
const outFull = path.join(root, "docs", "openapi.json");
const outSubset = path.join(root, "docs", "openapi-subset.json");

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface RouteHit {
  method: HttpMethod;
  path: string;
  file: string;
  body?: string;
  query?: string;
  params?: string;
}

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listRouteFiles(p));
    else if (/\.ts$/.test(ent.name) && !/\.test\./.test(ent.name)) out.push(p);
  }
  return out;
}

function stripJsonSchemaMeta(schema: Record<string, unknown>): Record<string, unknown> {
  const { $schema, ...rest } = schema;
  return rest;
}

function zodToOpenApiSchema(schemaName: string): Record<string, unknown> | null {
  const schema = (allSchemas as Record<string, unknown>)[schemaName];
  if (!schema || typeof schema !== "object") return null;
  // Zod schemas have ~standard or _zod; duck-type via safe toJSONSchema
  try {
    const json = z.toJSONSchema(schema as z.ZodType) as Record<string, unknown>;
    return stripJsonSchemaMeta(json);
  } catch (err) {
    console.warn(`[openapi] skip ${schemaName}:`, (err as Error).message);
    return null;
  }
}

function scanFile(filePath: string): RouteHit[] {
  const src = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const hits: RouteHit[] = [];

  // Hanya router.get / app.get di tingkat rute — bukan req.app.get("io")
  const re =
    /(?<![\w.])(?:router|app)\.(get|post|put|patch|delete)\(\s*(?:(?:[\w.]+)\s*,\s*)*(["'`])(\/[^"'`]*)\2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const method = m[1] as HttpMethod;
    const routePath = m[3];
    // Jendela setelah path: middleware + validasi*
    const window = src.slice(m.index, Math.min(src.length, m.index + 1200));
    const body = window.match(/validasiBody\(\s*([A-Za-z0-9_]+)\s*\)/)?.[1];
    const query = window.match(/validasiQuery\(\s*([A-Za-z0-9_]+)\s*\)/)?.[1];
    const params = window.match(/validasiParams\(\s*([A-Za-z0-9_]+)\s*\)/)?.[1];
    hits.push({ method, path: routePath, file: rel, body, query, params });
  }
  return hits;
}

function tagFromPath(p: string): string {
  const parts = p.replace(/^\/api(\/v1)?\//, "").split("/").filter(Boolean);
  return parts[0] || "root";
}

function expressPathToOpenApi(p: string): string {
  return p.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function buildSpec(hits: RouteHit[], routeFilesScanned: number) {
  const paths: Record<string, Record<string, unknown>> = {};
  const componentsSchemas: Record<string, unknown> = {
    ErrorEnvelope: {
      type: "object",
      required: ["status", "code", "message"],
      properties: {
        status: { type: "string", enum: ["error"] },
        code: { type: "string" },
        message: { type: "string" },
        errors: {
          type: "object",
          additionalProperties: { type: "array", items: { type: "string" } },
        },
      },
    },
  };

  const usedSchemas = new Set<string>();
  const withZod = hits.filter((h) => h.body || h.query || h.params);

  for (const hit of withZod) {
    const oaPath = expressPathToOpenApi(hit.path);
    paths[oaPath] ||= {};
    const op: Record<string, unknown> = {
      summary: `${hit.method.toUpperCase()} ${hit.path}`,
      tags: [tagFromPath(hit.path)],
      "x-source": hit.file,
      responses: {
        "200": { description: "OK" },
        "400": {
          description: "Validasi gagal",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } },
          },
        },
      },
    };

    if (!hit.path.includes("/auth/login") && !hit.path.includes("/auth/register")) {
      op.security = [{ bearerAuth: [] }];
    }

    if (hit.body) {
      usedSchemas.add(hit.body);
      const json = zodToOpenApiSchema(hit.body);
      if (json) {
        componentsSchemas[hit.body] = json;
        op.requestBody = {
          required: true,
          content: { "application/json": { schema: { $ref: `#/components/schemas/${hit.body}` } } },
        };
      }
    }

    if (hit.query) {
      usedSchemas.add(hit.query);
      const json = zodToOpenApiSchema(hit.query);
      if (json) {
        componentsSchemas[hit.query] = json;
        const props = (json.properties || {}) as Record<string, unknown>;
        const required = new Set((json.required as string[]) || []);
        op.parameters = Object.entries(props).map(([name, schema]) => ({
          name,
          in: "query",
          required: required.has(name),
          schema,
        }));
      }
    }

    if (hit.params) {
      usedSchemas.add(hit.params);
      const json = zodToOpenApiSchema(hit.params);
      if (json) {
        componentsSchemas[hit.params] = json;
        const props = (json.properties || {}) as Record<string, unknown>;
        const required = new Set((json.required as string[]) || []);
        const pathParams = Object.entries(props).map(([name, schema]) => ({
          name,
          in: "path",
          required: required.has(name) || true,
          schema,
        }));
        op.parameters = [...((op.parameters as unknown[]) || []), ...pathParams];
      }
    }

    // Path params dari :id di URL bila belum ada
    const pathParamNames = [...hit.path.matchAll(/:([A-Za-z0-9_]+)/g)].map((x) => x[1]);
    if (pathParamNames.length) {
      const existing = new Set(
        ((op.parameters as { name: string; in: string }[]) || [])
          .filter((p) => p.in === "path")
          .map((p) => p.name)
      );
      const extra = pathParamNames
        .filter((n) => !existing.has(n))
        .map((name) => ({
          name,
          in: "path",
          required: true,
          schema: { type: "string" },
        }));
      if (extra.length) op.parameters = [...((op.parameters as unknown[]) || []), ...extra];
    }

    paths[oaPath][hit.method] = op;
  }

  // Juga daftarkan SEMUA skema Zod yang diekspor (meski belum terpasang rute)
  // supaya spek "dari seluruh Zod" terpenuhi untuk komponen.
  for (const [name, value] of Object.entries(allSchemas)) {
    if (!name.endsWith("Schema") && !/Schema$/.test(name)) continue;
    if (typeof value !== "object" || value === null) continue;
    if (componentsSchemas[name]) continue;
    const json = zodToOpenApiSchema(name);
    if (json) {
      componentsSchemas[name] = json;
      usedSchemas.add(name);
    }
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "LanPro API (#315 gelombang 3 — dari Zod)",
      version: "0.3.0",
      description:
        "Digenerate dari skema Zod (`server/schemas`) + pemindaian validasiBody/Query/Params di `server/routes`. " +
        "Prefix kanonik `/api`; `/api/v1` legacy (file/meeting AI). " +
        "Envelope error: { status, code, message, errors? }. Tanpa Swagger UI. Idempotency-Key belum.",
    },
    servers: [{ url: "/", description: "Same origin" }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: componentsSchemas,
    },
    "x-lanpro-stats": {
      routeFilesScanned,
      routeHits: hits.length,
      operationsWithZod: withZod.length,
      componentSchemas: Object.keys(componentsSchemas).length,
      generatedAt: new Date().toISOString(),
    },
    "x-lanpro-notes": {
      apiVsV1:
        "/api adalah kanonik. /api/v1 tersisa di sebagian meetings AI, file stream, QA AI.",
      idempotencyKey: "DITAHAN sebagai #332 (bukan bagian #315 yang sudah SELESAI).",
    },
  };
}

function main() {
  const files = listRouteFiles(routesDir);
  const hits = files.flatMap(scanFile);
  const spec = buildSpec(hits, files.length);

  fs.mkdirSync(path.dirname(outFull), { recursive: true });
  const json = JSON.stringify(spec, null, 2) + "\n";
  fs.writeFileSync(outFull, json);
  fs.writeFileSync(outSubset, json);

  const stats = (
    spec as unknown as { "x-lanpro-stats": { operationsWithZod: number; componentSchemas: number; routeHits: number } }
  )["x-lanpro-stats"];
  console.log("Wrote", outFull);
  console.log("Wrote", outSubset, "(salinan untuk npm run openapi:generate lama)");
  console.log(
    `ops+Zod=${stats.operationsWithZod} schemas=${stats.componentSchemas} scannedRoutes=${stats.routeHits}`
  );
}

main();
