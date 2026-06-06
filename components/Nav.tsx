import { auth, signOut } from '@/auth';
import Image from 'next/image';
import Link from 'next/link';

export default async function Nav() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="max-w-4xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: '52px' }}>
        <Link href="/" className="font-bold text-white hover:text-indigo-300 transition-colors tracking-tight">
          3P Explorer
        </Link>

        <div className="flex items-center gap-5">
          {session?.user ? (
            <>
              <Link
                href="/history"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                History
              </Link>

              <div className="flex items-center gap-2.5">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? 'avatar'}
                    width={26}
                    height={26}
                    className="rounded-full ring-1 ring-slate-700"
                  />
                )}
                <span className="text-sm text-slate-400 hidden sm:block">
                  {session.user.name?.split(' ')[0]}
                </span>

                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/api/auth/signin"
              className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}

          <Link
            href="/progress"
            className="text-xs text-slate-700 hover:text-slate-500 transition-colors"
          >
            Progress
          </Link>
        </div>
      </div>
    </nav>
  );
}
