# Debt Tracker

A modern debt tracker for personal loan management, built with React, Vite, Tailwind CSS, React Router, React Hook Form, Recharts, and Supabase.

## Features

- Supabase authentication with register, login, and logout
- Row Level Security so each user only sees their own loans
- Philippine peso currency formatting
- Dashboard cards for active loans, remaining debt, due this month, progress, 15-day due amount, 30-day due amount, and last updated
- Due Soon table, Debt by Lender table, Recent Activity feed, and notification alerts
- Loan Database with search, filters, sorting, pagination, create, edit, delete, and detail navigation
- Loan Details with payment schedule, payment history, add payment, mark completed, and full field inventory
- Completed Loans page
- Analytics with charts for monthly payments, remaining debt trend, debt by lender, status distribution, completion rate, interest vs principal, and upcoming due amounts
- Dark mode and responsive layout

## Local Setup

```bash
npm install
npm run dev
```

The app requires Supabase environment variables. Without them, login and registration are disabled.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add your Supabase URL and anon key.
6. Restart the dev server.

## Vercel Deployment

1. Import this repository into Vercel.
2. Open Project Settings > Environment Variables.
3. Set these variables for Production, Preview, and Development:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Redeploy the project after saving environment variables.

`.env.local` is only for your computer and is intentionally not committed to GitHub. Vercel will show "Supabase is not configured" until the two `VITE_` variables are added in Vercel and the site is redeployed.

## Notes

Each table uses Supabase Row Level Security. Data access is scoped by `user_id = auth.uid()`, so users only see and manage their own loans, installments, payments, activities, lenders, and notifications.
