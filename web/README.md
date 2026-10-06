# Founders Desk

A web app that runs a small design studio day to day. Each partner gets a private desk for their own tasks, goals and expenses, and the whole studio shares meetings, leads, projects and office costs. Changes show up for everyone in real time.

Built with **React** and **Vite**, with **Supabase** for email/password sign-in and a Postgres database protected by row-level security.

## Features

| Tab | What it does |
|---|---|
| **Today** | Today's to-dos, tasks a partner assigned to you, monthly payments due soon, and tomorrow's meetings with one-tap WhatsApp confirmation messages. |
| **Tasks** | Daily, weekly and monthly task lists, yearly goals with progress bars, and a Progress view with charts for tasks, meetings, leads and projects. Assign a task to any partner and everyone in the studio can track its status. |
| **Calendar** | A shared monthly calendar of meetings and payment due dates. Mark meetings as attended or cancelled. |
| **Expenses** | Personal spending by category and month, plus personal monthly payments (rent, EMI, insurance) with reminders. |
| **Leads** | Every enquiry with its reference and stage, from Enquiry to Advance received. A lead becomes a project once the advance is recorded. |
| **Projects** 🔒 | Amount quoted, payments received and balance due for each project. |
| **Commercial** 🔒 | Office expenses, office monthly payments, money received from projects, and monthly profit. |

Also included:
- **Private vs. shared:** tasks, goals, personal expenses and personal payments are visible only to you. Meetings, leads, projects and office costs are shared with your studio.
- **Studio password:** Projects and Commercial are locked behind a shared password and lock again after 15 idle minutes. Resetting it needs your own 2-digit code plus a code from any one other partner, so nobody can change it alone.
- **Notification bell** with password-reset codes, reminders and tips.
- **Type-ahead** that fills in names, phone numbers and categories you've used before. Press Enter or Tab to accept a suggestion.
- **Installable on phones:** use "Add to Home Screen" and it opens like an app.

## Using the app

1. **Sign up** with your name, email and password, then click the confirmation link sent to your email.
2. **Create your studio** by entering your studio's name. You become its owner.
3. **Invite your partners.** Click the round button with your initial (top right), enter a partner's email, and click Invite. Repeat for each partner. Each one signs up with that same email, confirms it, and sees the invite on their first sign-in. A studio can have up to 20 people, including pending invites.
4. **Set the studio password** the first time anyone opens Projects or Commercial.
5. Start adding tasks, meetings, leads and expenses. The **+ Add expense** tile on Today is the quickest way to log a spend. Tag it *Office* to send it to Commercial.

**Roles:** the person who creates the studio is its **owner**. Only the owner can invite partners, cancel invites and remove partners. Any partner can leave the studio from the account menu, which deletes their private data in that studio.

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

- **Phase 1:** two founders per studio. ✅
- **Phase 2:** studios with multiple partners: invite several people, assign tasks to anyone, password reset approved by any one partner, and owner controls for removing partners. ✅
