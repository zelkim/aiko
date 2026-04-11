# BetterAuth Integration — Design

## Architecture

### Auth Flow
1. User visits `/` → proxy.ts checks for session cookie → redirects to `/sign-in` if absent
2. User clicks "Sign in with Google" → BetterAuth initiates OAuth with calendar scopes
3. Google consent screen includes Calendar read/write permissions
4. Callback handled by BetterAuth catch-all → creates user + account + session
5. User redirected to `/` → proxy passes through → page renders ChatLayout

### Token Management
- BetterAuth's `account` table stores `accessToken`, `refreshToken`, `scope`
- `auth.api.getAccessToken({ body: { providerId: "google" }, headers })` auto-refreshes expired tokens
- Calendar wrapper accepts request headers to resolve session → get fresh access token

### Route Protection
- **Optimistic (proxy.ts)**: Check session cookie, redirect unauthenticated users to `/sign-in`
- **Secure (API routes)**: Call `auth.api.getSession({ headers })` for database-backed session check

## Files

### New Files
- `src/lib/auth.ts` — BetterAuth server config (Prisma adapter, Google social provider with calendar scopes)
- `src/lib/auth-client.ts` — Client-side auth (`createAuthClient` from `better-auth/react`)
- `src/app/api/auth/[...all]/route.ts` — BetterAuth catch-all route handler
- `src/app/sign-in/page.tsx` — Sign-in page with Google button
- `src/proxy.ts` — Next.js 16 auth proxy

### Modified Files
- `prisma/schema.prisma` — Add BetterAuth tables (user, session, account, verification), remove CalendarAccount, add userId to Conversation
- `src/lib/calendar/wrapper.ts` — Use `auth.api.getAccessToken` instead of CalendarAccount queries
- `src/app/api/chat/route.ts` — Add session check, pass headers to calendar tools, filter conversations by userId
- `src/app/page.tsx` — Get session server-side, pass user to ChatLayout
- `src/components/chat/ChatLayout.tsx` — Display user info, add sign-out button

### Deleted Files
- `src/lib/calendar/oauth.ts` — Manual OAuth2 client factory (replaced by BetterAuth)
- `src/app/api/auth/google/route.ts` — Manual OAuth redirect (replaced by BetterAuth)
- `src/app/api/auth/callback/google/route.ts` — Manual OAuth callback (replaced by BetterAuth)

## Dependencies
- `better-auth` — Auth framework with social providers, Prisma adapter, session management
