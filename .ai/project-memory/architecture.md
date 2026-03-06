# Architecture

## Stack
- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase (Postgres + Edge Functions written in Deno/TypeScript)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router v6
- **Auth**: Supabase Auth with JWT

## GitHub Automation
An AI engineer pipeline runs via GitHub Actions on every new issue.
It plans, generates, and applies code changes as a pull request.
