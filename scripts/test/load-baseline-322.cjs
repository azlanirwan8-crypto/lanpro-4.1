/**
 * #322 — baseline beban HTTP tanpa kredensial pemilik.
 *
 * Mengukur GET publik (/api/health) dengan N concurrent.
 * Untuk jalur autentikasi: set LOAD_TEST_USER + LOAD_TEST_PASSWORD di env
 * (jangan hardcode kata sandi di repo).
 *
 * Usage:
 *   node scripts/test/load-baseline-322.cjs
 *   node scripts/test/load-baseline-322.cjs 50
 *   LOAD_TEST_USER=... LOAD_TEST_PASSWORD=... node scripts/test/load-baseline-322.cjs 100
 */
const http = require("http");

const N = Math.max(1, Math.min(300, parseInt(process.argv[2] || "50", 10) || 50));
const BASE = process.env.LOAD_TEST_BASE || "http://localhost:3000";
const USER = process.env.LOAD_TEST_USER || "";
const PASS = process.env.LOAD_TEST_PASSWORD || "";

function request(method, urlPath, headers = {}, body) {
  return new Promise((resolve) => {
    const u = new URL(urlPath, BASE);
    const start = Date.now();
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + u.search,
        method,
        headers,
        timeout: 20000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            latency: Date.now() - start,
            ok: res.statusCode >= 200 && res.statusCode < 400,
            body: data,
          });
        });
      }
    );
    req.on("error", (err) =>
      resolve({ status: 0, latency: Date.now() - start, ok: false, error: err.message })
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, latency: Date.now() - start, ok: false, error: "timeout" });
    });
    if (body) req.write(body);
    req.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function summarize(label, results) {
  const lat = results.map((r) => r.latency).sort((a, b) => a - b);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const byStatus = {};
  for (const r of results) {
    const k = String(r.status || r.error || "?");
    byStatus[k] = (byStatus[k] || 0) + 1;
  }
  return {
    label,
    n: results.length,
    ok,
    fail,
    p50: percentile(lat, 50),
    p95: percentile(lat, 95),
    p99: percentile(lat, 99),
    max: lat[lat.length - 1] || 0,
    byStatus,
  };
}

async function loginToken() {
  if (!USER || !PASS) return null;
  const payload = JSON.stringify({ username: USER, password: PASS });
  const res = await request(
    "POST",
    "/api/auth/login",
    { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
    payload
  );
  try {
    const data = JSON.parse(res.body || "{}");
    if (res.status === 200 && data.token) return data.token;
    if (res.status === 409 && data.activeSession?.token) return data.activeSession.token;
  } catch (_) {
    /* ignore */
  }
  console.error("Login gagal:", res.status, (res.body || "").slice(0, 200));
  return null;
}

async function burst(label, fn) {
  const results = await Promise.all(Array.from({ length: N }, (_, i) => fn(i)));
  return summarize(label, results);
}

(async () => {
  console.log(JSON.stringify({ base: BASE, concurrent: N, auth: Boolean(USER && PASS) }));

  const health = await burst("GET /api/health-check", () => request("GET", "/api/health-check"));
  console.log(JSON.stringify(health));

  const token = await loginToken();
  if (!token) {
    console.log(
      JSON.stringify({
        note: "Tanpa LOAD_TEST_USER/PASSWORD — lewati GET /api/projects & /api/tasks. Pool Neon tetap 5–20 (db.ts dikunci).",
      })
    );
    process.exit(health.fail > health.ok / 2 ? 1 : 0);
  }

  const headers = { Authorization: `Bearer ${token}` };
  const projects = await burst("GET /api/projects", () => request("GET", "/api/projects", headers));
  console.log(JSON.stringify(projects));

  const tasks = await burst("GET /api/tasks", () => request("GET", "/api/tasks", headers));
  console.log(JSON.stringify(tasks));

  const worstFail = [health, projects, tasks].some((s) => s.fail > s.n * 0.1);
  process.exit(worstFail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
