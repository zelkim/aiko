# Spec: BetterAuth Integration

## BetterAuth Server Config (`src/lib/auth.ts`)
- Use `betterAuth()` with `prismaAdapter(prisma, { provider: "postgresql" })`
- Configure `socialProviders.google` with calendar scopes: `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/calendar.events`
- Set `accessType: "offline"` and `prompt: "consent"` for refresh token
- Add `nextCookies()` plugin for server-side session access
- Set `baseURL` from `BETTER_AUTH_URL` env var
- Set `secret` from `BETTER_AUTH_SECRET` env var

## BetterAuth Client (`src/lib/auth-client.ts`)
- Export `authClient` from `createAuthClient()` (`better-auth/react`)
- Export destructured `signIn`, `signOut`, `useSession`

## Catch-all Route (`src/app/api/auth/[...all]/route.ts`)
- Export `{ GET, POST }` from `toNextJsHandler(auth)`

## Sign-in Page (`src/app/sign-in/page.tsx`)
- Client component with "Sign in with Google" button
- Call `authClient.signIn.social({ provider: "google" })` on click
- Redirect to `/` on success

## Proxy (`src/proxy.ts`)
- `export default async function proxy(request: NextRequest)`
- Check for `better-auth.session_token` cookie
- Redirect unauthenticated users to `/sign-in` (except `/sign-in` and `/api/auth/*` paths)
- Redirect authenticated users away from `/sign-in` to `/`
- Matcher excludes `_next/static`, `_next/image`, `favicon.ico`

## Schema Changes
- Add BetterAuth tables: `user`, `session`, `account`, `verification`
- Remove `CalendarAccount` model
- Add `userId String` + `user` relation to `Conversation`

## Calendar Wrapper Update
- `getCalendarClient(headers: Headers)` — accept headers parameter
- Use `auth.api.getSession({ headers })` to identify user
- Use `auth.api.getAccessToken({ body: { providerId: "google" }, headers })` for fresh token
- Construct OAuth2 client with retrieved access token

## Chat Route Protection
- Call `auth.api.getSession({ headers: req.headers })` at start
- Return 401 if no session
- Pass `req.headers` through to calendar wrapper functions
