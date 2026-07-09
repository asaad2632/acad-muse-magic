// Server-only. Query helpers backing the /api/data/* routes, replacing
// Supabase Postgres + RLS as cloudSync.js's storage layer.
//
// SECURITY: never import from client-bundled code. Only dynamic-import
// inside server route handlers, matching src/db.server.ts's own rule.
//
// Table/owner-column pairs are always hardcoded literals at call sites (each
// /api/data/*.ts route file passes its own fixed table name) — never derived
// from request input — so there is no SQL-injection-via-identifier surface
// even though table names are string-interpolated into query text below.
//
// Access model mirrors the old Supabase RLS policies exactly: reads are
// unfiltered (both accounts share one workspace), writes are scoped to the
// caller's own rows (user_id / created_by / uploaded_by), matching
// cloudSync.js's original "shared read, own-row write" behavior.
import { db } from "./db.server";

type Row = Record<string, unknown>;

function bindValue(value: unknown, isJsonb: boolean): unknown {
  return isJsonb && value != null ? JSON.stringify(value) : value;
}

// ==================== Generic shared-workspace tables ====================
// (sources, bibliography, cards, translations, custom_formats — dedupe by
// client_id/latest-updated_at happens client-side in cloudSync.js, same as
// it did against the raw Supabase rows before.)

export async function loadShared(table: string): Promise<Row[]> {
  const { rows } = await db.query(`SELECT * FROM ${table} WHERE client_id IS NOT NULL`);
  return rows;
}

export async function syncShared(
  table: string,
  ownerCol: string,
  userId: string,
  rows: Row[],
  jsonbColumns: string[] = [],
): Promise<void> {
  if (rows.length) {
    // The owner column is always the session's real userId, never whatever
    // (if anything) the client put in the row — this is the only server-side
    // ownership enforcement now that there's no RLS underneath it.
    const dataColumns = Object.keys(rows[0]).filter((c) => c !== ownerCol);
    const columns = [ownerCol, ...dataColumns];
    const updateSet = dataColumns
      .filter((c) => c !== "client_id")
      .map((c) => `${c} = EXCLUDED.${c}`)
      .join(", ");
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})
      ON CONFLICT (${ownerCol}, client_id) WHERE client_id IS NOT NULL DO UPDATE SET ${updateSet}`;
    for (const row of rows) {
      const values = columns.map((c) =>
        c === ownerCol ? userId : bindValue(row[c], jsonbColumns.includes(c)),
      );
      await db.query(sql, values);
    }
  }
  const keepIds = rows.map((r) => String(r.client_id));
  if (keepIds.length) {
    await db.query(
      `DELETE FROM ${table} WHERE ${ownerCol} = $1 AND client_id IS NOT NULL AND client_id <> ALL($2::text[])`,
      [userId, keepIds],
    );
  } else {
    await db.query(`DELETE FROM ${table} WHERE ${ownerCol} = $1 AND client_id IS NOT NULL`, [
      userId,
    ]);
  }
}

// ==================== chapters (upsert-only, keyed by chapter_id) ====================

export async function loadChapters(): Promise<Row[]> {
  const { rows } = await db.query(`SELECT * FROM chapters ORDER BY chapter_id`);
  return rows;
}

export async function syncChapters(userId: string, rows: Row[]): Promise<void> {
  for (const r of rows) {
    await db.query(
      `INSERT INTO chapters (user_id, chapter_id, title_ar, color, sections)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, chapter_id)
       DO UPDATE SET title_ar = EXCLUDED.title_ar, color = EXCLUDED.color, sections = EXCLUDED.sections`,
      [userId, r.chapter_id, r.title_ar ?? null, r.color ?? null, JSON.stringify(r.sections ?? [])],
    );
  }
}

// ==================== deleted_base_docs (wipe + insert union set) ====================

export async function loadDeletedBaseDocs(): Promise<Row[]> {
  const { rows } = await db.query(`SELECT base_doc_id FROM deleted_base_docs`);
  return rows;
}

export async function syncDeletedBaseDocs(userId: string, baseDocIds: number[]): Promise<void> {
  await db.query(`DELETE FROM deleted_base_docs WHERE user_id = $1`, [userId]);
  for (const id of baseDocIds) {
    await db.query(`INSERT INTO deleted_base_docs (user_id, base_doc_id) VALUES ($1, $2)`, [
      userId,
      id,
    ]);
  }
}

// ==================== researcher_analysis (wipe + insert, composite key) ====================

export async function loadResearcherAnalysis(): Promise<Row[]> {
  const { rows } = await db.query(`SELECT * FROM researcher_analysis`);
  return rows;
}

export async function syncResearcherAnalysis(userId: string, rows: Row[]): Promise<void> {
  await db.query(`DELETE FROM researcher_analysis WHERE user_id = $1`, [userId]);
  for (const r of rows) {
    await db.query(
      `INSERT INTO researcher_analysis (user_id, chapter_id, section_id, content, version)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, r.chapter_id ?? null, r.section_id ?? null, r.content ?? "", r.version ?? 1],
    );
  }
}

// ==================== library_sources (bespoke per-row writes) ====================
// updated_at is stamped by the DB trigger (update_library_sources_updated_at),
// including on ON CONFLICT DO UPDATE — no need to set it here.

const LIBRARY_JSONB_COLUMNS = ["key_points"];

export async function loadLibraryRows(): Promise<Row[]> {
  const { rows } = await db.query(`SELECT * FROM library_sources WHERE client_id IS NOT NULL`);
  return rows;
}

export async function insertLibraryRow(userId: string, row: Row): Promise<void> {
  const dataColumns = Object.keys(row).filter((c) => c !== "user_id");
  const columns = ["user_id", ...dataColumns];
  const updateSet = dataColumns
    .filter((c) => c !== "client_id")
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const values = columns.map((c) =>
    c === "user_id" ? userId : bindValue(row[c], LIBRARY_JSONB_COLUMNS.includes(c)),
  );
  await db.query(
    `INSERT INTO library_sources (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (user_id, client_id) WHERE client_id IS NOT NULL DO UPDATE SET ${updateSet}`,
    values,
  );
}

export async function updateLibraryRow(
  userId: string,
  clientId: string,
  patch: Row,
): Promise<void> {
  // user_id/client_id are never patchable — ownership/identity comes only
  // from the scoped WHERE clause below, never from the request body.
  const columns = Object.keys(patch).filter((c) => c !== "user_id" && c !== "client_id");
  if (!columns.length) return;
  const setClause = columns.map((c, i) => `${c} = $${i + 3}`).join(", ");
  const values = columns.map((c) => bindValue(patch[c], LIBRARY_JSONB_COLUMNS.includes(c)));
  await db.query(`UPDATE library_sources SET ${setClause} WHERE user_id = $1 AND client_id = $2`, [
    userId,
    clientId,
    ...values,
  ]);
}

export async function deleteLibraryRow(userId: string, clientId: string): Promise<void> {
  await db.query(`DELETE FROM library_sources WHERE user_id = $1 AND client_id = $2`, [
    userId,
    clientId,
  ]);
}

export async function deleteLibraryRows(userId: string, clientIds: string[]): Promise<number> {
  if (!clientIds.length) return 0;
  const { rowCount } = await db.query(
    `DELETE FROM library_sources WHERE user_id = $1 AND client_id = ANY($2::text[])`,
    [userId, clientIds],
  );
  return rowCount ?? 0;
}

// ==================== Notification inbox ====================

const NOTIF_TABLES = [
  {
    table: "supervisor_questions",
    ownerCol: "created_by",
    type: "سؤال",
    label: "سؤال جديد",
    icon: "❓",
    tab: "questions",
  },
  {
    table: "supervisor_notes",
    ownerCol: "created_by",
    type: "ملاحظة",
    label: "ملاحظة جديدة",
    icon: "📝",
    tab: "notes",
  },
  {
    table: "supervisor_decisions",
    ownerCol: "created_by",
    type: "قرار",
    label: "قرار جديد",
    icon: "⚖️",
    tab: "decisions",
  },
  {
    table: "supervisor_files",
    ownerCol: "uploaded_by",
    type: "ملف",
    label: "ملف مرفوع",
    icon: "📎",
    tab: "files",
  },
  {
    table: "supervisor_meetings",
    ownerCol: "created_by",
    type: "اجتماع",
    label: "اجتماع مسجَّل",
    icon: "📅",
    tab: "meetings",
  },
  {
    table: "supervisor_reports",
    ownerCol: "created_by",
    type: "تقرير",
    label: "تقرير جديد",
    icon: "📊",
    tab: "reports",
  },
] as const;

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function getLastReadAt(userId: string): Promise<string> {
  const { rows } = await db.query(
    `SELECT last_read_at FROM notification_reads WHERE user_id = $1`,
    [userId],
  );
  if (rows[0]?.last_read_at) return toIsoString(rows[0].last_read_at);
  await db.query(
    `INSERT INTO notification_reads (user_id, last_read_at) VALUES ($1, '1970-01-01T00:00:00Z')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  return "1970-01-01T00:00:00Z";
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.query(
    `INSERT INTO notification_reads (user_id, last_read_at) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
    [userId, nowIso],
  );
}

export async function loadNotifications(
  userId: string,
  limit = 20,
): Promise<{ count: number; items: Row[] }> {
  const lastRead = await getLastReadAt(userId);

  const results = await Promise.all(
    NOTIF_TABLES.map(async ({ table, ownerCol, type, label, icon, tab }) => {
      const { rows } = await db.query(
        `SELECT * FROM ${table} WHERE created_at > $1 AND ${ownerCol} <> $2
         ORDER BY created_at DESC LIMIT $3`,
        [lastRead, userId, limit],
      );
      return rows.map((r: Row) => ({
        table,
        type,
        label,
        icon,
        tab,
        id: r.id,
        title: r.content || r.note || r.file_name || r.subject || r.summary || label,
        chapter: r.chapter || r.section || null,
        date: r.date || r.upload_date || r.meeting_date || null,
        ownerId: r[ownerCol],
        createdAt: r.created_at,
      }));
    }),
  );

  const items = results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
    )
    .slice(0, limit);
  return { count: items.length, items };
}
