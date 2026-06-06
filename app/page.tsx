'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Result {
  rank: number;
  title: string;
  reason: string;
  url?: string;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');

  const search = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results);
      setSlug(data.slug || '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const RANK_COLORS = ['from-indigo-500 to-violet-500', 'from-violet-500 to-purple-500', 'from-purple-500 to-fuchsia-500'];

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-900 text-center py-20 px-4 border-b border-slate-800">
        <div className="max-w-2xl mx-auto">
          <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full mb-6 tracking-widest uppercase">
            AI-Powered Rankings
          </div>
          <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
            3P Explorer
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Enter any topic — get the definitive Top 3, powered by AI
          </p>

          {/* Search bar */}
          <div className="flex gap-2 bg-slate-800/80 border border-slate-700 rounded-2xl p-2 shadow-xl">
            <input
              className="flex-1 bg-transparent px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none text-sm"
              placeholder="programming languages, mutual funds, ucl players..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && search()}
            />
            <button
              onClick={search}
              disabled={loading || !topic.trim()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
            >
              {loading ? 'Thinking...' : 'Get Top 3'}
            </button>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['programming languages', 'mutual funds', 'UCL players', 'JS frameworks', 'productivity tools'].map(ex => (
              <button
                key={ex}
                onClick={() => { setTopic(ex); }}
                className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-full px-3 py-1 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Results */}
      <section className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Asking the AI for the top 3...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* Results cards */}
        {results.length > 0 && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-slate-300 font-semibold">
                Top 3 for <span className="text-white">"{topic}"</span>
              </h2>
              {slug && (
                <Link href={`/t/${slug}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Share link →
                </Link>
              )}
            </div>

            {results.map((r, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
                <div className={`h-1 bg-gradient-to-r ${RANK_COLORS[i]}`} />
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${RANK_COLORS[i]} flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                      {r.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-base mb-1">{r.title}</div>
                      <div className="text-slate-400 text-sm leading-relaxed">{r.reason}</div>
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-indigo-400 text-xs hover:text-indigo-300 transition-colors truncate max-w-full"
                        >
                          ↗ {r.url.replace(/^https?:\/\//, '').split('/')[0]}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && results.length === 0 && (
          <div className="text-center py-20 text-slate-600">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-sm">Type a topic above and hit Enter</p>
          </div>
        )}
      </section>

      <footer className="text-center py-6 border-t border-slate-800 text-slate-600 text-xs flex justify-center gap-6">
        <Link href="/progress" className="hover:text-slate-400 transition-colors">Build Progress</Link>
        <span>·</span>
        <span>3P Explorer © 2026</span>
      </footer>
    </main>
  );
}
