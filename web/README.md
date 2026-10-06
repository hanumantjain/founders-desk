# Founders Desk

A web app that runs a small design studio day to day. Each founder gets a private desk for their own tasks, goals and expenses, and a shared space with their partner for meetings, leads, projects and office costs. Changes show up for both founders in real time.

Built with **React** and **Vite**, with **Supabase** for email/password sign-in and a Postgres database protected by row-level security.

## Features

| Tab | What it does |
|---|---|
| **Today** | Today's to-dos, tasks your partner assigned to you, monthly payments due soon, and tomorrow's meetings with one-tap WhatsApp confirmation messages. |
| **Tasks** | Daily, weekly and monthly task lists, yearly goals with progress bars, and a Progress view with charts for tasks, meetings, leads and projects. Assign a task to your partner and both of you can track its status. |
| **Calendar** | A shared monthly calendar of meetings and payment due dates. Mark meetings as attended or cancelled. |
| **Expenses** | Personal spending by category and month, plus personal monthly payments (rent, EMI, insurance) with reminders. |
| **Leads** | Every enquiry with its reference and stage, from Enquiry to Advance received. A lead becomes a project once the advance is recorded. |
| **Projects** 🔒 | Amount quoted, payments received and balance due for each project. |
| **Commercial** 🔒 | Office expenses, office monthly payments, money received from projects, and monthly profit. |

Also included:
- **Private vs. shared:** tasks, goals, personal expenses and personal payments are visible only to you. Meetings, leads, projects and office costs are shared with your partner.
- **Founders' password:** Projects and Commercial are locked behind a shared password and lock again after 15 idle minutes. Resetting it needs a 2-digit code from each founder, so neither can change it alone.
- **Notification bell** with password-reset codes, reminders and tips.
- **Type-ahead** that fills in names, phone numbers and categories you've used before. Press Enter or Tab to accept a suggestion.
- **Installable on phones:** use "Add to Home Screen" and it opens like an app.

## Using the app

1. **Sign up** with your name, email and password, then click the confirmation link sent to your email.
2. **Create your studio** by entering your studio's name. You become its owner.
3. **Invite your partner.** Click the round button with your initial (top right), enter your partner's email, and click Invite. Your partner signs up with that same email, confirms it, and sees your invite on their first sign-in.
4. **Set the founders' password** the first time either of you opens Projects or Commercial.
5. Start adding tasks, meetings, leads and expenses. The **+ Add expense** tile on Today is the quickest way to log a spend. Tag it *Office* to send it to Commercial.

If you forget your login password, use **Forgot password?** on the sign-in screen and a reset link is emailed to you.

## Running it yourself

### Requirements
- Node.js 20 or newer
- A free [Supabase](https://supabase.com) project with the Founders Desk database schema applied (tables, row-level security policies and functions)

### Steps

```bash
npm install
cp .env.example .env
```

Fill in `.env` with values from your Supabase project:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable or anon key>
```

Use the **publishable** key (`sb_publishable_...`) or the legacy **anon** key. Never put a secret or `service_role` key here: it would be exposed in the browser.

In Supabase, go to **Authentication → URL Configuration** and set the **Site URL** to where the app runs (`http://localhost:5173` for local development) so the confirmation and password-reset emails link back to the app.

```bash
npm run dev      # start locally at http://localhost:5173
npm run build    # production build in dist/
npm run lint     # check the code
```

### Deploying

`npm run build` produces a static site in `dist/`. Host it on Vercel, Netlify, Cloudflare Pages or any static host, set the same two `VITE_SUPABASE_*` environment variables there, and add the live URL to Supabase's Site URL / Redirect URLs.

## Project structure

```
src/
  App.jsx          sign-in → studio setup → desk
  auth/            sign in, sign up, password reset, create or join a studio
  desk/            one component per tab, plus the bell, account panel and modals
  components/      shared inputs (type-ahead) and charts
  lib/store.js     loads data, keeps it live with Supabase Realtime, saves changes
  lib/derived.js   bill cycles, reminders, tips and other calculations
```

## Roadmap

**Phase 2: teams with multiple partners**
- Studios with more than two partners, with several pending invites at once
- Assign tasks to any partner from a dropdown
- Password reset approved by any one other partner
- Owner can manage and remove any partner from the account panel
