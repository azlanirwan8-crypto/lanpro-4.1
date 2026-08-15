# Struktur 5 tabel kembar sebelum dihapus

Dicatat 16 Agustus 2026, tepat sebelum `DROP TABLE` dijalankan (item #48).

Kelimanya KOSONG (0 baris) dan tidak dirujuk foreign key mana pun.
Seluruh data ada di varian PascalCase yang tetap dipakai.

Tabel ini lahir karena `server/migrations/runner.ts` menulis nama tabel
TANPA kutip, sehingga PostgreSQL menurunkannya menjadi huruf kecil,
sementara `src/lib/pg-migrate.ts` memakai kutip. Sumbernya sudah dihapus
16 Agu 2026, jadi kembaran tidak akan lahir lagi.

Catatan ini disimpan supaya penghapusan bisa ditelusuri, bukan sebagai
cadangan yang bisa dipulihkan — tidak ada data yang perlu dipulihkan.

## `masterdata`

| Kolom             | Tipe              | Null |
| ----------------- | ----------------- | :--: |
| `id`              | character varying |  —   |
| `type`            | character varying |  —   |
| `label`           | character varying |  —   |
| `color`           | character varying |  ya  |
| `icon`            | character varying |  ya  |
| `order`           | integer           |  ya  |
| `description`     | text              |  ya  |
| `fieldtype`       | character varying |  ya  |
| `dropdownoptions` | jsonb             |  ya  |
| `role_type`       | character varying |  ya  |
| `createdat`       | character varying |  ya  |

## `projectmodules`

| Kolom        | Tipe              | Null |
| ------------ | ----------------- | :--: |
| `id`         | character varying |  —   |
| `projectid`  | character varying |  —   |
| `namamodul`  | character varying |  —   |
| `keterangan` | text              |  ya  |
| `createdat`  | character varying |  —   |

## `qatestcases`

| Kolom              | Tipe              | Null |
| ------------------ | ----------------- | :--: |
| `id`               | character varying |  —   |
| `projectid`        | character varying |  —   |
| `judul`            | character varying |  —   |
| `deskripsi`        | text              |  ya  |
| `tipetesting`      | character varying |  —   |
| `prioritas`        | character varying |  —   |
| `caseid`           | character varying |  ya  |
| `expected`         | text              |  ya  |
| `status`           | character varying |  —   |
| `steps`            | jsonb             |  —   |
| `history`          | jsonb             |  —   |
| `createdat`        | character varying |  —   |
| `activetesterid`   | character varying |  ya  |
| `activetestername` | character varying |  ya  |
| `lockedat`         | character varying |  ya  |

## `qatestsuites`

| Kolom        | Tipe              | Null |
| ------------ | ----------------- | :--: |
| `id`         | character varying |  —   |
| `projectid`  | character varying |  —   |
| `name`       | character varying |  —   |
| `phase`      | character varying |  —   |
| `uploadedby` | character varying |  —   |
| `uploadedat` | character varying |  —   |
| `filename`   | character varying |  ya  |

## `qatestcaseexecutionlogs`

| Kolom              | Tipe              | Null |
| ------------------ | ----------------- | :--: |
| `id`               | character varying |  —   |
| `testcaseid`       | character varying |  —   |
| `projectid`        | character varying |  —   |
| `runversion`       | integer           |  —   |
| `runlabel`         | character varying |  —   |
| `executionstatus`  | character varying |  —   |
| `linkedissuekey`   | character varying |  ya  |
| `executedbyuserid` | character varying |  ya  |
| `executedbyname`   | character varying |  ya  |
| `timestamp`        | character varying |  —   |
| `notes`            | text              |  ya  |
| `evidences`        | jsonb             |  ya  |
