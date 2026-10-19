# TaskMatrix — Sprint 15

Sprint 15 extends the Sprint 13 TaskMatrix product blueprint and Sprint 14 authentication foundation. It keeps the Next.js App Router, Supabase Auth, responsive purple-and-white workspace UI, and adds authenticated task CRUD and analytics.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Sign in to TaskMatrix |
| `/register` | Create an account |
| `/dashboard` | Protected workspace with task CRUD and analytics |
| `/` | Entry point; shows sign-in when signed out and workspace when signed in |

## Sprint 15 scope
- Read: hydrate the signed-in user's tasks from Supabase.
- Create: validate and persist new tasks.
- Update: edit existing tasks in a prefilled dialog.
- Delete: require confirmation before deleting a task.
- Analytics: task status summary and completion chart.
- Security: Supabase Row Level Security (RLS) ensures each user can access only their own records.

## Stack
- Next.js App Router, React, TypeScript
- Supabase Auth + Postgres (`@supabase/ssr` session cookies)
- Middleware route protection for `/dashboard`, `/login`, and `/register`
- Recharts
- Responsive CSS design system aligned with Sprint 14

## Setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add your Supabase project URL and anon/publishable key.
4. Run the SQL in `supabase/schema.sql` in Supabase SQL Editor.
5. Run `npm run dev` and open `http://localhost:3000`.

## Environment
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required. Never put a Supabase service-role key in the browser.

## Validation checklist
- Register/sign in with Supabase Auth.
- Create, edit, complete, filter, and delete a task.
- Confirm refresh retains data and a second user cannot see the first user's tasks.
- Verify dashboard metrics update after mutations.

> Deployment note: configure the same public environment variables in Vercel and set the Supabase Auth Site URL / redirect URLs to your deployment domain.
