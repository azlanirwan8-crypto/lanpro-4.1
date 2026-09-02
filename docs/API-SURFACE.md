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

**Ditahan** — belum dipasang. Catat di sini agar tidak dianggap lupa: butuh keputusan (header wajib pada POST mana; penyimpanan kunci; TTL). Bukan bagian gelombang 2–3.

## DOMPurify

Dependensi `dompurify` dihapus pada gelombang #315 — tidak dipakai. Sanitasi server memakai `xss` di jalur yang sudah ada.
