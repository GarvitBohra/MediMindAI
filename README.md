# MediMindAI

MediMindAI is a web app for tracking your health readings and asking an AI assistant about them. You log your heart rate, blood pressure, blood sugar and weight, watch the trends on charts, upload lab reports (PDF) to have them explained, and chat with an assistant that can see your latest readings.

> **Disclaimer:** This is an educational project. It gives general health information only. It does not diagnose, treat or replace a doctor. In an emergency, call your local emergency number.

<!-- Add screenshots here after your first run, e.g. ![Dashboard](docs/dashboard.png) -->

## Features

- **Accounts:** sign up and log in with email and password.
- **Vitals tracking:** record heart rate, blood pressure, blood sugar (optional) and weight. Each has a status badge, its own trend chart, and a row in the history table. You can delete a reading.
- **BMI calculator:** uses your latest weight and a height you enter (the height is remembered in your browser only).
- **AI trend explanation:** one click gives a plain-language summary of your recent readings. It is not saved to your chat history.
- **Medical reports:** upload a lab or medical report as a PDF (up to 3 MB). The AI reads it, explains each value in simple language, highlights values outside the report's own reference range, and writes a summary to discuss with your doctor. Only the results are saved, never the PDF.
- **AI chat:** ask health questions. The assistant gets your five most recent readings and the last few messages as context. You can clear the conversation.
- **Saved history:** your chat history and analysed reports are stored per account.
- **Safety:** the assistant gives substantive guidance but is instructed not to give a definitive diagnosis or prescribe, and to point you to emergency services for urgent symptoms.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router, Recharts |
| Auth and database | Supabase (Auth, PostgreSQL, Row Level Security) |
| AI | Google Gemini API |
| Backend | Vercel serverless functions (`api/chat.js`, `api/report.js`) |
| Hosting | Vercel |

All of these have a free tier.

## How it works

```
Browser (React)
   ├─► Supabase ── login, and read/write your own vitals (protected by Row Level Security)
   │
   ├─► /api/chat (Vercel serverless)
   │      1. checks your login token
   │      2. validates the message
   │      3. loads your recent vitals and chat history from Supabase
   │      4. sends everything to Gemini
   │      5. saves the exchange and returns the reply
   │      (also serves the trend explanation, which loads more vitals and saves nothing)
   │
   └─► /api/report (Vercel serverless)
          1. checks your login token and that the file is a PDF under 3 MB
          2. sends the PDF to Gemini, which returns values, explanations and a summary
          3. returns cleaned-up results; the browser flags out-of-range values and saves the results
```

## Security notes

- **Row Level Security** is enabled on every table. A user can only read, insert and delete rows that belong to them. There are no update policies.
- **The Gemini API key** is used only inside the serverless function and is never sent to the browser.
- **The endpoints** return 401 without a valid login. `/api/chat` returns 400 for empty messages or messages over 500 characters, and `/api/report` rejects non-PDF files and files over 3 MB. Errors shown to the user are generic. Details are logged on the server only.
- **Reports contain sensitive data.** The PDF is sent to the Gemini API to be read and is not stored by this app. Only the extracted results are saved to your account.
- The Supabase anon key in the browser is public by design. RLS is what protects the data.

## Run locally

You need Node.js 18 or later.

1. **Create a Supabase project** (free) at [supabase.com](https://supabase.com). Open the SQL editor and run [supabase/schema.sql](supabase/schema.sql). It is safe to run again, so re-run it after pulling updates to pick up new tables and columns. For quick testing, turn off "Confirm email" under Authentication, Providers, Email.
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
   | `GEMINI_MODEL` (optional) | Overrides the default `gemini-3.1-flash-lite`. It must accept PDFs for the Reports feature |

4. **Start the app:**
   ```bash
   npm run dev
   ```
   This serves the frontend and the `/api/*` endpoints together (no Vercel CLI needed). Restart it after editing `.env`. The local-model option (`OPENAI_BASE_URL`, e.g. LM Studio) works for chat only. Report analysis needs Gemini.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it at [vercel.com](https://vercel.com). Vercel detects Vite and the `api/` folder automatically.
3. Add the environment variables from the table above in the project settings.
4. Deploy.

## Project structure

```
api/
  chat.js               Chat and trend-explanation endpoint
  report.js             PDF report analysis endpoint
src/
  main.jsx, App.jsx     Entry point and routes
  pages/                Login, Dashboard, Chat, Reports
  components/           Navbar, VitalsForm, VitalsChart, StatCard, BmiCalculator,
                        TrendInsights, ChatBox
  lib/                  Supabase client, auth context, API helper, reference ranges
supabase/
  schema.sql            Tables and RLS policies
.env.example            Required environment variables
```

## Possible next steps

- Stream the AI reply as it is generated.
- Let users export their readings as CSV.
- Support scanned reports and photos with OCR.
