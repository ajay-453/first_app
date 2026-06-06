import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getClient } from '@/lib/db';
import Link from 'next/link';

interface HistoryRow {
  topic: string;
  created_at: string;
  top_result: string | null;
  slug: string;
}

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');

  const client = getClient();
  let rows: HistoryRow[] = [];

  try {
    await client.connect();
    const result = await client.query<HistoryRow>(
      `SELECT h.topic, h.created_at, s.slug,
              (SELECT title FROM results WHERE search_id = h.search_id ORDER BY rank LIMIT 1) AS top_result
       FROM user_search_history h
       JOIN searches s ON h.search_id = s.id
       WHERE h.user_id = $1
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [session.user.id]
    );
    rows = result.rows;
  } catch (e) {
    console.error('History DB error:', e);
  } finally {
    await client.end().catch(() => {});
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Your History</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {rows.length} {rows.length === 1 ? 'search' : 'searches'} — click any to re-run
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <div className="text-4xl mb-4">🔍</div>
          <p className="mb-4">No searches yet.</p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm">
            Make your first search →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <Link
              key={i}
              href={`/?q=${encodeURIComponent(row.topic)}`}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white group-hover:text-indigo-300 transition-colors truncate">
                  {row.topic}
                </p>
                {row.top_result && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    #1 — {row.top_result}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                <span className="text-xs text-slate-600">
                  {new Date(row.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-slate-600 group-hover:text-indigo-400 transition-colors text-sm">
                  ↩
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
