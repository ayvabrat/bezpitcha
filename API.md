# BezPitcha Admin Panel — API Specification

Все запросы (кроме `/api/auth/login`) должны содержать заголовок:
```
Authorization: Bearer <token>
```

## Auth

### POST /api/auth/login
Body:
```json
{ "password": "bezpitcha.ru" }
```
Response:
```json
{ "token": "<jwt>", "expires_in": 86400 }
```

## Stats

### GET /api/stats
```json
{
  "parsed_total": 1247,
  "queue_count": 47,
  "published_today": 12,
  "published_week": 84,
  "rejected_total": 156
}
```

## Channels

### GET /api/channels
```json
[
  { "id": "1", "username": "@durov", "style_description": "...", "added_at": "2025-04-12" }
]
```

### POST /api/channels/add
Body: `{ "username": "@channel" }`
Response:
```json
{ "success": true, "message": "Канал добавлен, отсканировано 20 постов",
  "channel": { "id": "...", "username": "...", "style_description": "...", "added_at": "..." } }
```

### DELETE /api/channels/:username
`{ "success": true }`

## Materials

### GET /api/materials?page=1&limit=20&recommendation=publish&source=@durov&q=text
```json
{
  "items": [{
    "id": "1",
    "source_name": "@durov",
    "source_type": "telegram",
    "original_text": "...",
    "media_paths": [],
    "relevance_score": 8,
    "interest_score": 7,
    "actuality_score": 9,
    "content_type": "новость",
    "platforms": ["telegram", "vk"],
    "recommendation": "publish",
    "reasoning": "...",
    "parsed_at": "2025-05-08T10:00:00Z"
  }],
  "total": 47
}
```

### POST /api/materials/:id/analyze
`{ "material": { ...Material } }`

### POST /api/materials/:id/generate
Body: `{ "platform": "telegram" }`
Response:
```json
{ "content": "# Заголовок\n\n**Markdown**...", "title": "...", "platform": "telegram" }
```

## Styles

### GET /api/styles
```json
[ { "channel": "@durov", "description": "..." } ]
```

### PUT /api/styles/:channel
Body: `{ "description": "..." }` → `{ "success": true }`

## Watermark

### POST /api/watermark/upload
multipart/form-data, поле `file` (PNG)
Response: `{ "filename": "wm.png", "url": "/static/wm.png" }`

### POST /api/watermark/opacity
Body: `{ "opacity": 0.5 }` → `{ "opacity": 0.5 }`

### GET /api/watermark
`{ "image_url": "/static/wm.png", "opacity": 0.5 }`

## Topics

### GET /api/topics
`["тема1", "тема2", "тема3"]`

## Logs (WebSocket)

### WS /api/logs
Сервер шлёт JSON-сообщения:
```json
{ "time": "2025-05-08T10:00:00Z", "level": "info", "message": "..." }
```
`level`: `"info" | "warning" | "error"`
