# Tasks: BetterAuth Integration

- [x] Install `better-auth` package
- [x] Update Prisma schema: add BetterAuth tables, remove CalendarAccount, add userId to Conversation
- [x] Run Prisma migration and generate client
- [x] Create `src/lib/auth.ts` — BetterAuth server config with Google social provider + calendar scopes
- [x] Create `src/lib/auth-client.ts` — BetterAuth React client
- [x] Create `src/app/api/auth/[...all]/route.ts` — catch-all auth route
- [x] Delete old auth files: `oauth.ts`, `api/auth/google/route.ts`, `api/auth/callback/google/route.ts`
- [x] Update `src/lib/calendar/wrapper.ts` — use `auth.api.getAccessToken` with headers param
- [x] Create `src/app/sign-in/page.tsx` — sign-in page with Google button
- [x] Create `src/proxy.ts` — Next.js 16 auth proxy
- [x] Update `src/app/api/chat/route.ts` — add session check, pass headers to tools
- [x] Update `src/app/page.tsx` and `src/components/chat/ChatLayout.tsx` — user info + sign-out
- [x] Update `.env` with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- [x] Build and verify no TypeScript errors
