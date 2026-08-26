/**
 * src/lib/pg-migrate.ts
 * Auto-migration script: Creates all LanPro tables in PostgreSQL (Neon).
 * Called once during server startup when DATABASE_URL is present.
 * Uses CREATE TABLE IF NOT EXISTS — safe to run multiple times (idempotent).
 */

import { Pool } from "pg";

export async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();
  console.log("🚀 [PG-MIGRATE] Memulai migrasi schema ke Neon PostgreSQL...");

  try {
    await client.query("BEGIN");

    // ── Users ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        id                VARCHAR(36) PRIMARY KEY,
        uid               VARCHAR(255),
        username          VARCHAR(255) UNIQUE NOT NULL,
        nama_lengkap      VARCHAR(255),
        email             VARCHAR(255) UNIQUE NOT NULL,
        "displayName"     VARCHAR(255),
        role              VARCHAR(50) NOT NULL DEFAULT 'user',
        status            VARCHAR(50) NOT NULL DEFAULT 'pending',
        "passwordHash"    TEXT,
        department        VARCHAR(255),
        position          VARCHAR(255),
        phone             VARCHAR(50),
        "lastSeen"        VARCHAR(50),
        "avatar_url"      TEXT,
        "avatarUrl"       TEXT,
        "photoUrl"        TEXT,
        "photoURL"        TEXT,
        "coverUrl"        TEXT,
        permissions       TEXT,
        "currentSessionToken" TEXT,
        "createdAt"       TIMESTAMP DEFAULT NOW(),
        "updatedAt"       TIMESTAMP DEFAULT NOW()
      );
    `);

    const userAlters = [
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photoURL" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "permissions" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "currentSessionToken" TEXT',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50)',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastSeen" VARCHAR(50)',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255)',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "position" VARCHAR(255)',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "nama_lengkap" VARCHAR(255)',
      'ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(255)',
    ];
    for (const stmt of userAlters) {
      try {
        await client.query(stmt);
      } catch (e: any) {
        console.warn("[PG-MIGRATE] Alter warning:", e.message);
      }
    }

    // ── MasterData ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MasterData" (
        id                VARCHAR(36) PRIMARY KEY,
        type              VARCHAR(100) NOT NULL,
        label             VARCHAR(255) NOT NULL,
        color             VARCHAR(50),
        icon              VARCHAR(50),
        "order"           INT DEFAULT 0,
        description       TEXT,
        "fieldType"       VARCHAR(50),
        "dropdownOptions" JSONB,
        role_type         VARCHAR(20),
        "createdAt"       TIMESTAMP DEFAULT NOW()
      );
      -- #82 — kode peran yang STABIL. Nilai inilah yang disimpan ke
      -- Users.role dan ProjectMembers.role, bukan labelnya. Dengan begitu
      -- mengganti nama tampilan sebuah peran di Master Data tidak merusak
      -- otorisasi, dan sebaliknya otorisasi tidak memaksa label tetap kaku.
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS code VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS color VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS "fieldType" VARCHAR(50);
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS "dropdownOptions" JSONB;
      ALTER TABLE "MasterData" ADD COLUMN IF NOT EXISTS role_type VARCHAR(20);
    `);

    // ── Projects ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Projects" (
        id                VARCHAR(36) PRIMARY KEY,
        name              VARCHAR(255) NOT NULL,
        "projectKey"      VARCHAR(50) NOT NULL,
        description       TEXT,
        "ownerId"         VARCHAR(36),
        status            VARCHAR(50) DEFAULT 'Active',
        "taskCounter"     INT DEFAULT 0,
        "dashboard_layout" JSONB,
        category          VARCHAR(50) DEFAULT 'Agile',
        "createdAt"       TIMESTAMP DEFAULT NOW(),
        "updatedAt"       TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Agile';
    `);

    // ── ProjectMembers ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectMembers" (
        "projectId"     VARCHAR(36) NOT NULL,
        "userId"        VARCHAR(36) NOT NULL,
        role            VARCHAR(50) DEFAULT 'developer',
        -- #81 - kolom parentAdminId DIBUANG: ditulis, tidak pernah dibaca.
        PRIMARY KEY ("projectId", "userId")
      );
    `);

    // ── ProjectInvites ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectInvites" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        role        VARCHAR(50) DEFAULT 'developer',
        status      VARCHAR(50) DEFAULT 'pending',
        "invitedBy" VARCHAR(36),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Sprints ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Sprints" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        goal        TEXT,
        "startDate" VARCHAR(50),
        "endDate"   VARCHAR(50),
        status      VARCHAR(50) DEFAULT 'planned',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Milestones ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Milestones" (
        id          VARCHAR(36) PRIMARY KEY,
        "projectId" VARCHAR(36) NOT NULL,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        "dueDate"   VARCHAR(50),
        status      VARCHAR(50) DEFAULT 'pending',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── MilestoneSprints ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MilestoneSprints" (
        "milestoneId" VARCHAR(36) NOT NULL,
        "sprintId"    VARCHAR(36) NOT NULL,
        PRIMARY KEY ("milestoneId", "sprintId")
      );
    `);

    // ── Tasks ───────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tasks" (
        id                  VARCHAR(36) PRIMARY KEY,
        "projectId"         VARCHAR(36) NOT NULL,
        "sprintId"          VARCHAR(36),
        "taskKey"           VARCHAR(50),
        title               VARCHAR(500) NOT NULL,
        description         TEXT,
        status              VARCHAR(100) DEFAULT 'To Do',
        priority            VARCHAR(50) DEFAULT 'Medium',
        type                VARCHAR(50) DEFAULT 'task',
        "assigneeId"        VARCHAR(36),
        "assigneeEmail"     VARCHAR(255),
        "reporterId"        VARCHAR(36),
        "projectRisk"       VARCHAR(50),
        "storyPoints"       INT DEFAULT 0,
        "orderIndex"        INT DEFAULT 0,
        "isBlocked"         BOOLEAN DEFAULT FALSE,
        "dueDate"           VARCHAR(50),
        labels              JSONB,
        assignees           JSONB,
        permissions         JSONB,
        "milestoneId"       VARCHAR(36),
        "moduleId"          VARCHAR(36),
        "linkedEpicId"      VARCHAR(36),
        "parentTaskId"      VARCHAR(36),
        "parentId"          VARCHAR(36),
        "acceptanceCriteria" TEXT,
        "startDate"         VARCHAR(50),
        "endDate"           VARCHAR(50),
        version             INT NOT NULL DEFAULT 1,
        "createdAt"         TIMESTAMP DEFAULT NOW(),
        "updatedAt"         TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "parentId" VARCHAR(36);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "acceptanceCriteria" TEXT;
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "startDate" VARCHAR(50);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "endDate" VARCHAR(50);
    `);

    // ── TaskExternalLinks ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TaskExternalLinks" (
        id        VARCHAR(36) PRIMARY KEY,
        "taskId"  VARCHAR(36) NOT NULL,
        url       TEXT NOT NULL,
        label     VARCHAR(255),
        "addedBy" VARCHAR(36),
        "addedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Attachments ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Attachments" (
        id           VARCHAR(36) PRIMARY KEY,
        "taskId"     VARCHAR(36) NOT NULL,
        -- #79 — NOT NULL menyamai production. Ini juga yang membuat #78 tidak
        -- bisa diperbaiki hanya dengan mengganti nama tabel: kode WAJIB menulis
        -- kolom ini.
        filename     VARCHAR(255) NOT NULL,
        name         VARCHAR(255),
        "originalName" VARCHAR(255),
        mimetype     VARCHAR(100),
        type         VARCHAR(100),
        size         BIGINT DEFAULT 0,
        url          TEXT,
        "fileRef"    TEXT,
        "uploadedByUserId" VARCHAR(36),
        "uploadedByName"   VARCHAR(255),
        "uploadedBy" VARCHAR(36),
        "uploadedAt" TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS type VARCHAR(100);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "fileRef" TEXT;
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "uploadedByUserId" VARCHAR(36);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "uploadedByName" VARCHAR(255);
    `);

    // ── LinkedTasks ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LinkedTasks" (
        id              VARCHAR(36) PRIMARY KEY,
        "sourceTaskId"  VARCHAR(36) NOT NULL,
        "targetTaskId"  VARCHAR(36) NOT NULL,
        "linkType"      VARCHAR(50) DEFAULT 'relates_to',
        "createdAt"     TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Comments ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Comments" (
        id          VARCHAR(36) PRIMARY KEY,
        "taskId"    VARCHAR(36) NOT NULL,
        "authorId"  VARCHAR(36) NOT NULL,
        text        TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── TaskCustomFields ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TaskCustomFields" (
        id        VARCHAR(36) PRIMARY KEY,
        "taskId"  VARCHAR(36) NOT NULL,
        name      VARCHAR(255) NOT NULL,
        value     TEXT,
        type      VARCHAR(50) DEFAULT 'text'
      );
    `);

    // ── ActivityLogs ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ActivityLogs" (
        id          VARCHAR(255) PRIMARY KEY,
        "taskId"    VARCHAR(255),
        "projectId" VARCHAR(255),
        "userId"    VARCHAR(255),
        action      VARCHAR(255) NOT NULL,
        details     TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "ActivityLogs" ALTER COLUMN id TYPE VARCHAR(255);
      ALTER TABLE "ActivityLogs" ALTER COLUMN "taskId" TYPE VARCHAR(255);
      ALTER TABLE "ActivityLogs" ALTER COLUMN "projectId" TYPE VARCHAR(255);
      ALTER TABLE "ActivityLogs" ALTER COLUMN "userId" TYPE VARCHAR(255);
    `);

    // ── AuditLogs ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AuditLogs" (
        id           VARCHAR(255) PRIMARY KEY,
        "userId"     VARCHAR(255),
        "projectId"  VARCHAR(255),
        "entityName" VARCHAR(100),
        "entityId"   VARCHAR(255),
        "actionType" VARCHAR(50),
        changes      JSONB,
        "oldValues"  JSONB,
        "newValues"  JSONB,
        "ipAddress"  VARCHAR(50),
        "userAgent"  TEXT,
        "createdAt"  TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "oldValues" JSONB;
      ALTER TABLE "AuditLogs" ADD COLUMN IF NOT EXISTS "newValues" JSONB;
      ALTER TABLE "AuditLogs" ALTER COLUMN id TYPE VARCHAR(255);
      ALTER TABLE "AuditLogs" ALTER COLUMN "userId" TYPE VARCHAR(255);
      ALTER TABLE "AuditLogs" ALTER COLUMN "projectId" TYPE VARCHAR(255);
      ALTER TABLE "AuditLogs" ALTER COLUMN "entityId" TYPE VARCHAR(255);
    `);

    // ── Messages ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Messages" (
        id           VARCHAR(36) PRIMARY KEY,
        "senderId"   VARCHAR(36) NOT NULL,
        "receiverId" VARCHAR(36) NOT NULL,
        message      TEXT NOT NULL,
        timestamp    VARCHAR(50) NOT NULL,
        "read"       BOOLEAN DEFAULT FALSE
      );
    `);

    // ── Notifications ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Notifications" (
        id           VARCHAR(36) PRIMARY KEY,
        "recipientId" VARCHAR(36) NOT NULL,
        "senderId"   VARCHAR(36),
        title        VARCHAR(255),
        message      TEXT,
        type         VARCHAR(50),
        "relatedId"  VARCHAR(36),
        "read"       BOOLEAN DEFAULT FALSE,
        "createdAt"  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── Meetings ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Meetings" (
        id              VARCHAR(36) PRIMARY KEY,
        "projectId"     VARCHAR(36) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        agenda          TEXT,
        "scheduledAt"   VARCHAR(50),
        status          VARCHAR(50) DEFAULT 'scheduled',
        participants    JSONB,
        transcript      TEXT,
        "aiSummary"     JSONB,
        "recording_url" VARCHAR(512),
        "file_size"     BIGINT,
        "upload_status" VARCHAR(50),
        "analysis_result" TEXT,
        "createdBy"     VARCHAR(36),
        "description"   TEXT,
        "meetingLink"   TEXT,
        "authorId"      VARCHAR(36),
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "description" TEXT;
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "authorId" VARCHAR(36);
    `);

    // ── DiscussionPoints ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DiscussionPoints" (
        id                    VARCHAR(36) PRIMARY KEY,
        "meetingId"           VARCHAR(36) NOT NULL,
        -- #79 — NOT NULL menyamai production.
        content               TEXT NOT NULL DEFAULT '',
        "parentPointId"       VARCHAR(36),
        "authorId"            VARCHAR(36),
        "assignTo"            VARCHAR(36),
        concern               TEXT,
        fitur                 VARCHAR(255),
        "system"              VARCHAR(255),
        surrounding           VARCHAR(255),
        keterangan            TEXT,
        "tindakanLanjut"      TEXT,
        status                VARCHAR(50) DEFAULT 'pending',
        "targetDate"          VARCHAR(50),
        "tanggalUpdateStatus" VARCHAR(50),
        "createdAt"           TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parentPointId" VARCHAR(36);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assignTo" VARCHAR(36);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "concern" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "fitur" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "system" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "surrounding" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "keterangan" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tindakanLanjut" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "targetDate" VARCHAR(50);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tanggalUpdateStatus" VARCHAR(50);
    `);

    // ── meeting_details ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_details (
        id                          VARCHAR(36) PRIMARY KEY,
        meeting_id                  VARCHAR(36) NOT NULL,
        ringkasan_eksekutif         TEXT,
        topik_utama                 VARCHAR(255),
        kronologi_dan_kesimpulan    JSONB,
        kesimpulan                  JSONB,
        saran_dan_ide               JSONB,
        tindak_lanjut               JSONB,
        next_plan                   JSONB,
        target_to_be_architecture   JSONB,
        metadata_rapat              JSONB,
        created_at                  TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── QATestSuites ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestSuites" (
        id           VARCHAR(36) PRIMARY KEY,
        "projectId"  VARCHAR(36) NOT NULL,
        name         VARCHAR(255) NOT NULL,
        phase        VARCHAR(50) NOT NULL,
        "uploadedBy" VARCHAR(255) NOT NULL,
        "uploadedAt" VARCHAR(50) NOT NULL,
        "fileName"   VARCHAR(255),
        "assignedTo" VARCHAR(255)
      );
    `);
    await client.query(
      `ALTER TABLE "QATestSuites" ADD COLUMN IF NOT EXISTS "assignedTo" VARCHAR(255);`
    );

    // ── QATestCases ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestCases" (
        id                VARCHAR(36) PRIMARY KEY,
        "projectId"       VARCHAR(36) NOT NULL,
        judul             VARCHAR(255) NOT NULL,
        deskripsi         TEXT,
        "tipeTesting"     VARCHAR(50) NOT NULL,
        prioritas         VARCHAR(50) NOT NULL,
        "caseId"          VARCHAR(36),
        expected          TEXT,
        status            VARCHAR(50) NOT NULL,
        steps             JSONB NOT NULL DEFAULT '[]',
        history           JSONB NOT NULL DEFAULT '[]',
        "createdAt"       VARCHAR(50) NOT NULL,
        "activeTesterId"  VARCHAR(36),
        "activeTesterName" VARCHAR(255),
        "lockedAt"        VARCHAR(50),
        "suiteId"         VARCHAR(50),
        "rowNum"          INT,
        comment           TEXT,
        "evidenceUrl"     VARCHAR(512),
        "evidenceType"    VARCHAR(50),
        "evidenceName"    VARCHAR(255),
        "linkedBugKey"    VARCHAR(50),
        "commentsList"    JSONB,
        evidences         JSONB,
        "modulId"         VARCHAR(36),
        "assignedTo"      VARCHAR(255)
      );
    `);
    await client.query(
      `ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "assignedTo" VARCHAR(255);`
    );

    // ── QATestCaseExecutionLogs ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QATestCaseExecutionLogs" (
        id                  VARCHAR(36) PRIMARY KEY,
        -- #79 — NOT NULL menyamai production. Tanpa ini database bersih
        -- menerima baris tanpa testCaseId, sementara production menolaknya.
        "testCaseId"        VARCHAR(36) NOT NULL,
        "caseId"            VARCHAR(36),
        "projectId"         VARCHAR(36) NOT NULL,
        "runVersion"        INT NOT NULL DEFAULT 1,
        "runLabel"          VARCHAR(50) NOT NULL,
        "executionStatus"   VARCHAR(50) NOT NULL,
        "linkedIssueKey"    VARCHAR(50),
        "executedByUserId"  VARCHAR(36),
        "executedByName"    VARCHAR(255),
        timestamp           VARCHAR(50) NOT NULL,
        notes               TEXT,
        evidences           JSONB
      );
      ALTER TABLE "QATestCaseExecutionLogs" ADD COLUMN IF NOT EXISTS "testCaseId" VARCHAR(36);
      ALTER TABLE "QATestCaseExecutionLogs" ADD COLUMN IF NOT EXISTS "caseId" VARCHAR(36);
    `);

    // ── ProjectModules ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProjectModules" (
        id           VARCHAR(36) PRIMARY KEY,
        "projectId"  VARCHAR(36) NOT NULL,
        "namaModul"  VARCHAR(255) NOT NULL,
        keterangan   TEXT,
        "createdAt"  VARCHAR(50) NOT NULL
      );
    `);

    // ── Documents ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Documents" (
        id              VARCHAR(36) PRIMARY KEY,
        "projectId"     VARCHAR(36) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        description     TEXT,
        type            VARCHAR(100),
        link            TEXT,
        "fileName"      VARCHAR(255),
        "fileType"      VARCHAR(100),
        "fileSize"      BIGINT DEFAULT 0,
        "fileRef"       TEXT,
        "fileData"      TEXT,
        "createdBy"     VARCHAR(36),
        "downloadCount" INT DEFAULT 0,
        "createdAt"     TIMESTAMP DEFAULT NOW(),
        "updatedAt"     TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileType" VARCHAR(100);
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileSize" BIGINT DEFAULT 0;
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileRef" TEXT;
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileData" TEXT;
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "canvasData" TEXT;

      -- Item #144 — kategori dokumen/flowchart. Kolom "type" sudah dipakai
      -- ganda: untuk flowchart ia penanda jenis ('flowchart'), untuk dokumen
      -- wiki ia justru kategorinya. Akibatnya kategori flowchart tidak punya
      -- tempat, dan pilihan pengguna di modal dibuang diam-diam.
      ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS category VARCHAR(255);
    `);

    // Item #136 — payload kanvas flowchart pindah dari `description` ke kolom
    // sendiri. Sebelumnya flowchart menumpang kolom `description`, sehingga
    // daftar Dokumentasi (yang menampilkan description sebagai subjudul untuk
    // SEMUA dokumen) memuntahkan JSON mentah ke layar.
    //
    // Backfill ini sengaja sempit: hanya baris flowchart yang description-nya
    // benar-benar berbentuk payload kanvas. Deskripsi manusia yang kebetulan
    // ada di baris flowchart lama tidak ikut terbawa atau terhapus.
    //
    // Idempoten: setelah dijalankan sekali, tidak ada lagi baris yang cocok.
    await client.query(`
      UPDATE "Documents"
         SET "canvasData" = description,
             description  = NULL
       WHERE type = 'flowchart'
         AND "canvasData" IS NULL
         AND description LIKE '{%"nodes"%';
    `);

    // ── ai_learning_logs ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_learning_logs (
        id                 VARCHAR(36) PRIMARY KEY,
        project_id         VARCHAR(36) NOT NULL,
        evaluation_notes   TEXT NOT NULL,
        timestamp          VARCHAR(50) NOT NULL
      );
    `);

    // ── discussion_point_comments ─────────────────────────────────────────────
    //
    // DIPINDAHKAN dari server/migrations/runner.ts pada 16 Agu 2026 (item #1).
    //
    // Tabel ini sebelumnya HANYA dibuat oleh runner.ts, sistem migrasi kedua
    // yang tidak pernah dipanggil saat boot. Akibatnya: pada database baru,
    // migrasi otomatis tidak membuatnya, dan fitur komentar discussion point
    // langsung rusak — padahal `discussion-points.routes.ts` membaca dan
    // menulis ke sini. Di database yang sedang berjalan tabelnya sudah ada
    // dengan data nyata, sehingga cacatnya tidak terlihat.
    //
    // #47 LANGKAH 4 — kolom kembar snake_case DIBUANG 16 Agu 2026 atas ketetapan
    // pemilik proyek: camelCase adalah sumber kebenaran (§19.38).
    //
    // Urutannya sengaja: baca diseragamkan, tulis diseragamkan, jalur tulis
    // dibuktikan lewat komentar sungguhan (baris 4 -> 5, sisi snake tetap 4),
    // BARU definisinya dicabut di sini dan kolomnya dijatuhkan dari production
    // lewat `npm run db:hapus-kolom-kembar`.
    //
    // #79 tetap berlaku: `"userId"` dan `"createdAt"` WAJIB ber-kutip. Tanpa
    // kutip PostgreSQL melipatnya jadi userid/createdat, sementara production
    // menyimpan versi camelCase. `pointid`, `username`, `commenttext` sengaja
    // TANPA kutip karena production memang menyimpannya dalam huruf kecil —
    // ketiganya lahir dari identifier tak berkutip di masa lalu (§19.39).
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_point_comments (
        id VARCHAR(36) PRIMARY KEY,
        pointId VARCHAR(36) NOT NULL,
        "userId" VARCHAR(50),
        userName VARCHAR(255),
        commentText TEXT NOT NULL,
        "createdAt" VARCHAR(50) NOT NULL
      );
    `);

    // ── UserIdentities (SSO Google/Microsoft, F5.4) ───────────────────────────
    // Tabel terpisah, BUKAN kolom baru di "Users", supaya satu pengguna bisa
    // menautkan Google DAN Microsoft sekaligus. Menaruhnya sebagai kolom akan
    // memaksa memilih salah satu, dan menambah provider ketiga berarti menambah
    // kolom lagi.
    //
    // Unik pada (provider, sub): satu identitas provider hanya boleh menunjuk
    // satu akun LanPro. Tanpa batasan ini, identitas yang sama bisa diam-diam
    // berpindah pemilik.
    await client.query(`
      CREATE TABLE IF NOT EXISTS "UserIdentities" (
        id          VARCHAR(36) PRIMARY KEY,
        "userId"    VARCHAR(36) NOT NULL,
        provider    VARCHAR(20) NOT NULL,
        sub         VARCHAR(255) NOT NULL,
        email       VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        CONSTRAINT "UserIdentities_provider_sub_key" UNIQUE (provider, sub)
      );
      CREATE INDEX IF NOT EXISTS "UserIdentities_userId_idx"
        ON "UserIdentities" ("userId");
    `);

    // Foreign key dengan ON DELETE CASCADE.
    //
    // Tanpa ini, menghapus seorang user meninggalkan baris identitasnya. Baris
    // yatim itu bukan sekadar sampah: ia MENGUNCI email tersebut selamanya,
    // karena pemeriksaan identitas berjalan sebelum cabang login/daftar
    // sehingga pendaftaran ulang pun ikut tertolak. Kejadian nyata pada
    // 16 Agu 2026.
    //
    // Baris yatim yang sudah terlanjur ada dibersihkan lebih dulu — ALTER TABLE
    // akan menolak bila masih ada baris yang melanggar.
    await client.query(`
      DELETE FROM "UserIdentities" ui
      WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = ui."userId");
    `);

    // Idempoten: PostgreSQL tidak punya ADD CONSTRAINT IF NOT EXISTS, jadi
    // keberadaannya diperiksa lebih dulu.
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UserIdentities_userId_fkey'
        ) THEN
          ALTER TABLE "UserIdentities"
            ADD CONSTRAINT "UserIdentities_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "Users" (id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // ── TokenBlacklist ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TokenBlacklist" (
        id          SERIAL PRIMARY KEY,
        token       VARCHAR(512) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── BroadcastConfig (item #193) ──────────────────────────────────────────
    //
    // Jadwal broadcast (hari/jam) dan daftar penerima sebelumnya hardcode di
    // kode server (cron.schedule("0 7 * * *") + SELECT semua user), tidak ada
    // tempat penyimpanan sama sekali sehingga panel "WhatsApp gateway" di UI
    // tidak punya apa pun untuk dibaca/diubah. Satu baris per channel
    // ("whatsapp"), dibuat otomatis dengan nilai default saat pertama diakses.
    await client.query(`
      CREATE TABLE IF NOT EXISTS "BroadcastConfig" (
        id                 SERIAL PRIMARY KEY,
        channel            VARCHAR(20) NOT NULL UNIQUE,
        "scheduleDays"     VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6,7',
        "scheduleTime"     VARCHAR(5) NOT NULL DEFAULT '07:00',
        "recipientIds"     TEXT NOT NULL DEFAULT '',
        "messageTemplate"  TEXT,
        "updatedAt"        TIMESTAMP DEFAULT NOW()
      );
    `);

    // ── PENYETARAAN SCHEMA (item #79) ─────────────────────────────────────────
    //
    // Diukur 16 Agu 2026: 13 tabel dan 54 kolom ADA di database production tetapi
    // TIDAK pernah dibuat migrasi ini. Arahnya satu — database selalu lebih
    // lengkap. Artinya migrasi bukan tertinggal versi; ia belum pernah menjadi
    // sumber kebenaran.
    //
    // Akibatnya nyata: `npm run db:migrate` pada database BERSIH menghasilkan
    // schema yang kekurangan kolom yang dipakai kode secara aktif — `description`
    // 80 rujukan, `content` 26, `expectedResult` 6, dan seterusnya. Deployment ke
    // database baru akan rusak, dan fitur QA paling parah dengan 9 kolom hilang.
    // Tidak ketahuan selama ini karena seluruh pengembangan memakai satu database
    // yang sama, yang sudah lengkap sejak lama.
    //
    // Ditulis sebagai ADD COLUMN IF NOT EXISTS, bukan mengubah CREATE TABLE di
    // atas. Alasannya: blok ini menjadi NO-OP di database yang sudah lengkap
    // (production tidak tersentuh sama sekali) sekaligus memperbaiki database
    // bersih. Mengubah CREATE TABLE tidak akan berpengaruh apa pun pada database
    // yang tabelnya sudah ada.
    //
    // Kolom kembar SENGAJA ikut disalin apa adanya — `fileName` di samping
    // `filename`, `tindakanlanjut` di samping `tindakan_lanjut`, dan seterusnya.
    // Merapikannya adalah pekerjaan terpisah (#47, #78); menyatukan schema dan
    // membersihkan bentuk dalam satu langkah membuat kegagalan sulit ditelusuri.
    await client.query(`
      ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);

      ALTER TABLE "Sprints" ADD COLUMN IF NOT EXISTS "approvalstatus" VARCHAR(50);
      ALTER TABLE "Sprints" ADD COLUMN IF NOT EXISTS "approvedby" VARCHAR(36);

      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "environment" VARCHAR(255);

      -- Item #139 — tiga kolom yang sudah punya dropdown di Daftar Isu tetapi
      -- tidak pernah punya tempat penyimpanan. Karena kolomnya tidak ada,
      -- nilainya tidak bisa disimpan sama sekali; pembaruan optimistis di UI
      -- membuatnya tampak berhasil sampai halaman dimuat ulang.
      --
      -- Kolom "category" di sini adalah AREA TEKNIS (Backend/Frontend/
      -- DevOps/...) sesuai keputusan item #85, bukan duplikat "issue_type"
      -- yang dulu dihapus dari MasterData.
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "resolution" VARCHAR(255);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "release" VARCHAR(255);
      ALTER TABLE "Tasks" ADD COLUMN IF NOT EXISTS "category" VARCHAR(255);

      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "fileType" VARCHAR(100);
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "fileSize" BIGINT;
      ALTER TABLE "Attachments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();

      ALTER TABLE "Comments" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(36);
      ALTER TABLE "Comments" ADD COLUMN IF NOT EXISTS "content" TEXT;

      ALTER TABLE "ActivityLogs" ADD COLUMN IF NOT EXISTS "entityId" VARCHAR(36);
      ALTER TABLE "ActivityLogs" ADD COLUMN IF NOT EXISTS "entityName" VARCHAR(255);
      ALTER TABLE "ActivityLogs" ADD COLUMN IF NOT EXISTS "actionType" VARCHAR(100);
      ALTER TABLE "ActivityLogs" ADD COLUMN IF NOT EXISTS "description" TEXT;

      ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "projectId" VARCHAR(36);
      ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "content" TEXT;
      ALTER TABLE "Messages" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();

      ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "userId" VARCHAR(36);

      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "fileData" TEXT;
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
      ALTER TABLE "Meetings" ADD COLUMN IF NOT EXISTS "fileType" VARCHAR(100);

      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "topic" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assigneeId" VARCHAR(36);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parentpointid" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "parent_point_id" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "comment" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "next_action" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assignee_id" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "feature_id" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "system_id" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "surrounding_id" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "target_date" DATE;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assignto" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "assign_to" VARCHAR(255);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tindakanlanjut" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tindakan_lanjut" TEXT;
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "targetdate" VARCHAR(50);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "tanggalupdatestatus" VARCHAR(50);
      ALTER TABLE "DiscussionPoints" ADD COLUMN IF NOT EXISTS "decision" TEXT;

      ALTER TABLE "QATestSuites" ADD COLUMN IF NOT EXISTS "description" TEXT;
      ALTER TABLE "QATestSuites" ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(36);
      ALTER TABLE "QATestSuites" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();
      ALTER TABLE "QATestSuites" ADD COLUMN IF NOT EXISTS "assignedto" VARCHAR(255);

      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "namaModul" VARCHAR(255);
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "description" TEXT;
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "expectedResult" TEXT;
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "actualResult" TEXT;
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "executionStatus" VARCHAR(50);
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "executedByUserId" VARCHAR(36);
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "executedByName" VARCHAR(255);
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();
      ALTER TABLE "QATestCases" ADD COLUMN IF NOT EXISTS "assignedto" VARCHAR(255);
    `);

    // #79 — dua kolom di bawah punya sebab yang BERBEDA dari 54 di atas.
    //
    // Blok CREATE TABLE untuk `discussion_point_comments` menulis `userId` dan
    // `createdAt` TANPA KUTIP. PostgreSQL melipat identifier tanpa kutip menjadi
    // huruf kecil, jadi database bersih memperoleh `userid` dan `createdat` —
    // sementara production punya `userId` dan `createdAt`, dan kode menulis
    // versi ber-kutip. Di database bersih, penyimpanan komentar akan GAGAL.
    //
    // Ditambahkan di sini alih-alih memperbaiki kutip di CREATE TABLE, karena
    // memperbaiki di sana tidak berpengaruh pada database yang tabelnya sudah
    // ada — dan justru menyisakan `userid` yatim di database bersih.
    await client.query(`
      ALTER TABLE discussion_point_comments ADD COLUMN IF NOT EXISTS "userId" VARCHAR(50);
      ALTER TABLE discussion_point_comments ADD COLUMN IF NOT EXISTS "createdAt" VARCHAR(50);
    `);

    // ── Indexes ────────────────────────────────────────────────────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON "Tasks" ("assigneeId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON "Tasks" ("reporterId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON "Tasks" ("projectId")`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON "Tasks" ("sprintId")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_project ON "AuditLogs" ("projectId", "entityName", "entityId")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_created ON "AuditLogs" ("createdAt")`,
      `CREATE INDEX IF NOT EXISTS idx_audit_user ON "AuditLogs" ("userId")`,
      `CREATE INDEX IF NOT EXISTS idx_milestone_project ON "Milestones" ("projectId")`,
      `CREATE INDEX IF NOT EXISTS idx_sprint_milestone ON "MilestoneSprints" ("milestoneId")`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON "Notifications" ("recipientId")`,
      `CREATE INDEX IF NOT EXISTS idx_messages_sender ON "Messages" ("senderId")`,
      `CREATE INDEX IF NOT EXISTS idx_messages_receiver ON "Messages" ("receiverId")`,
      `CREATE INDEX IF NOT EXISTS idx_token_blacklist ON "TokenBlacklist" (token)`,
      `CREATE INDEX IF NOT EXISTS idx_token_expiry ON "TokenBlacklist" ("expiresAt")`,
    ];
    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch {}
    }

    await client.query("COMMIT");
    console.log("✅ [PG-MIGRATE] Semua tabel berhasil dibuat/diverifikasi di Neon PostgreSQL!");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("❌ [PG-MIGRATE] Migrasi gagal:", err.message);
    throw err;
  } finally {
    client.release();
  }
}
