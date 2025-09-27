This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
# ComplyAI — Quick start

This is a Next.js app. The instructions below get a contributor from a fresh machine to a running development server.

Prerequisites
- Git
- Node.js (recommended 20.x) and npm (or pnpm / yarn)
- Optional: nvm to manage Node versions

Quick setup (copy-paste)

1. Clone and enter the repo:

```bash
git clone https://github.com/deesig/ComplyAI.git
cd ComplyAI
```

2. Use the recommended Node version (if you have nvm and a `.nvmrc`):

```bash
nvm install 20
nvm use 20
```

3. Install dependencies:

```bash
# prefer npm ci for reproducible installs when a lockfile exists
npm ci || npm install
```

4. Configure Firebase (the project currently uses environment variables):

Create a `.env.local` file in the project root with these keys (fill with values from your Firebase web app):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

NOTE: Do not commit `.env.local`. Use deployment provider secrets for production (Vercel, Netlify, etc.).

5. Run the dev server:

```bash
npm run dev
# then open http://localhost:3000
```

Build & start (production):

```bash
npm run build
npm run start
```

Troubleshooting & tips
- If you see Node version errors, install/use Node 20 as shown above.
- If Firebase calls fail, double-check your `.env.local` values and make sure the Firebase project allows the app's domain (localhost during dev).
- Commit `package-lock.json` (or your lockfile) to ensure reproducible installs.

More
- For detailed Next.js docs and deployment, see https://nextjs.org/docs
- If you want, I can add `.nvmrc`, a `.env.local.example`, or update `src/firebase.ts` to read env vars — tell me which and I'll implement it.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
