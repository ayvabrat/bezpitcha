# BezPitcha Admin Panel — Backend Contract

The frontend is a static SPA. It talks to two services:

1. **Lovable Cloud (Supabase)** — authentication, channels, watermark settings, storage.
   The frontend uses the Supabase JS client directly. No work needed on Python side
   except verifying Supabase JWTs.
2. **Python API** (you implement it) — everything related to AI: stats,
   parsed materials, analysis, generation, topics, channel scan trigger, log streaming.

---

## Environment variables (frontend)

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Base URL of the Python API | `http://localhost:8000` |

`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are auto-provided by Lovable Cloud.

## Environment variables (your Python server)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | `https://sicfjticfgmiwxptxzfw.supabase.co` |
| `SUPABASE_JWT_SECRET` | from Supabase project settings — used to verify the bearer token |
| `SUPABASE_SERVICE_ROLE_KEY` | only if you need to read users' channels server-side |
| `OPENAI_API_KEY` / `LOVABLE_API_KEY` / etc | your AI provider keys |

---

## Authentication

Every request from the frontend (except OPTIONS preflight) includes:

```
Authorization: Bearer <SUPABASE_JWT>
```

Verify the JWT (`HS256`, secret = `SUPABASE_JWT_SECRET`); the user id is the
`sub` claim. Reject with `401` if missing/invalid.

WebSocket: same JWT is passed as `?token=<JWT>` in the URL query string.

CORS: allow your published origin(s) and `http://localhost:5173`. Headers: `Authorization, Content-Type`.

---

## REST endpoints

### `GET /api/stats`
Dashboard counters.

Response:
```json
{
  "parsed_total": 1247,
  "queue_count": 42,
  "published_today": 12,
  "published_week": 84,
  "rejected_total": 156
}
```

### `GET /api/materials`
Paginated parsed materials.

Query params: `page` (1-based), `limit`, `recommendation` (`publish|maybe|skip`),
`source` (channel username, e.g. `@durov`), `q` (free-text search).

Response:
```json
{
  "items": [
    {
      "id": "abc123",
      "source_name": "@durov",
      "source_type": "telegram",
      "original_text": "**Важная новость:** ...",
      "media_paths": ["https://.../image.jpg"],
      "relevance_score": 8,
      "interest_score": 9,
      "actuality_score": 7,
      "content_type": "новость",
      "platforms": ["telegram", "vk"],
      "recommendation": "publish",
      "reasoning": "Высокая актуальность",
      "parsed_at": "2026-05-08T12:34:56Z"
    }
  ],
  "total": 47
}
```

### `POST /api/materials/:id/analyze`
Triggers AI analysis. May be slow (frontend shows spinner).

Response:
```json
{ "material": { /* same Material object as above, with refreshed scores */ } }
```

### `POST /api/materials/:id/generate`
Generates platform-specific post. Returns Markdown.

Request:
```json
{ "platform": "telegram" }
```

Response:
```json
{
  "title": "Пост для telegram",
  "platform": "telegram",
  "content": "# 🚀 Заголовок\n\n**Текст** в формате Markdown..."
}
```

### `POST /api/topics`
AI-suggested post topics.

Response:
```json
{ "topics": ["Тема 1", "Тема 2", "Тема 3"] }
```

### `POST /api/channels/scan`
Called after the user adds a channel via the frontend (channel row is already
in the `channels` Supabase table). Trigger initial scan / style learning.

Request:
```json
{ "username": "@durov" }
```

Response:
```json
{ "success": true, "message": "Отсканировано 20 постов" }
```

---

## WebSocket: `WS /api/logs?token=<JWT>`

Server pushes one JSON message per log line:

```json
{ "time": "2026-05-08T12:34:56.789Z", "level": "info", "message": "🔍 Сканирование @durov..." }
```

`level ∈ {info, warning, error}`. Frontend reconnects with exponential backoff (1s → 30s).

---

## Data owned by Lovable Cloud (Supabase)

You can read these from Python via service role if needed.

### `public.channels`
- `id` uuid, `user_id` uuid (auth.users), `username` text,
  `style_description` text, `added_at` timestamptz.
- RLS: each user sees only own rows.

### `public.watermark_settings`
- `user_id` uuid PK, `image_path` text, `opacity` numeric, `updated_at`.
- Image stored in private storage bucket `watermarks/<user_id>/watermark.png`.

---

## Error responses

```json
{ "error": "Invalid platform", "message": "Платформа не поддерживается" }
```

HTTP status codes: `400` validation, `401` auth, `404` not found, `429` rate limit, `500` server.
