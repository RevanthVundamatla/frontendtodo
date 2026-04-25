# Todo List Frontend (Vercel)

Standalone React + Vite frontend for the Todo List backend. Uses plain `npm` and is ready to deploy on Vercel.

## Local development

```bash
npm install
npm run dev
```

The app will be available at http://localhost:5173.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Push this folder to a Git repository (GitHub/GitLab/Bitbucket).
2. Import the repo in https://vercel.com/new.
3. **Root Directory**: select the `vercel-app` folder if it isn't the repo root.
4. Framework: Vite (auto-detected). Build command: `npm run build`. Output: `dist`.
5. (Optional) Add environment variable:
   - `VITE_API_BASE = https://todolist-backend-4q3m.onrender.com/api`
   If you don't set it, the default in `src/lib/api.ts` is used.
6. Click **Deploy**.

## After Vercel deploys

Once you have a Vercel URL (for example `https://your-app.vercel.app`):

### On Render (backend)

Update the `FRONTEND_URL` environment variable on the Render service to your Vercel URL **without** a trailing slash:

```
FRONTEND_URL=https://your-app.vercel.app
```

This is required for the Google OAuth redirect (`/oauth-success?token=...`) to land on the frontend.

### Google Cloud Console

In **APIs & Services > Credentials > Your OAuth Client**, add the Vercel URL to **Authorised JavaScript origins**:

```
https://your-app.vercel.app
```

The **Authorised redirect URIs** stay pointing at the backend:

```
https://todolist-backend-4q3m.onrender.com/api/auth/google/callback
```

## Tech stack

- React 18, Vite 5, TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- TanStack Query for server state
- Wouter for routing
- Razorpay Checkout for premium upgrades
