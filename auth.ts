import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { authConfig } from './auth.config';
import { getClient } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const client = getClient();
      try {
        await client.connect();
        await client.query(
          `INSERT INTO users (email, name, avatar) VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, avatar=EXCLUDED.avatar`,
          [user.email, user.name ?? null, user.image ?? null]
        );
      } catch (e) {
        console.error('signIn DB error:', e);
        return false;
      } finally {
        await client.end().catch(() => {});
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const client = getClient();
        try {
          await client.connect();
          const { rows } = await client.query<{ id: string }>(
            'SELECT id FROM users WHERE email=$1',
            [user.email]
          );
          if (rows[0]) token.userId = rows[0].id;
        } catch (e) {
          console.error('jwt DB error:', e);
        } finally {
          await client.end().catch(() => {});
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
