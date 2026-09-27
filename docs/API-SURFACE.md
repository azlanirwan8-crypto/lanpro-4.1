# Permukaan API LanPro (#315)

## Prefix

| Prefix    | Peran                                                               |
| --------- | ------------------------------------------------------------------- |
| `/api`    | **Kanonik** — hampir semua CRUD, auth, admin, audit                 |
| `/api/v1` | **Legacy** — sebagian meetings AI/upload/status, file stream, QA AI |

Jangan menambah endpoint `/api/v1` baru tanpa keputusan pemilik. Klien baru memakai `/api`.

## Envelope error

Kanonik (global handler + middleware + sebagian besar rute):

```json
{ "status": "error", "code": "srv.kode", "message": "…", "errors": {} }
```

**Gelombang 1 (02 Sep):** `errorHandler` / `notFoundHandler` → bentuk di atas.

**Gelombang 2 (02 Sep):** sapuan `{ error: string }` pada `db-admin` (query kosong) dan status pending/rejected di `auth.routes` login → envelope kanonik + `code` yang ada di kamus i18n.

## OpenAPI

**Gelombang 3 (02 Sep):** spek digenerate dari **seluruh skema Zod** (`server/schemas`) + pemindaian `validasiBody` / `validasiQuery` / `validasiParams` di `server/routes`.

| Berkas                     | Peran                                                 |
| -------------------------- | ----------------------------------------------------- |
| `docs/openapi.json`        | Keluaran kanonik                                      |
| `docs/openapi-subset.json` | Salinan yang sama (kompatibilitas skrip/dokumen lama) |

Perintah: `npm run openapi:generate` → `tsx scripts/generate-openapi.ts`  
(Wrapper `scripts/generate-openapi.cjs` tetap memanggil generator TS.)

Tanpa Swagger UI. Regenerasi ulang setelah menambah/mengubah skema Zod atau memasang `validasi*` di rute.

## Zod rute berkas

`server/schemas/file.schema.ts` + `validasiQuery` pada `GET /api/v1/files/secure-stream`. Unggah multer tetap divalidasi magic-bytes di `fileSecurity` (bukan diganti Zod body).

## Idempotency-Key

**DITAHAN** sebagai item **#332** (dipisah dari #315, 02 Sep 2026). Belum dipasang — butuh keputusan (header wajib/opsional pada POST mana; store Redis/Postgres; TTL). Bukan bagian gelombang 1–3 #315 dan bukan penahan rilis.

## DOMPurify

Dependensi `dompurify` dihapus pada gelombang #315 — tidak dipakai. Sanitasi server memakai `xss` di jalur yang sudah ada.
