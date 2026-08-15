# Schema Database LanPro

**Dibaca langsung dari database hidup (Neon PostgreSQL) pada 16 Agustus 2026.**

Dokumen ini TIDAK disusun dari pemindaian kode. Schema yang digambarkan dari
kode hanya menunjukkan apa yang DIMAKSUD, bukan apa yang benar-benar ADA —
dan selisih keduanya persis yang melahirkan tabel kembar di bawah.

Perbarui dengan menjalankan ulang pemeriksaan yang sama; jangan disunting
manual, karena dokumen yang menyimpang dari kenyataan lebih berbahaya
daripada tidak ada dokumen.

---

## Ringkasan

|                                   | Jumlah |
| --------------------------------- | -----: |
| Tabel seluruhnya                  |     30 |
| Tabel aktif                       |     30 |
| 🔴 Tabel kembar (kosong, warisan) |      0 |

---

## Tabel kembar — pelajaran yang tetap berlaku

PostgreSQL memperlakukan `"MasterData"` dan `masterdata` sebagai **dua tabel
berbeda**: identifier tanpa kutip otomatis diubah menjadi huruf kecil.

Repo ini pernah punya dua sistem migrasi. `pg-migrate.ts` menulis nama tabel
**dengan** kutip, sementara `server/migrations/runner.ts` menulisnya **tanpa**
kutip. Keduanya berjalan pada database yang sama, sehingga lima tabel
terbentuk dua kali dalam dua ejaan — dan varian huruf kecilnya selalu kosong,
karena seluruh kueri aplikasi lewat adapter yang mengutip nama tabel.

**Keadaan sekarang: bersih.** `runner.ts` dihapus 16 Agu 2026 sehingga
kembaran tidak akan lahir lagi, dan lima tabel yang terlanjur ada sudah
dihapus pada hari yang sama (item #48). Strukturnya tercatat di
`docs/legacy/tabel-kembar-dihapus-2026-08-16.md`.

---

## Penamaan

Repo ini memakai **dua gaya sekaligus**: 27 tabel PascalCase dan
3 tabel snake_case.

| Gaya                   | Tabel                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| PascalCase (mayoritas) | 27 tabel                                                           |
| snake_case             | `ai_learning_logs`, `discussion_point_comments`, `meeting_details` |

**Aturan untuk tabel BARU: PascalCase dengan kutip ganda**, mengikuti
mayoritas. Tanpa kutip, PostgreSQL akan menurunkannya menjadi huruf kecil
dan menghasilkan kembaran seperti di atas.

```sql
CREATE TABLE IF NOT EXISTS "NamaTabel" (   -- benar
CREATE TABLE IF NOT EXISTS NamaTabel   (   -- SALAH, jadi namatabel
```

---

## Daftar tabel

| Tabel                       | Kolom | Baris |
| --------------------------- | ----: | ----: |
| `ActivityLogs`              |    11 |     1 |
| `Attachments`               |    18 |     0 |
| `AuditLogs`                 |    12 |    63 |
| `Comments`                  |     8 |     0 |
| `DiscussionPoints`          |    34 |     5 |
| `Documents`                 |    15 |    10 |
| `LinkedTasks`               |     5 |     0 |
| `MasterData`                |    11 |    76 |
| `Meetings`                  |    22 |     9 |
| `Messages`                  |     9 |     0 |
| `MilestoneSprints`          |     2 |     0 |
| `Milestones`                |     8 |     0 |
| `Notifications`             |    10 |    64 |
| `ProjectInvites`            |     7 |     0 |
| `ProjectMembers`            |     4 |    10 |
| `ProjectModules`            |     5 |     2 |
| `Projects`                  |    12 |     2 |
| `QATestCaseExecutionLogs`   |    13 |     0 |
| `QATestCases`               |    35 |     1 |
| `QATestSuites`              |    12 |     2 |
| `Sprints`                   |    11 |     7 |
| `TaskCustomFields`          |     5 |     0 |
| `TaskExternalLinks`         |     6 |     0 |
| `Tasks`                     |    32 |    30 |
| `TokenBlacklist`            |     4 |     0 |
| `UserIdentities`            |     6 |     2 |
| `Users`                     |    21 |    11 |
| `ai_learning_logs`          |     4 |     0 |
| `discussion_point_comments` |    11 |     4 |
| `meeting_details`           |    12 |     0 |

---

## Rincian kolom

### `ActivityLogs`

11 kolom · 1 baris

| Kolom         | Tipe                        | Null | Kunci |
| ------------- | --------------------------- | :--: | ----- |
| `id`          | character varying           |  —   | PK    |
| `taskId`      | character varying           |  ya  | —     |
| `projectId`   | character varying           |  ya  | —     |
| `userId`      | character varying           |  ya  | —     |
| `action`      | character varying           |  —   | —     |
| `details`     | text                        |  ya  | —     |
| `createdAt`   | timestamp without time zone |  ya  | —     |
| `entityId`    | character varying           |  ya  | —     |
| `entityName`  | character varying           |  ya  | —     |
| `actionType`  | character varying           |  ya  | —     |
| `description` | text                        |  ya  | —     |

### `Attachments`

18 kolom · 0 baris

| Kolom              | Tipe                        | Null | Kunci |
| ------------------ | --------------------------- | :--: | ----- |
| `id`               | character varying           |  —   | PK    |
| `taskId`           | character varying           |  —   | —     |
| `filename`         | character varying           |  —   | —     |
| `originalName`     | character varying           |  ya  | —     |
| `mimetype`         | character varying           |  ya  | —     |
| `size`             | bigint                      |  ya  | —     |
| `url`              | text                        |  ya  | —     |
| `uploadedBy`       | character varying           |  ya  | —     |
| `uploadedAt`       | timestamp without time zone |  ya  | —     |
| `name`             | character varying           |  ya  | —     |
| `type`             | character varying           |  ya  | —     |
| `fileRef`          | text                        |  ya  | —     |
| `uploadedByUserId` | character varying           |  ya  | —     |
| `uploadedByName`   | character varying           |  ya  | —     |
| `fileName`         | character varying           |  ya  | —     |
| `fileType`         | character varying           |  ya  | —     |
| `fileSize`         | bigint                      |  ya  | —     |
| `createdAt`        | timestamp without time zone |  ya  | —     |

### `AuditLogs`

12 kolom · 63 baris

| Kolom        | Tipe                        | Null | Kunci |
| ------------ | --------------------------- | :--: | ----- |
| `id`         | character varying           |  —   | PK    |
| `userId`     | character varying           |  ya  | —     |
| `projectId`  | character varying           |  ya  | —     |
| `entityName` | character varying           |  ya  | —     |
| `entityId`   | character varying           |  ya  | —     |
| `actionType` | character varying           |  ya  | —     |
| `changes`    | jsonb                       |  ya  | —     |
| `ipAddress`  | character varying           |  ya  | —     |
| `userAgent`  | text                        |  ya  | —     |
| `createdAt`  | timestamp without time zone |  ya  | —     |
| `oldValues`  | jsonb                       |  ya  | —     |
| `newValues`  | jsonb                       |  ya  | —     |

### `Comments`

8 kolom · 0 baris

| Kolom       | Tipe                        | Null | Kunci |
| ----------- | --------------------------- | :--: | ----- |
| `id`        | character varying           |  —   | PK    |
| `taskId`    | character varying           |  —   | —     |
| `authorId`  | character varying           |  —   | —     |
| `text`      | text                        |  —   | —     |
| `createdAt` | timestamp without time zone |  ya  | —     |
| `updatedAt` | timestamp without time zone |  ya  | —     |
| `userId`    | character varying           |  ya  | —     |
| `content`   | text                        |  ya  | —     |

### `DiscussionPoints`

34 kolom · 5 baris

| Kolom                 | Tipe                        | Null | Kunci |
| --------------------- | --------------------------- | :--: | ----- |
| `id`                  | character varying           |  —   | PK    |
| `meetingId`           | character varying           |  —   | —     |
| `content`             | text                        |  —   | —     |
| `authorId`            | character varying           |  ya  | —     |
| `createdAt`           | timestamp without time zone |  ya  | —     |
| `topic`               | text                        |  ya  | —     |
| `status`              | character varying           |  ya  | —     |
| `assigneeId`          | character varying           |  ya  | —     |
| `parentpointid`       | character varying           |  ya  | —     |
| `parent_point_id`     | character varying           |  ya  | —     |
| `concern`             | text                        |  ya  | —     |
| `comment`             | text                        |  ya  | —     |
| `next_action`         | text                        |  ya  | —     |
| `assignee_id`         | character varying           |  ya  | —     |
| `feature_id`          | character varying           |  ya  | —     |
| `system_id`           | character varying           |  ya  | —     |
| `surrounding_id`      | character varying           |  ya  | —     |
| `target_date`         | date                        |  ya  | —     |
| `assignto`            | character varying           |  ya  | —     |
| `assignTo`            | character varying           |  ya  | —     |
| `assign_to`           | character varying           |  ya  | —     |
| `parentPointId`       | character varying           |  ya  | —     |
| `keterangan`          | text                        |  ya  | —     |
| `tindakanLanjut`      | text                        |  ya  | —     |
| `tindakanlanjut`      | text                        |  ya  | —     |
| `tindakan_lanjut`     | text                        |  ya  | —     |
| `fitur`               | character varying           |  ya  | —     |
| `system`              | character varying           |  ya  | —     |
| `surrounding`         | character varying           |  ya  | —     |
| `targetDate`          | character varying           |  ya  | —     |
| `targetdate`          | character varying           |  ya  | —     |
| `tanggalUpdateStatus` | character varying           |  ya  | —     |
| `tanggalupdatestatus` | character varying           |  ya  | —     |
| `decision`            | text                        |  ya  | —     |

### `Documents`

15 kolom · 10 baris

| Kolom           | Tipe                        | Null | Kunci |
| --------------- | --------------------------- | :--: | ----- |
| `id`            | character varying           |  —   | PK    |
| `projectId`     | character varying           |  —   | —     |
| `title`         | character varying           |  —   | —     |
| `description`   | text                        |  ya  | —     |
| `type`          | character varying           |  ya  | —     |
| `link`          | text                        |  ya  | —     |
| `createdBy`     | character varying           |  ya  | —     |
| `downloadCount` | integer                     |  ya  | —     |
| `createdAt`     | timestamp without time zone |  ya  | —     |
| `updatedAt`     | timestamp without time zone |  ya  | —     |
| `fileName`      | character varying           |  ya  | —     |
| `fileType`      | character varying           |  ya  | —     |
| `fileSize`      | bigint                      |  ya  | —     |
| `fileRef`       | text                        |  ya  | —     |
| `fileData`      | text                        |  ya  | —     |

### `LinkedTasks`

5 kolom · 0 baris

| Kolom          | Tipe                        | Null | Kunci |
| -------------- | --------------------------- | :--: | ----- |
| `id`           | character varying           |  —   | PK    |
| `sourceTaskId` | character varying           |  —   | —     |
| `targetTaskId` | character varying           |  —   | —     |
| `linkType`     | character varying           |  ya  | —     |
| `createdAt`    | timestamp without time zone |  ya  | —     |

### `MasterData`

11 kolom · 76 baris

| Kolom             | Tipe                        | Null | Kunci |
| ----------------- | --------------------------- | :--: | ----- |
| `id`              | character varying           |  —   | PK    |
| `type`            | character varying           |  —   | —     |
| `label`           | character varying           |  —   | —     |
| `order`           | integer                     |  ya  | —     |
| `createdAt`       | timestamp without time zone |  ya  | —     |
| `role_type`       | character varying           |  ya  | —     |
| `color`           | character varying           |  ya  | —     |
| `icon`            | character varying           |  ya  | —     |
| `description`     | text                        |  ya  | —     |
| `fieldType`       | character varying           |  ya  | —     |
| `dropdownOptions` | jsonb                       |  ya  | —     |

### `Meetings`

22 kolom · 9 baris

| Kolom             | Tipe                        | Null | Kunci |
| ----------------- | --------------------------- | :--: | ----- |
| `id`              | character varying           |  —   | PK    |
| `projectId`       | character varying           |  —   | —     |
| `title`           | character varying           |  —   | —     |
| `agenda`          | text                        |  ya  | —     |
| `scheduledAt`     | character varying           |  ya  | —     |
| `status`          | character varying           |  ya  | —     |
| `participants`    | jsonb                       |  ya  | —     |
| `transcript`      | text                        |  ya  | —     |
| `aiSummary`       | jsonb                       |  ya  | —     |
| `recording_url`   | character varying           |  ya  | —     |
| `file_size`       | bigint                      |  ya  | —     |
| `upload_status`   | character varying           |  ya  | —     |
| `analysis_result` | text                        |  ya  | —     |
| `createdBy`       | character varying           |  ya  | —     |
| `createdAt`       | timestamp without time zone |  ya  | —     |
| `updatedAt`       | timestamp without time zone |  ya  | —     |
| `description`     | text                        |  ya  | —     |
| `meetingLink`     | text                        |  ya  | —     |
| `authorId`        | character varying           |  ya  | —     |
| `fileData`        | text                        |  ya  | —     |
| `fileName`        | character varying           |  ya  | —     |
| `fileType`        | character varying           |  ya  | —     |

### `Messages`

9 kolom · 0 baris

| Kolom        | Tipe                        | Null | Kunci |
| ------------ | --------------------------- | :--: | ----- |
| `id`         | character varying           |  —   | PK    |
| `senderId`   | character varying           |  —   | —     |
| `receiverId` | character varying           |  —   | —     |
| `message`    | text                        |  —   | —     |
| `timestamp`  | character varying           |  —   | —     |
| `read`       | boolean                     |  ya  | —     |
| `projectId`  | character varying           |  ya  | —     |
| `content`    | text                        |  ya  | —     |
| `createdAt`  | timestamp without time zone |  ya  | —     |

### `MilestoneSprints`

2 kolom · 0 baris

| Kolom         | Tipe              | Null | Kunci |
| ------------- | ----------------- | :--: | ----- |
| `milestoneId` | character varying |  —   | PK    |
| `sprintId`    | character varying |  —   | PK    |

### `Milestones`

8 kolom · 0 baris

| Kolom         | Tipe                        | Null | Kunci |
| ------------- | --------------------------- | :--: | ----- |
| `id`          | character varying           |  —   | PK    |
| `projectId`   | character varying           |  —   | —     |
| `name`        | character varying           |  —   | —     |
| `description` | text                        |  ya  | —     |
| `dueDate`     | character varying           |  ya  | —     |
| `status`      | character varying           |  ya  | —     |
| `createdAt`   | timestamp without time zone |  ya  | —     |
| `updatedAt`   | timestamp without time zone |  ya  | —     |

### `Notifications`

10 kolom · 64 baris

| Kolom         | Tipe                        | Null | Kunci |
| ------------- | --------------------------- | :--: | ----- |
| `id`          | character varying           |  —   | PK    |
| `recipientId` | character varying           |  —   | —     |
| `senderId`    | character varying           |  ya  | —     |
| `title`       | character varying           |  ya  | —     |
| `message`     | text                        |  ya  | —     |
| `type`        | character varying           |  ya  | —     |
| `relatedId`   | character varying           |  ya  | —     |
| `read`        | boolean                     |  ya  | —     |
| `createdAt`   | timestamp without time zone |  ya  | —     |
| `userId`      | character varying           |  ya  | —     |

### `ProjectInvites`

7 kolom · 0 baris

| Kolom       | Tipe                        | Null | Kunci |
| ----------- | --------------------------- | :--: | ----- |
| `id`        | character varying           |  —   | PK    |
| `projectId` | character varying           |  —   | —     |
| `email`     | character varying           |  —   | —     |
| `role`      | character varying           |  ya  | —     |
| `status`    | character varying           |  ya  | —     |
| `invitedBy` | character varying           |  ya  | —     |
| `createdAt` | timestamp without time zone |  ya  | —     |

### `ProjectMembers`

4 kolom · 10 baris

| Kolom           | Tipe              | Null | Kunci |
| --------------- | ----------------- | :--: | ----- |
| `projectId`     | character varying |  —   | PK    |
| `userId`        | character varying |  —   | PK    |
| `role`          | character varying |  ya  | —     |
| `parentAdminId` | character varying |  ya  | —     |

### `ProjectModules`

5 kolom · 2 baris

| Kolom        | Tipe              | Null | Kunci |
| ------------ | ----------------- | :--: | ----- |
| `id`         | character varying |  —   | PK    |
| `projectId`  | character varying |  —   | —     |
| `namaModul`  | character varying |  —   | —     |
| `keterangan` | text              |  ya  | —     |
| `createdAt`  | character varying |  —   | —     |

### `Projects`

12 kolom · 2 baris

| Kolom              | Tipe                        | Null | Kunci |
| ------------------ | --------------------------- | :--: | ----- |
| `id`               | character varying           |  —   | PK    |
| `name`             | character varying           |  —   | —     |
| `projectKey`       | character varying           |  —   | —     |
| `description`      | text                        |  ya  | —     |
| `ownerId`          | character varying           |  ya  | —     |
| `status`           | character varying           |  ya  | —     |
| `taskCounter`      | integer                     |  ya  | —     |
| `dashboard_layout` | jsonb                       |  ya  | —     |
| `createdAt`        | timestamp without time zone |  ya  | —     |
| `updatedAt`        | timestamp without time zone |  ya  | —     |
| `category`         | character varying           |  ya  | —     |
| `department`       | character varying           |  ya  | —     |

### `QATestCaseExecutionLogs`

13 kolom · 0 baris

| Kolom              | Tipe              | Null | Kunci |
| ------------------ | ----------------- | :--: | ----- |
| `id`               | character varying |  —   | PK    |
| `testCaseId`       | character varying |  —   | —     |
| `projectId`        | character varying |  —   | —     |
| `runVersion`       | integer           |  —   | —     |
| `runLabel`         | character varying |  —   | —     |
| `executionStatus`  | character varying |  —   | —     |
| `linkedIssueKey`   | character varying |  ya  | —     |
| `executedByUserId` | character varying |  ya  | —     |
| `executedByName`   | character varying |  ya  | —     |
| `timestamp`        | character varying |  —   | —     |
| `notes`            | text              |  ya  | —     |
| `evidences`        | jsonb             |  ya  | —     |
| `caseId`           | character varying |  ya  | —     |

### `QATestCases`

35 kolom · 1 baris

| Kolom              | Tipe                        | Null | Kunci |
| ------------------ | --------------------------- | :--: | ----- |
| `id`               | character varying           |  —   | PK    |
| `projectId`        | character varying           |  —   | —     |
| `judul`            | character varying           |  —   | —     |
| `deskripsi`        | text                        |  ya  | —     |
| `tipeTesting`      | character varying           |  —   | —     |
| `prioritas`        | character varying           |  —   | —     |
| `caseId`           | character varying           |  ya  | —     |
| `expected`         | text                        |  ya  | —     |
| `status`           | character varying           |  —   | —     |
| `steps`            | jsonb                       |  —   | —     |
| `history`          | jsonb                       |  —   | —     |
| `createdAt`        | character varying           |  —   | —     |
| `activeTesterId`   | character varying           |  ya  | —     |
| `activeTesterName` | character varying           |  ya  | —     |
| `lockedAt`         | character varying           |  ya  | —     |
| `suiteId`          | character varying           |  ya  | —     |
| `rowNum`           | integer                     |  ya  | —     |
| `comment`          | text                        |  ya  | —     |
| `evidenceUrl`      | character varying           |  ya  | —     |
| `evidenceType`     | character varying           |  ya  | —     |
| `evidenceName`     | character varying           |  ya  | —     |
| `linkedBugKey`     | character varying           |  ya  | —     |
| `commentsList`     | jsonb                       |  ya  | —     |
| `evidences`        | jsonb                       |  ya  | —     |
| `modulId`          | character varying           |  ya  | —     |
| `namaModul`        | character varying           |  ya  | —     |
| `description`      | text                        |  ya  | —     |
| `expectedResult`   | text                        |  ya  | —     |
| `actualResult`     | text                        |  ya  | —     |
| `executionStatus`  | character varying           |  ya  | —     |
| `executedByUserId` | character varying           |  ya  | —     |
| `executedByName`   | character varying           |  ya  | —     |
| `updatedAt`        | timestamp without time zone |  ya  | —     |
| `assignedto`       | character varying           |  ya  | —     |
| `assignedTo`       | character varying           |  ya  | —     |

### `QATestSuites`

12 kolom · 2 baris

| Kolom         | Tipe                        | Null | Kunci |
| ------------- | --------------------------- | :--: | ----- |
| `id`          | character varying           |  —   | PK    |
| `projectId`   | character varying           |  —   | —     |
| `name`        | character varying           |  —   | —     |
| `phase`       | character varying           |  —   | —     |
| `uploadedBy`  | character varying           |  —   | —     |
| `uploadedAt`  | character varying           |  —   | —     |
| `fileName`    | character varying           |  ya  | —     |
| `description` | text                        |  ya  | —     |
| `createdBy`   | character varying           |  ya  | —     |
| `createdAt`   | timestamp without time zone |  ya  | —     |
| `assignedto`  | character varying           |  ya  | —     |
| `assignedTo`  | character varying           |  ya  | —     |

### `Sprints`

11 kolom · 7 baris

| Kolom            | Tipe                        | Null | Kunci |
| ---------------- | --------------------------- | :--: | ----- |
| `id`             | character varying           |  —   | PK    |
| `projectId`      | character varying           |  —   | —     |
| `name`           | character varying           |  —   | —     |
| `goal`           | text                        |  ya  | —     |
| `startDate`      | character varying           |  ya  | —     |
| `endDate`        | character varying           |  ya  | —     |
| `status`         | character varying           |  ya  | —     |
| `createdAt`      | timestamp without time zone |  ya  | —     |
| `updatedAt`      | timestamp without time zone |  ya  | —     |
| `approvalstatus` | character varying           |  ya  | —     |
| `approvedby`     | character varying           |  ya  | —     |

### `TaskCustomFields`

5 kolom · 0 baris

| Kolom    | Tipe              | Null | Kunci |
| -------- | ----------------- | :--: | ----- |
| `id`     | character varying |  —   | PK    |
| `taskId` | character varying |  —   | —     |
| `name`   | character varying |  —   | —     |
| `value`  | text              |  ya  | —     |
| `type`   | character varying |  ya  | —     |

### `TaskExternalLinks`

6 kolom · 0 baris

| Kolom     | Tipe                        | Null | Kunci |
| --------- | --------------------------- | :--: | ----- |
| `id`      | character varying           |  —   | PK    |
| `taskId`  | character varying           |  —   | —     |
| `url`     | text                        |  —   | —     |
| `label`   | character varying           |  ya  | —     |
| `addedBy` | character varying           |  ya  | —     |
| `addedAt` | timestamp without time zone |  ya  | —     |

### `Tasks`

32 kolom · 30 baris

| Kolom                | Tipe                        | Null | Kunci |
| -------------------- | --------------------------- | :--: | ----- |
| `id`                 | character varying           |  —   | PK    |
| `projectId`          | character varying           |  —   | —     |
| `sprintId`           | character varying           |  ya  | —     |
| `taskKey`            | character varying           |  ya  | —     |
| `title`              | character varying           |  —   | —     |
| `description`        | text                        |  ya  | —     |
| `status`             | character varying           |  ya  | —     |
| `priority`           | character varying           |  ya  | —     |
| `type`               | character varying           |  ya  | —     |
| `assigneeId`         | character varying           |  ya  | —     |
| `assigneeEmail`      | character varying           |  ya  | —     |
| `reporterId`         | character varying           |  ya  | —     |
| `projectRisk`        | character varying           |  ya  | —     |
| `storyPoints`        | integer                     |  ya  | —     |
| `orderIndex`         | integer                     |  ya  | —     |
| `isBlocked`          | boolean                     |  ya  | —     |
| `dueDate`            | character varying           |  ya  | —     |
| `labels`             | jsonb                       |  ya  | —     |
| `assignees`          | jsonb                       |  ya  | —     |
| `permissions`        | jsonb                       |  ya  | —     |
| `milestoneId`        | character varying           |  ya  | —     |
| `moduleId`           | character varying           |  ya  | —     |
| `linkedEpicId`       | character varying           |  ya  | —     |
| `parentTaskId`       | character varying           |  ya  | —     |
| `version`            | integer                     |  —   | —     |
| `createdAt`          | timestamp without time zone |  ya  | —     |
| `updatedAt`          | timestamp without time zone |  ya  | —     |
| `parentId`           | character varying           |  ya  | —     |
| `acceptanceCriteria` | text                        |  ya  | —     |
| `startDate`          | character varying           |  ya  | —     |
| `endDate`            | character varying           |  ya  | —     |
| `environment`        | character varying           |  ya  | —     |

### `TokenBlacklist`

4 kolom · 0 baris

| Kolom       | Tipe                        | Null | Kunci |
| ----------- | --------------------------- | :--: | ----- |
| `id`        | integer                     |  —   | PK    |
| `token`     | character varying           |  —   | —     |
| `expiresAt` | timestamp without time zone |  —   | —     |
| `createdAt` | timestamp without time zone |  ya  | —     |

### `UserIdentities`

6 kolom · 2 baris

| Kolom       | Tipe                        | Null | Kunci  |
| ----------- | --------------------------- | :--: | ------ |
| `id`        | character varying           |  —   | PK     |
| `userId`    | character varying           |  —   | FK     |
| `provider`  | character varying           |  —   | UNIQUE |
| `sub`       | character varying           |  —   | UNIQUE |
| `email`     | character varying           |  ya  | —      |
| `createdAt` | timestamp without time zone |  ya  | —      |

### `Users`

21 kolom · 11 baris

| Kolom                 | Tipe                        | Null | Kunci  |
| --------------------- | --------------------------- | :--: | ------ |
| `id`                  | character varying           |  —   | PK     |
| `uid`                 | character varying           |  ya  | —      |
| `username`            | character varying           |  —   | UNIQUE |
| `nama_lengkap`        | character varying           |  ya  | —      |
| `email`               | character varying           |  —   | UNIQUE |
| `displayName`         | character varying           |  ya  | —      |
| `role`                | character varying           |  —   | —      |
| `status`              | character varying           |  —   | —      |
| `passwordHash`        | text                        |  ya  | —      |
| `department`          | character varying           |  ya  | —      |
| `position`            | character varying           |  ya  | —      |
| `phone`               | character varying           |  ya  | —      |
| `lastSeen`            | character varying           |  ya  | —      |
| `avatarUrl`           | text                        |  ya  | —      |
| `createdAt`           | timestamp without time zone |  ya  | —      |
| `updatedAt`           | timestamp without time zone |  ya  | —      |
| `photoUrl`            | text                        |  ya  | —      |
| `photoURL`            | text                        |  ya  | —      |
| `permissions`         | text                        |  ya  | —      |
| `currentSessionToken` | text                        |  ya  | —      |
| `avatar_url`          | text                        |  ya  | —      |

### `ai_learning_logs`

4 kolom · 0 baris

| Kolom              | Tipe              | Null | Kunci |
| ------------------ | ----------------- | :--: | ----- |
| `id`               | character varying |  —   | PK    |
| `project_id`       | character varying |  —   | —     |
| `evaluation_notes` | text              |  —   | —     |
| `timestamp`        | character varying |  —   | —     |

### `discussion_point_comments`

11 kolom · 4 baris

| Kolom          | Tipe              | Null | Kunci |
| -------------- | ----------------- | :--: | ----- |
| `id`           | character varying |  —   | PK    |
| `pointid`      | character varying |  —   | —     |
| `point_id`     | character varying |  ya  | —     |
| `userId`       | character varying |  ya  | —     |
| `user_id`      | character varying |  ya  | —     |
| `username`     | character varying |  ya  | —     |
| `user_name`    | character varying |  ya  | —     |
| `commenttext`  | text              |  —   | —     |
| `comment_text` | text              |  ya  | —     |
| `createdAt`    | character varying |  —   | —     |
| `created_at`   | character varying |  ya  | —     |

### `meeting_details`

12 kolom · 0 baris

| Kolom                       | Tipe                        | Null | Kunci |
| --------------------------- | --------------------------- | :--: | ----- |
| `id`                        | character varying           |  —   | PK    |
| `meeting_id`                | character varying           |  —   | —     |
| `ringkasan_eksekutif`       | text                        |  ya  | —     |
| `topik_utama`               | character varying           |  ya  | —     |
| `kronologi_dan_kesimpulan`  | jsonb                       |  ya  | —     |
| `kesimpulan`                | jsonb                       |  ya  | —     |
| `saran_dan_ide`             | jsonb                       |  ya  | —     |
| `tindak_lanjut`             | jsonb                       |  ya  | —     |
| `next_plan`                 | jsonb                       |  ya  | —     |
| `target_to_be_architecture` | jsonb                       |  ya  | —     |
| `metadata_rapat`            | jsonb                       |  ya  | —     |
| `created_at`                | timestamp without time zone |  ya  | —     |
