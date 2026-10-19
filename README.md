# TaskMatrix — Sprint 15

A Next.js + Supabase task management dashboard implementing authenticated, user-scoped CRUD and task analytics.

## Sprint 15 scope
- Read: hydrate the signed-in user's tasks from Supabase.
- Create: validate and persist new tasks.
- Update: edit existing tasks in a prefilled dialog.
- Delete: require confirmation before deleting a task.
- Analytics: task status summary and completion chart.
- Security: Supabase Row Level Security (RLS) ensures each user can access only their own records.

## Stack
- Next.js App Router, React, TypeScript
- Supabase Auth + Postgres
- Recharts
- Tailwind CSS

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
