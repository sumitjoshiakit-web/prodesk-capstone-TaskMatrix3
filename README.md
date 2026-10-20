# TaskMatrix — Sprint 15

Sprint 15 extends the Sprint 13 TaskMatrix product blueprint and Sprint 14 authentication foundation. The implementation uses Next.js App Router, Supabase Auth/Postgres, user-scoped task CRUD, and Recharts analytics.

**Related project records**
- Sprint 13 planning / PRD / wireframes: [prodesk-capstone-TaskMatrix1](https://github.com/sumitjoshiakit-web/prodesk-capstone-TaskMatrix1)
- Sprint 14 authentication foundation: [prodesk-capstone--TaskMatrix-2](https://github.com/sumitjoshiakit-web/prodesk-capstone--TaskMatrix-2)
- Sprint 13 Figma wireframes: [TaskMatrix Figma file](https://www.figma.com/design/PMAHqdULAMywdVpkL8mq2k/Untitled?node-id=0-1)

**Deployment status:** No verified public deployment URL is recorded here yet. Do not treat the project as deployment-verified until the Vercel URL, environment variables, and Supabase Auth redirect URLs have been checked.

## Routes

| Route        | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `/login`     | Sign in to TaskMatrix                                                   |
| `/register`  | Create an account                                                       |
| `/dashboard` | Protected workspace with task CRUD and analytics                        |
| `/`          | Entry point; shows sign-in when signed out and workspace when signed in |

## Sprint 15 scope

### PRD alignment and known scope changes

The Sprint 13 PRD proposed projects, a five-column board (Backlog, To Do, In Progress, Review, Done), team membership, task assignments, comments, and activity history. The Sprint 15 implementation currently delivers a user-owned task list with three statuses (To do, In progress, Completed), priority, due date, search/filtering, CRUD, and dashboard metrics. Projects, the five-column board, team members/assignees, comments, and activity history are **not implemented**. This is an explicit scope reduction from the planning PRD, not a claim that every PRD feature is complete.

Sprint 15 now restores the Sprint 14 Zustand auth store for the authenticated user payload. Task data, filters, and modal state remain local to the main client page; the large page still needs a component-level refactor.


- Read: hydrate the signed-in user's tasks from Supabase.
- Create: validate and persist new tasks.
- Update: edit existing tasks in a prefilled dialog.
- Delete: require confirmation before deleting a task.
- Analytics: task status summary and completion chart.
- Security: Supabase Row Level Security (RLS) ensures each user can access only their own records.

## Stack

The Sprint 13 planning document initially proposed React/Vite + Express + MongoDB. Implementation deliberately changed in Sprint 14 to Next.js + Supabase; Sprint 15 continues that revised architecture. The Sprint 13 README documents this evolution.

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

Use this checklist during final manual verification; do not mark a check complete until it has been tested against the current commit.

- [ ] Register/sign in with Supabase Auth.
- [ ] Confirm signed-out access to `/dashboard` redirects to `/login`.
- [ ] Create, edit, complete, filter, and delete a task.
- [ ] Confirm refresh retains data and a second user cannot see the first user's tasks.
- [ ] Verify dashboard metrics update after mutations.
- [ ] Run `npm run build` and the repository's lint command on the final commit.
- [ ] Deploy to Vercel, add environment variables, configure Supabase Auth Site URL/redirect URLs, and verify the live site.
- [ ] Add the verified Vercel URL to this README.
- [ ] Confirm the Figma link is accessible to reviewers without requesting access.

## Architecture follow-up before capstone-wide submission

- [x] Restore the Sprint 14 Zustand auth-store integration for the current user payload.
- [ ] Split the large client page into focused components (for example, `AuthForm`, `TaskTable`, `TaskModal`, and `Charts`) without changing behavior.
- [ ] Decide whether to add projects and a project-to-tasks relationship, or retain the reduced task-only scope and get the PRD/README accepted as a documented change.
