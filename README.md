# MediMindAI

MediMindAI is a web app for tracking your health readings and asking an AI assistant about them. You log your heart rate, blood pressure and weight, watch the trends on a chart, and chat with an assistant that can see your latest readings.

> **Disclaimer:** This is an educational project. It gives general health information only. It does not diagnose, treat or replace a doctor. In an emergency, call your local emergency number.

<!-- Add screenshots here after your first run, e.g. ![Dashboard](docs/dashboard.png) -->

## Features

- **Accounts:** sign up and log in with email and password.
- **Vitals tracking:** record heart rate, blood pressure and weight, and see them in a trend chart and a history table.
- **AI chat:** ask general health questions. The assistant gets your five most recent readings and the last few messages as context.
- **Saved history:** your chat history is stored per account.
- **Safety prompts:** the assistant is instructed not to diagnose or prescribe, and to point you to emergency services for urgent symptoms.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Recharts |
| Auth and database | Supabase (Auth, PostgreSQL, Row Level Security) |
| AI | Google Gemini API |
| Backend | Vercel serverless function (`api/chat.js`) |
| Hosting | Vercel |

All of these have a free tier.

## How it works

```
Browser (React)
   ├─► Supabase ── login, and read/write your own vitals (protected by Row Level Security)
   │
   └─► /api/chat (Vercel serverless)
          1. checks your login token
          2. validates the message
          3. loads your recent vitals and chat history from Supabase
          4. sends everything to Gemini
          5. saves the exchange and returns the reply
```

## Security notes

- **Row Level Security** is enabled on every table. A user can only read and insert rows that belong to them.
- **The Gemini API key** is used only inside the serverless function and is never sent to the browser.
- **The chat endpoint** returns 401 without a valid login and 400 for empty messages or messages over 500 characters. Errors shown to the user are generic. Details are logged on the server only.
- The Supabase anon key in the browser is public by design. RLS is what protects the data.

## Run locally

You need Node.js 18 or later.

1. **Create a Supabase project** (free) at [supabase.com](https://supabase.com). Open the SQL editor and run [supabase/schema.sql](supabase/schema.sql). For quick testing, turn off "Confirm email" under Authentication, Providers, Email.
2. **Get a Gemini API key** (free) from [Google AI Studio](https://aistudio.google.com/apikey).
3. **Install and configure:**
   ```bash
   npm install
   cp .env.example .env
   ```
   Fill in `.env`:

   | Variable | Where it comes from |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase, Project Settings, API |
   | `VITE_SUPABASE_ANON_KEY` | Supabase, Project Settings, API |
   | `GEMINI_API_KEY` | Google AI Studio |
   | `GEMINI_MODEL` (optional) | Overrides the default `gemini-3.1-flash-lite` |

4. **Start the app:**
   ```bash
   npx vercel dev
   ```
   Use `vercel dev` rather than `npm run dev`, because `npm run dev` serves only the frontend and the `/api/chat` endpoint will not exist.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it at [vercel.com](https://vercel.com). Vercel detects Vite and the `api/` folder automatically.
3. Add the environment variables from the table above in the project settings.
4. Deploy.

## Project structure

```
api/
  chat.js               Serverless chat endpoint
src/
  main.jsx, App.jsx     Entry point and routes
  pages/                Login, Dashboard, Chat
  components/           Navbar, VitalsForm, VitalsChart, ChatBox
  lib/                  Supabase client, auth context
supabase/
  schema.sql            Tables and RLS policies
.env.example            Required environment variables
```

## Possible next steps

- Add reference ranges and flag readings that fall outside them.
- Stream the AI reply as it is generated.
- Let users export their readings as CSV.
