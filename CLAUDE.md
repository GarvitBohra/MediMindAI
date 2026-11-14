# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MediMindAI: users log vitals (heart rate, blood pressure, weight), see trends, and chat with an AI assistant that sees their latest readings. React + Vite + Tailwind v4 frontend, Supabase (Auth, Postgres, RLS), one serverless endpoint (`api/chat.js`) calling an LLM. Plain JavaScript, no TypeScript. Educational project: the assistant must stay informational (no diagnosis or prescribing).

## Commands

- `npm run dev` runs the frontend and `/api/chat` together (see below). Restart it after editing `.env`.
- `npm run build` creates a production build in `dist/`. `npm run preview` serves it (without the API).
- There is no test runner, linter or formatter configured. `npm run build` is the only automated check.
- Database setup: run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor. It is idempotent.

## Architecture

**Two data paths.** The browser talks to Supabase directly for auth and for reading/writing `vitals` and `messages`. Only chat goes through `/api/chat`, which holds the LLM credentials. Because of this, security depends on Row Level Security, not on the frontend.

**RLS and `user_id`.** Both tables have `user_id uuid default auth.uid()` and policies `auth.uid() = user_id`. Inserts from the client intentionally omit `user_id`. There are no update or delete policies, so those are denied.

**`api/chat.js` flow.** It reads the bearer token, validates the message (non-empty, max 500 chars), builds a Supabase client that forwards the user's token (so RLS applies to every query), verifies it with `auth.getUser`, loads the 5 latest vitals and 6 latest messages, calls the model, then saves both turns to `messages`. Errors are logged server-side and returned generically. A 503 or 429 from Gemini is retried once and then reported as "busy".

**Model provider switch.** If `OPENAI_BASE_URL` is a real `http(s)` URL, the endpoint uses that OpenAI-compatible server (for example LM Studio) via `/chat/completions`. Otherwise it uses Gemini (`@google/genai`). The local path only works on a developer machine, because a Vercel deployment can't reach `localhost`.

**Env vars are shared across browser and server.** `api/chat.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the same variables the browser uses, so each is set once. `GEMINI_API_KEY` and any `OPENAI_*` values are server-only and must never get a `VITE_` prefix. `.env` is gitignored. Only `.env.example` is committed.

**Dev-only API plugin.** [vite.config.js](vite.config.js) defines `localApi()` (`apply: 'serve'`), which serves `/api/chat` by loading `api/chat.js` with `server.ssrLoadModule` and shimming `res.status().json()`. This lets `npm run dev` work without the Vercel CLI. It reads `.env` once at startup. It is not part of the production build. On Vercel, `api/chat.js` runs as a normal serverless function.

**Frontend.** `main.jsx` wraps the app in `BrowserRouter` and `AuthProvider` ([src/lib/AuthContext.jsx](src/lib/AuthContext.jsx), which exposes `session` and `loading`). `App.jsx` has the `Protected` route wrapper. Styling is Tailwind with shared `.card`, `.input` and `.btn-primary` classes in [src/index.css](src/index.css). Status badges (Normal, Elevated, High) come from [src/lib/ranges.js](src/lib/ranges.js), which uses general adult ranges and is informational only.

## Gotchas

- **Gemini model IDs go stale and big Flash models get 503 "high demand".** The default is `gemini-3.1-flash-lite`, overridable with `GEMINI_MODEL`. To see what a key can use, call `GET https://generativelanguage.googleapis.com/v1beta/models?key=...` and test with a short `generateContent` request. Don't guess model names from memory.
- The `AI_Healthcare_chatbot` folder next to this repo is an older prototype (Supabase `patients` table, different env var names). Don't run its `schema.sql` against the same Supabase project. It creates a `patients` table and policy that will conflict.
- Remote: https://github.com/GarvitBohra/MediMindAI.git (branch `main`). The app has not been deployed to Vercel yet.
