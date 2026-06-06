import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: { signIn: '/api/auth/signin' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      if (nextUrl.pathname.startsWith('/history')) return isLoggedIn;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
