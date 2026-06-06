import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET() {
  const client = getClient();
  try {
    await client.connect();

    const { rows: tasks } = await client.query(
      'SELECT * FROM version1 ORDER BY phase, parent_id NULLS FIRST, position'
    );

    let logs: Record<string, unknown>[] = [];
    try {
      const { rows } = await client.query(`
        SELECT l.*, v.title AS task_title
        FROM version1_logs l
        LEFT JOIN version1 v ON v.id = l.task_id
        ORDER BY l.created_at DESC
        LIMIT 100
      `);
      logs = rows;
    } catch (_) {}

    return NextResponse.json({ tasks, logs });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await client.end().catch(() => {});
  }
}
