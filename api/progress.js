import pg from 'pg';
const { Client } = pg;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const { rows: tasks } = await client.query(
      'SELECT * FROM version1 ORDER BY phase, parent_id NULLS FIRST, position'
    );

    let logs = [];
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

    res.status(200).json({ tasks, logs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    await client.end();
  }
}
