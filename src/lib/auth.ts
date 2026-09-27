// Better Auth server config: email + password, optional Google/GitHub, and
// guest (anonymous) sessions so people can try a quiz before signing up.
// When a guest creates an account, their progress moves with them.

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { anonymous } from 'better-auth/plugins';
import { db } from '@/db';
import { account, session, user, verification } from '@/db/schema';
import { mergeGuestIntoUser } from '@/server/account-merge';

const adminEmails = new Set(
  (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
);

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
    : {}),
};

export const enabledSocialProviders = Object.keys(socialProviders) as ('google' | 'github')[];

export const auth = betterAuth({
  appName: 'certMonkey',
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  // Local dev servers hop ports when 3000 is busy; trust any localhost port outside production.
  trustedOrigins: process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders,
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'learner', input: false },
    },
  },
  session: {
    // Re-validate against the database at most every 5 minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => ({
          data: { ...data, role: adminEmails.has(String(data.email).toLowerCase()) ? 'admin' : 'learner' },
        }),
      },
    },
  },
  plugins: [
    anonymous({
      emailDomainName: 'guest.certmonkey.app',
      generateName: () => 'Guest',
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await mergeGuestIntoUser(anonymousUser.user.id, newUser.user.id);
      },
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session['user'];
