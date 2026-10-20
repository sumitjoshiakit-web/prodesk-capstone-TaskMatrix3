# TaskMatrix — Sprint 15

Sprint 15 extends the Sprint 13 TaskMatrix product blueprint and Sprint 14 authentication foundation. The implementation uses Next.js App Router, Supabase Auth/Postgres, project management, a five-stage Kanban board, task assignment by email, task comments, activity history, task CRUD, and Recharts analytics.

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

The Sprint 15 implementation now includes projects, a five-stage board (Backlog, To Do, In Progress, Review, Done), email-based project member records, task assignees, task comments, and an activity feed alongside task CRUD and analytics. Project owners manage their project/member lists; a task's assigned email can sign in to view/update that task and participate in its discussion through RLS policies. Project membership by itself does not grant access to every task in that project; assign tasks explicitly to collaborators. The app still uses a single client page and needs final build, live Supabase/RLS, and deployment verification.

Sprint 15 now restores the Sprint 14 Zustand auth store for the authenticated user payload. Task data, filters, and modal state remain local to the main client page. The project-card/team UI and five-stage board are now separate components; authentication UI, task modal, and charts still need extraction.


- Projects: create and delete projects; add/remove team member email records.
- Board: move tasks through Backlog, To Do, In Progress, Review, and Done.
- Assignment: assign tasks by email; signed-in assignees can access assigned tasks under RLS.
- Collaboration: persist task comments and activity history.
- CRUD: create, read, edit, complete, filter, search, and confirm deletion of tasks.
- Analytics: task status summary and completion chart.
- Security: Supabase Row Level Security (RLS) scopes tasks to owners and explicit assignees.

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
4. Run the full updated SQL in `supabase/schema.sql` in Supabase SQL Editor. It extends the existing tasks schema and creates projects, project members, comments, and activity tables.
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
- [ ] Confirm the GitHub Actions `Sprint 15 validation` workflow passes lint and production build on the final commit.
- [ ] Deploy to Vercel, add environment variables, configure Supabase Auth Site URL/redirect URLs, and verify the live site.
- [ ] Add the verified Vercel URL to this README.
- [ ] Confirm the Figma link is accessible to reviewers without requesting access.

## Architecture follow-up before capstone-wide submission

- [x] Restore the Sprint 14 Zustand auth-store integration for the current user payload.
- [x] Extract `ProjectCard` and `TaskBoard` from the large client page.
- [ ] Extract authentication UI, task modal, and charts into focused components without changing behavior.
- [ ] Run the updated SQL in the connected Supabase project and verify owner/assignee access with two test accounts.
