import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export interface ValidationTargets {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

/**
 * Memformat error Zod menjadi struktur objek yang rapi dan mudah dibaca frontend.
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_global";
    if (!formatted[key]) {
      formatted[key] = [];
    }
    formatted[key].push(issue.message);
  }
  return formatted;
}

/**
 * Middleware validasi skema Zod terpusat (F7 / Item #4).
 * Memvalidasi body, query, dan params sebelum menyentuh database atau handler rute.
 */
export function validasiRequest(targets: ValidationTargets) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (targets.params) {
        const result = targets.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            status: "error",
            message: `Parameter URL tidak valid: ${result.error.issues[0]?.message || "Format salah"}`,
            errors: formatZodErrors(result.error),
          });
        }
        req.params = result.data;
      }

      if (targets.query) {
        const result = targets.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            status: "error",
            message: `Query parameter tidak valid: ${result.error.issues[0]?.message || "Format salah"}`,
            errors: formatZodErrors(result.error),
          });
        }
        req.query = result.data;
      }

      if (targets.body) {
        const result = targets.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            status: "error",
            message: `Data permintaan tidak valid: ${result.error.issues[0]?.message || "Format salah"}`,
            errors: formatZodErrors(result.error),
          });
        }
        req.body = result.data;
      }

      next();
    } catch (err: any) {
      return res.status(400).json({
        status: "error",
        code: "srv.format_permintaan_tidak_dapat",
        message: "Format permintaan tidak dapat diproses",
        error: err?.message || "Invalid payload",
      });
    }
  };
}

export function validasiBody(schema: ZodSchema<any>) {
  return validasiRequest({ body: schema });
}

export function validasiQuery(schema: ZodSchema<any>) {
  return validasiRequest({ query: schema });
}

export function validasiParams(schema: ZodSchema<any>) {
  return validasiRequest({ params: schema });
}
