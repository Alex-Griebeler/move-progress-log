# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/905d5174-1667-49dc-b1cc-1e7743b2741e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/905d5174-1667-49dc-b1cc-1e7743b2741e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/905d5174-1667-49dc-b1cc-1e7743b2741e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## CI-First Staging Gate (GitHub Actions)

This repo now includes a CI-first staging flow that does not depend on manual Lovable execution:

- `CI` workflow: lint + typecheck + tests + build + security audit
- `Staging Edge Gate` workflow:
  - triggers automatically after a successful `CI` run on `main`
  - deploys essential edge functions
  - runs edge auth smoke tests
  - uploads `edge-smoke-report` artifact

### Required GitHub secrets

Configure these in `Settings -> Secrets and variables -> Actions`:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required only for optional service_role smoke tests)

### Manual run (optional)

You can manually trigger `Staging Edge Gate` via `workflow_dispatch` and enable:

- `run_service_role_tests = true` to execute A3/B4/C4 service_role checks.
