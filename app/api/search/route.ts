import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { auth } from '@/auth';

function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  // Call OpenRouter
  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'HTTP-Referer': 'https://first-app-eta-gold.vercel.app',
      'X-Title': '3P Explorer',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Return the top 3 for any topic as a JSON array. ' +
            'Each item must have: {"rank":1,"title":"Name","reason":"one sentence why","url":"https://real-link.com"}. ' +
            'Return ONLY valid JSON — no markdown, no explanation.',
        },
        { role: 'user', content: `Top 3 for: ${topic.trim()}` },
      ],
      temperature: 0.7,
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return NextResponse.json({ error: `OpenAI error: ${errText}` }, { status: 502 });
  }

  const aiData = await aiRes.json();
  const raw = aiData.choices[0].message.content.trim();

  let results: { rank: number; title: string; reason: string; url?: string }[];
  try {
    const parsed = JSON.parse(raw);
    results = Array.isArray(parsed) ? parsed : parsed.results ?? [];
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 });
  }

  // Get logged-in user (if any)
  const session = await auth();
  const userId: string | null = session?.user?.id ?? null;

  // Persist to NeonDB
  const slug = slugify(topic.trim());
  const client = getClient();
  try {
    await client.connect();

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO searches (topic, slug, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE
         SET topic = EXCLUDED.topic,
             user_id = COALESCE(EXCLUDED.user_id, searches.user_id),
             created_at = NOW()
       RETURNING id`,
      [topic.trim(), slug, userId]
    );
    const searchId = rows[0].id;

    await client.query('DELETE FROM results WHERE search_id = $1', [searchId]);
    for (const r of results) {
      await client.query(
        'INSERT INTO results (search_id, rank, title, reason, source_url) VALUES ($1,$2,$3,$4,$5)',
        [searchId, r.rank, r.title, r.reason, r.url ?? null]
      );
    }

    // Record in user history if logged in
    if (userId) {
      await client.query(
        `INSERT INTO user_search_history (user_id, search_id, topic) VALUES ($1, $2, $3)`,
        [userId, searchId, topic.trim()]
      );
    }

    // Update version1 — mark "Store searches in DB" completed after first successful save
    await client.query(
      `UPDATE version1 SET status='completed', completed_at=NOW(), updated_at=NOW()
       WHERE title='Store searches in DB' AND status != 'completed'`
    );
  } catch (e) {
    console.error('DB write error:', e);
  } finally {
    await client.end().catch(() => {});
  }

  return NextResponse.json({ results, slug });
}
