## Plan: BezPitcha Admin Panel — Real Backend Integration

### Scope
Remove all mock data, integrate Lovable Cloud (Supabase) for persistence, add real Python API client with WebSocket logs, polish animations and UX feedback.

### 1. Enable Lovable Cloud + DB schema
Enable Cloud and create tables:
- `profiles` (user profile, auto-created via trigger)
- `channels` (id, user_id, name, url, description, style_prompt, created_at)
- `channel_styles` (user_id, channel_id, tone, format, examples — JSON)
- `watermark_settings` (user_id, image_url, opacity)
- `app_logs` (id, user_id, level, message, created_at) — for persisted log history
- `materials_cache` (optional — cache of last fetched materials per user, otherwise frontend just queries Python API)

RLS: each table restricted to `auth.uid() = user_id`. Storage bucket `watermarks` for PNG uploads (private, user-scoped).

### 2. Auth refactor
Replace hardcoded password (`bezpitcha.ru`) auth with Supabase email/password + Google sign-in (uses Lovable Cloud auth). Update `src/lib/auth.ts`, `AuthGate`, login page, add signup.

### 3. API layer
Create `src/lib/api-client.ts`:
- Reads `import.meta.env.VITE_API_BASE_URL` (default `http://localhost:8000`)
- Sends Supabase JWT in `Authorization: Bearer <token>` header
- Functions: `getStats()`, `getChannels()`, `createChannel()`, `deleteChannel()`, `getMaterials({status, page, channelId})`, `analyzeMaterial(id)`, `generateMaterial(id, platform)`, `getTopics()`, `getStyles()`, `updateStyle(...)`, `getWatermark()`, `uploadWatermark(file, opacity)`.
- Channels/styles/watermark also write directly to Supabase for instant UI updates; AI endpoints (`analyze`, `generate`, `topics`, `stats`, `materials`) hit Python.

Create `.env` example doc; set `VITE_API_BASE_URL` default in code via `import.meta.env`.

Delete `src/lib/mock-api.ts` entirely.

### 4. WebSocket logs
`src/lib/logs-ws.ts`: connects to `${VITE_API_BASE_URL.replace(/^http/, 'ws')}/api/logs?token=<jwt>`. Exponential backoff reconnect (1s → 30s cap). Emits to subscriber.
Logs page:
- Auto-scroll bottom only if user is already near bottom (otherwise show "↓ new messages" pill).
- Banner "Соединение потеряно, переподключение..." on disconnect.
- Color levels: info=emerald, warning=amber, error=rose. Local time format.

### 5. Pages overhaul
- **Login** (`/`): email + password form, "Sign in with Google" button, link to register. Errors via toast.
- **Dashboard**: `useQuery(['stats'])` → real numbers; skeleton while loading.
- **Channels**: list from Supabase (real-time subscription), form to add (name, url), delete button. Skeleton on load. Optimistic updates.
- **Queue**: paginated materials from Python API, filters (status, channel) as query params. Cards open detail modal.
- **Generate modal**: platform selector → calls `generateMaterial`, shows spinner with "Идёт анализ…", renders Markdown result with `react-markdown`. Copy button → toast "Скопировано!".
- **Styles**: per-channel style editor, saves to `channel_styles` table immediately.
- **Watermark**: drag-drop PNG → uploads to Supabase Storage `watermarks/${user.id}/wm.png`, opacity slider persists to `watermark_settings`. Live preview.
- **Topics**: button → spinner → list, fade-in animation.

### 6. Animations & feedback
- Route transitions: fade+slide via wrapper in `__root.tsx` using `key={location.pathname}` and existing `animate-fade-in`.
- Buttons: ensure `:hover :active :disabled` states in shared classes.
- Toasts: `sonner` for success/error globally.
- Skeleton components for lists.

### 7. Deliverables in chat
- Updated `API.md` with all endpoints (request/response samples).
- List of env vars (`VITE_API_BASE_URL` only on frontend; Python side documented).
- Preview URL.

### Technical notes
- Lovable Cloud auto-provisions `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- JWT obtained via `supabase.auth.getSession()` then forwarded to Python.
- All DB ops use the browser Supabase client with RLS.
- No service-role usage on frontend.

### Out of scope
- Implementing the Python server itself (user will do this).
- Real AI logic (frontend only orchestrates).
