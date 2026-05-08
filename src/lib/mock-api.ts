// Mock API layer. Replace with real fetch calls when backend is ready.
// All requests should send Authorization: Bearer <token>.
import { auth } from "./auth";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

export interface Channel {
  id: string;
  username: string;
  style_description: string;
  added_at: string;
}

export interface Material {
  id: string;
  source_name: string;
  source_type: string;
  original_text: string;
  media_paths: string[];
  relevance_score: number;
  interest_score: number;
  actuality_score: number;
  content_type: string;
  platforms: string[];
  recommendation: "publish" | "maybe" | "skip";
  reasoning: string;
  parsed_at: string;
}

const channels: Channel[] = [
  { id: "1", username: "@durov", style_description: "Лаконичные посты, рассуждения о технологиях, минимум эмодзи.", added_at: "2025-04-12" },
  { id: "2", username: "@tginfo", style_description: "Новости Telegram, краткие факты, нумерованные списки.", added_at: "2025-04-20" },
  { id: "3", username: "@addmeto", style_description: "Аналитика IT-индустрии, длинные посты с цитатами.", added_at: "2025-05-01" },
];

const recs: Material["recommendation"][] = ["publish", "maybe", "skip"];
const materials: Material[] = Array.from({ length: 47 }).map((_, i) => ({
  id: String(i + 1),
  source_name: channels[i % channels.length].username,
  source_type: "telegram",
  original_text:
    "**Важная новость:** В мире технологий произошло нечто значимое. " +
    "Компании объявили о новом продукте, который может изменить индустрию. " +
    "Эксперты считают, что это повлияет на рынок в ближайшие годы. 🚀\n\n" +
    "> Это цитата из источника, подчёркивающая ключевую мысль материала.\n\n" +
    "Подробности в источнике.",
  media_paths: [],
  relevance_score: Math.floor(Math.random() * 5) + 5,
  interest_score: Math.floor(Math.random() * 5) + 5,
  actuality_score: Math.floor(Math.random() * 5) + 5,
  content_type: ["новость", "аналитика", "обзор"][i % 3],
  platforms: ["telegram", "vk", "x"].slice(0, (i % 3) + 1),
  recommendation: recs[i % 3],
  reasoning: "Высокая актуальность и интерес для целевой аудитории.",
  parsed_at: new Date(Date.now() - i * 3600_000).toISOString(),
}));

const styles = new Map(channels.map((c) => [c.username, c.style_description]));
let watermark = { image_url: "", opacity: 0.5 };

export const api = {
  async stats() {
    await delay(300);
    return {
      parsed_total: 1247,
      queue_count: materials.length,
      published_today: 12,
      published_week: 84,
      rejected_total: 156,
    };
  },
  async getChannels() { await delay(); return [...channels]; },
  async addChannel(username: string) {
    await delay(800);
    if (!username.startsWith("@")) username = "@" + username;
    const ch: Channel = { id: String(Date.now()), username, style_description: "Стиль ещё не описан.", added_at: new Date().toISOString().slice(0, 10) };
    channels.push(ch);
    styles.set(username, ch.style_description);
    return { success: true, message: "Канал добавлен, отсканировано 20 постов", channel: ch };
  },
  async deleteChannel(username: string) {
    await delay();
    const i = channels.findIndex((c) => c.username === username);
    if (i >= 0) channels.splice(i, 1);
    return { success: true };
  },
  async getMaterials(opts: { page: number; limit: number; recommendation?: string; source?: string; q?: string }) {
    await delay();
    let items = materials;
    if (opts.recommendation) items = items.filter((m) => m.recommendation === opts.recommendation);
    if (opts.source) items = items.filter((m) => m.source_name === opts.source);
    if (opts.q) items = items.filter((m) => m.original_text.toLowerCase().includes(opts.q!.toLowerCase()));
    const total = items.length;
    const start = (opts.page - 1) * opts.limit;
    return { items: items.slice(start, start + opts.limit), total };
  },
  async analyze(id: string) {
    await delay(1200);
    const m = materials.find((x) => x.id === id);
    return { material: m };
  },
  async generate(id: string, platform: string) {
    await delay(1500);
    const m = materials.find((x) => x.id === id)!;
    const content = `# 🚀 Новость для ${platform}\n\n**${m.source_name}** делится:\n\n${m.original_text}\n\n---\n\n> 💡 *Сгенерировано BezPitcha AI*\n\n#${platform} #новости #технологии`;
    return { content, title: `Пост для ${platform}`, platform };
  },
  async getStyles() {
    await delay();
    return Array.from(styles.entries()).map(([channel, description]) => ({ channel, description }));
  },
  async updateStyle(channel: string, description: string) {
    await delay();
    styles.set(channel, description);
    const ch = channels.find((c) => c.username === channel);
    if (ch) ch.style_description = description;
    return { success: true };
  },
  async uploadWatermark(file: File) {
    await delay(800);
    const url = URL.createObjectURL(file);
    watermark.image_url = url;
    return { filename: file.name, url };
  },
  async setOpacity(opacity: number) { await delay(); watermark.opacity = opacity; return { opacity }; },
  async getWatermark() { await delay(); return { ...watermark }; },
  async getTopics() {
    await delay(1500);
    return [
      "Влияние ИИ на рынок труда в 2026 году",
      "Новые возможности Telegram Mini Apps",
      "Криптовалюты и регуляция в России",
      "Edge computing: тренды и будущее",
      "Развитие отечественных LLM-моделей",
    ];
  },
};

// Mock WebSocket for logs
export type LogEntry = { time: string; level: "info" | "warning" | "error"; message: string };
export function subscribeLogs(onMessage: (log: LogEntry) => void): () => void {
  const messages = [
    { level: "info" as const, message: "🔍 Сканирование канала @durov..." },
    { level: "info" as const, message: "✅ Найдено 5 новых материалов" },
    { level: "warning" as const, message: "⚠️ Превышен лимит запросов к API" },
    { level: "info" as const, message: "🤖 Запущен AI-анализ материала #42" },
    { level: "error" as const, message: "❌ Ошибка генерации: timeout" },
    { level: "info" as const, message: "📤 Пост готов к публикации" },
  ];
  let i = 0;
  const id = setInterval(() => {
    const m = messages[i++ % messages.length];
    onMessage({ time: new Date().toISOString(), ...m });
  }, 2500);
  // Touch auth to silence linter — real impl reads token
  void auth.getToken;
  return () => clearInterval(id);
}
