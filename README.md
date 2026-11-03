# Learning Assistant

AI-powered summarization for pasted text, documents, and YouTube videos.

## Features
- Summarize pasted text and uploaded TXT, CSV, JSON, Markdown, PDF, DOC, and DOCX files.
- Summarize YouTube videos using available transcripts.
- Optionally generate key points, Q&A, and code explanations.
- Optionally save results to Supabase.

## Architecture
- React + Vite frontend.
- Express API handles Gemini and Supadata requests.
- Provider credentials are server-only and must never use a Vite `VITE_*` variable.
- Supabase URL and anon key are public client configuration; database access must be protected by RLS.

## Local development
1. Run `npm install`.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` and `SUPADATA_API_KEY`.
3. Run `npm run server` in one terminal.
4. Run `npm run dev` in another terminal.

Vite proxies `/api` requests to `http://localhost:3001`.

## Production
Deploy the Express API and Vite frontend separately or behind one reverse proxy. Configure `GEMINI_API_KEY`, `SUPADATA_API_KEY`, and `CORS_ORIGIN` on the API host. Build the frontend with `npm run build`. If the API has a separate origin, set `VITE_API_BASE_URL` at frontend build time.

## Security
- Never commit `.env` or production credentials.
- Rotate provider credentials that were previously committed to Git history.
- Never expose a Supabase service-role key in browser code.
- Apply and verify database RLS policies before enabling production persistence.
- API rate limiting is in-memory; use a shared store for multi-instance deployments.
