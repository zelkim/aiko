# BetterAuth Integration

## What
Replace the hand-rolled Google OAuth flow with BetterAuth for proper user authentication, session management, and Google Calendar scope authorization.

## Why
- No auth system exists — all routes are completely open
- OAuth tokens stored in a separate CalendarAccount table with no user association
- No session management, no route protection
- Need to request Google Calendar scopes (`calendar`, `calendar.events`) during sign-in
- Conversations should be scoped per user

## Key Decisions
- **Sign-in page**: Dedicated `/sign-in` page with Google button (not auto-redirect)
- **Remove CalendarAccount**: Use BetterAuth's built-in `account` table for OAuth tokens
- **User-scoped conversations**: Add `userId` FK to Conversation model
- **Next.js 16 proxy**: Use `proxy.ts` (not `middleware.ts`) for auth guards per Next.js 16 convention
