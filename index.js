// ============================================================
//  🤖 طمطم بوت - Railway Edition v2.2.0
//  👨‍💻 المطور: حسن
// ============================================================

require("dotenv").config();
const express  = require("express");
const fetch    = require("node-fetch");
const FormData = require("form-data");
const cron     = require("node-cron");
const { Redis } = require("@upstash/redis");

const app  = express();
app.use(express.json());

// ══ المتغيرات ════════════════════════════════════════════════
const BOT_TOKEN        = process.env.TELEGRAM_BOT_TOKEN;
const GOOGLE_API_KEY   = process.env.GOOGLE_API_KEY;
const ADMIN_ID         = process.env.ADMIN_ID;
const BOT_USERNAME     = (process.env.BOT_USERNAME || "").toLowerCase();
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME;
const CHANNEL_USERNAME2= process.env.CHANNEL_USERNAME2;
const CHANNEL_LINK     = process.env.CHANNEL_LINK;
const CHANNEL_LINK2    = process.env.CHANNEL_LINK2;
const LEONARDO_API_KEY = process.env.LEONARDO_API_KEY;
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY;
const PORT             = process.env.PORT || 8080;
const WEBHOOK_SECRET   = process.env.WEBHOOK_SECRET || "tamtam2026";

// ══ Redis (Upstash) ══════════════════════════════════════════
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ══ إعدادات AI ════════════════════════════════════════════════
const GEMINI_API  = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_API  = "https://api.openai.com/v1";
const TELEGRAM    = "https://api.telegram.org/bot" + BOT_TOKEN;
const LEONARDO    = "https://cloud.leonardo.ai/api/rest/v1";

const GEMINI_MODELS = [
  { key: "gemini-2.5-flash-lite", id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite ⚡", provider: "gemini" },
  { key: "gemini-2.5-flash",      id: "gemini-2.5-flash",       label: "Gemini 2.5 Flash 🚀",      provider: "gemini" },
  { key: "gemini-2.0-flash",      id: "gemini-2.0-flash",       label: "Gemini 2.0 Flash 🔥",      provider: "gemini" },
  { key: "gemini-2.5-pro",        id: "gemini-2.5-pro",         label: "Gemini 2.5 Pro ⚡",         provider: "gemini" },
];

const OPENAI_MODELS = [
  { key: "gpt-4o",       id: "gpt-4o",           label: "GPT-4o 🧠",         provider: "openai" },
  { key: "gpt-4o-mini",  id: "gpt-4o-mini",      label: "GPT-4o Mini ⚡",    provider: "openai" },
  { key: "gpt-4-turbo",  id: "gpt-4-turbo",      label: "GPT-4 Turbo 🚀",    provider: "openai" },
  { key: "gpt-4",        id: "gpt-4",             label: "GPT-4 💡",          provider: "openai" },
  { key: "gpt-3.5-turbo",id: "gpt-3.5-turbo",    label: "GPT-3.5 Turbo ⚡",  provider: "openai" },
  { key: "o1-mini",      id: "o1-mini",           label: "o1 Mini 🔬",        provider: "openai" },
  { key: "o3-mini",      id: "o3-mini",           label: "o3 Mini 🔮",        provider: "openai" },
];

const CHAT_MODELS = [...GEMINI_MODELS, ...OPENAI_MODELS];

const IMAGE_MODELS = [
  { key: "nano-banana-2",      id: "gemini-3.1-flash-image-preview",  label: "🍌 Nano Banana 2",      provider: "gemini"   },
  { key: "nano-banana-pro",    id: "gemini-3-pro-image-preview",       label: "🍌 Nano Banana Pro",    provider: "gemini"   },
  { key: "nano-banana",        id: "gemini-2.5-flash-image",           label: "🍌 Nano Banana الأصلي", provider: "gemini"   },
  { key: "leonardo-kino",      id: "aa77f04e-3eec-4034-9c07-d0f619684628", label: "🎨 Leonardo Kino XL",   provider: "leonardo" },
  { key: "leonardo-lightning", id: "b24e16ff-06e3-43eb-8d33-4416c2d75876", label: "🎨 Leonardo Lightning", provider: "leonardo" },
  { key: "leonardo-phoenix",   id: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", label: "🎨 Leonardo Phoenix",   provider: "leonardo" },
];

const PERSONAS = {
  default:  "اسمك طمطم وابوك المبرمج المصري حسن. بتتكلم باللهجة المصرية بشكل طبيعي وودود. ردودك مختصرة. لو السؤال بالإنجليزي رد بالإنجليزي. لا تنادي الشخص باسمه الا لما يطلب.",
  fun:      "اسمك طمطم ابوك المبرمج المصري حسن. شخصية مرحة وعفوية بتتكلم بالمصري بخفة دم. بتضحك وبتمزح وبتحط إيموجيات كتير 😂🔥.",
  angry:    "اسمك طمطم ابوك المبرمج المصري حسن. شخصية عصبية جداً بتشتم بدون تردد. ردودك حادة ومباشرة.",
  serious:  "اسمك طمطم ابوك المبرمج المصري حسن. خبير محترف. ردودك رسمية ودقيقة بمصطلحات متخصصة.",
  egyptian: "اسمك طمطم ابوك المبرمج المصري حسن. مصري أصيل بالعامية الخالصة: يسطا، عامل إيه، والنبي، يا عم.",
  sad:      "اسمك طمطم ابوك المبرمج المصري حسن. شخصية حزينة ومتأملة وفلسفية.",
  womanizer:"اسمك طمطم الحبيب بتحب النسوان وبتعاكسهم بكلام مغري. مش روبوت، جوز وفي ونسونجي.",
  flirty:   "اسمك طمطم ابوك المبرمج المصري حسن. شخصية لطيفة ودافئة. بتمدح وبتشجع.",
  study:    "You are Tamtam, a highly intelligent AI academic assistant created by Hassan. You use deep scientific thinking to answer questions. Provide detailed, structured, and accurate academic answers. Use scientific terminology, explain step by step, and solve complex problems methodically. Adapt your language to match the user's language (Arabic/Indonesian/English).",
};

// ══ اللغات ════════════════════════════════════════════════════
const LANG_TEXTS = {
  ar: {
    welcome:     "أهلاً يا *{name}*! 🤖\nأنا طمطم، صنعني المبرمج حسن.\nاكتب /help للأوامر.",
    help_title:  "📖 *الأوامر:*",
    study_on:    "📚 تم تفعيل مود الدراسة! البوت الآن يستخدم أقوى نموذج للتفكير العميق.",
    study_off:   "✅ تم إيقاف مود الدراسة. رجعنا للوضع الطبيعي.",
    lang_select: "🌍 اختار لغتك / Choose your language / Pilih bahasa Anda:",
    search_msg:  "🔍 بدور على: ",
    news_msg:    "📰 بدور على آخر الأخبار عن: ",
  },
  en: {
    welcome:     "Hello *{name}*! 🤖\nI'm Tamtam, created by Hassan.\nType /help for commands.",
    help_title:  "📖 *Commands:*",
    study_on:    "📚 Study mode activated! Using the most powerful AI model for deep thinking.",
    study_off:   "✅ Study mode deactivated. Back to normal.",
    lang_select: "🌍 اختار لغتك / Choose your language / Pilih bahasa Anda:",
    search_msg:  "🔍 Searching for: ",
    news_msg:    "📰 Getting latest news about: ",
  },
  id: {
    welcome:     "Halo *{name}*! 🤖\nSaya Tamtam, dibuat oleh Hassan.\nKetik /help untuk perintah.",
    help_title:  "📖 *Perintah:*",
    study_on:    "📚 Mode belajar aktif! Menggunakan model AI terkuat untuk pemikiran mendalam.",
    study_off:   "✅ Mode belajar dinonaktifkan. Kembali ke normal.",
    lang_select: "🌍 اختار لغتك / Choose your language / Pilih bahasa Anda:",
    search_msg:  "🔍 Mencari: ",
    news_msg:    "📰 Mencari berita terbaru tentang: ",
  },
};

function getLang(u) { return u && u.lang ? u.lang : "ar"; }
function t(u, key) { const lang = getLang(u); return (LANG_TEXTS[lang] && LANG_TEXTS[lang][key]) || LANG_TEXTS.ar[key] || key; }

// كلمات الأخبار
const NEWS_KEYWORDS_AR = ["اخبار","أخبار","خبر","آخر الأخبار","اجدد الاخبار","ما اخر","ما أخر"];
const NEWS_KEYWORDS_EN = ["news about","latest news","what happened","current events"];
const NEWS_KEYWORDS_ID = ["berita","kabar terbaru","apa yang terjadi"];

// مود الدراسة
const STUDY_ON_KEYWORDS  = ["فعل مود الدراسة","مود الدراسة","وضع الدراسة","study mode","aktifkan belajar","mode belajar"];
const STUDY_OFF_KEYWORDS = ["ايقاف مود الدراسة","وقف الدراسة","stop study","matikan belajar"];

const DRAW_KEYWORDS   = ["ارسم","ارسملي","رسم","صمم","draw","generate image","/img"];
const SEARCH_KEYWORDS = ["ابحث عن","ابحث","ابحثلي","دورلي","فتشلي","search for","google","جوجل"];

const PERSONA_TRIGGERS = {
  fun:      ["فعل الشخصية المرحة","فعل مرح","مود المرح","fun mode"],
  angry:    ["فعل الشخصية العصبية","فعل عصبي","مود عصبي","angry mode"],
  serious:  ["فعل الشخصية الرسمية","فعل رسمي","وضع رسمي","serious mode"],
  egyptian: ["فعل الشخصية المصرية","تكلم مصري","مود مصري","egyptian mode"],
  sad:      ["فعل الشخصية الحزينة","فعل حزين","مود حزين","sad mode"],
  womanizer:["فعل النسونجي","مود نسونجي"],
  flirty:   ["فعل الشخصية اللطيفة","مود لطيف","flirty mode"],
  default:  ["ارجع للوضع الطبيعي","وضع طبيعي","فعل طبيعي","default mode"],
};

// ══ الذاكرة المؤقتة ══════════════════════════════════════════
const sessionHistory = new Map();
const userPersona    = new Map();
const activeGames    = new Map();

// ══ KV Helpers (Redis) ═══════════════════════════════════════
async function kv_get(key) {
  try { return await redis.get(key); } catch { return null; }
}
async function kv_set(key, value, ttl = null) {
  try {
    if (ttl) await redis.set(key, value, { ex: ttl });
    else await redis.set(key, value);
    return true;
  } catch { return false; }
}
async function kv_del(key) {
  try { await redis.del(key); return true; } catch { return false; }
}
async function kv_keys(prefix) {
  try {
    const keys = await redis.keys(prefix + "*");
    return keys || [];
  } catch { return []; }
}

// ══ User Helpers ══════════════════════════════════════════════
function defaultUser() {
  return {
    chatModel: "gemini-2.5-flash-lite", imageModel: "nano-banana-2",
    banned: false, isAdmin: false,
    messageCount: 0, imageCount: 0,
    dailyLimit: 100, imageLimit: 10,
    lastReset: todayDate(), persona: "default",
    joinedAt: new Date().toISOString()
  };
}

async function getUser(userId) {
  const data = await kv_get("user:" + userId);
  if (data) return typeof data === "string" ? JSON.parse(data) : data;
  return defaultUser();
}

async function saveUser(userId, data) {
  const d = { ...data }; delete d.history;
  await kv_set("user:" + userId, JSON.stringify(d));
}

async function saveUsername(userId, from) {
  if (!from || !from.username) return;
  const u = await getUser(userId);
  if (u.username !== from.username.toLowerCase()) {
    u.username = from.username.toLowerCase();
    await saveUser(userId, u);
  }
}

function todayDate() { return new Date().toISOString().split("T")[0]; }

async function isAdmin(userId) {
  if (String(userId) === String(ADMIN_ID)) return true;
  const u = await kv_get("user:" + userId);
  if (!u) return false;
  const data = typeof u === "string" ? JSON.parse(u) : u;
  return data && data.isAdmin === true;
}

async function isGroupAdmin(chatId, userId) {
  try {
    const res  = await tg("/getChatMember?chat_id=" + chatId + "&user_id=" + userId);
    const data = await res.json();
    const s    = data && data.result && data.result.status;
    return s === "administrator" || s === "creator";
  } catch { return false; }
}

async function checkDailyLimit(userId) {
  if (await isAdmin(userId)) return true;
  const u = await getUser(userId);
  if (u.lastReset !== todayDate()) {
    u.messageCount = 0; u.imageCount = 0; u.lastReset = todayDate();
    await saveUser(userId, u);
    return true;
  }
  return (u.messageCount || 0) < (u.dailyLimit || 100);
}

async function checkImageLimit(userId) {
  if (await isAdmin(userId)) return true;
  const u = await getUser(userId);
  if (u.lastReset !== todayDate()) {
    u.messageCount = 0; u.imageCount = 0; u.lastReset = todayDate();
    await saveUser(userId, u);
    return true;
  }
  return (u.imageCount || 0) < (u.imageLimit || 10);
}

async function incrementCount(userId) {
  const u = await getUser(userId);
  if (u.lastReset !== todayDate()) { u.messageCount = 0; u.imageCount = 0; u.lastReset = todayDate(); }
  u.messageCount = (u.messageCount || 0) + 1;
  await saveUser(userId, u);
}

async function incrementImageCount(userId) {
  const u = await getUser(userId);
  if (u.lastReset !== todayDate()) { u.messageCount = 0; u.imageCount = 0; u.lastReset = todayDate(); }
  u.imageCount = (u.imageCount || 0) + 1;
  await saveUser(userId, u);
}

function getChatModel(key) {
  return CHAT_MODELS.find(m => m.key === key) || GEMINI_MODELS[0];
}
function getImageModel(key) {
  return IMAGE_MODELS.find(m => m.key === key) || IMAGE_MODELS[0];
}
function getUserName(from) {
  if (!from) return "صديقي";
  return (((from.first_name || "") + " " + (from.last_name || "")).trim()) || from.username || "صديقي";
}
function getPersona(userId, u) {
  if (userPersona.has(userId)) return userPersona.get(userId);
  return (u && u.persona) || "default";
}
function getHistory(userId) {
  if (!sessionHistory.has(userId)) sessionHistory.set(userId, []);
  return sessionHistory.get(userId);
}

// ══ Telegram API ══════════════════════════════════════════════
function tg(path, body = null, method = "GET") {
  if (body) {
    return fetch(TELEGRAM + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }
  return fetch(TELEGRAM + path);
}

async function sendMsg(chatId, text, markdown = false, replyToId = null) {
  const body = { chat_id: chatId, text: text };
  if (markdown) body.parse_mode = "Markdown";
  if (replyToId) body.reply_to_message_id = replyToId;
  return tg("/sendMessage", body, "POST");
}

async function sendInlineKeyboard(chatId, text, buttons, replyToId = null) {
  const body = { chat_id: chatId, text, parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } };
  if (replyToId) body.reply_to_message_id = replyToId;
  return tg("/sendMessage", body, "POST");
}

async function answerCallback(cbId, text, showAlert = false) {
  return tg("/answerCallbackQuery", { callback_query_id: cbId, text, show_alert: showAlert }, "POST");
}

// ══ Subscription ══════════════════════════════════════════════
async function checkSubscription(userId) {
  if (!CHANNEL_USERNAME) return true;
  try {
    const res  = await tg("/getChatMember?chat_id=@" + CHANNEL_USERNAME + "&user_id=" + userId);
    const data = await res.json();
    const s    = data && data.result && data.result.status;
    return s === "member" || s === "administrator" || s === "creator";
  } catch { return true; }
}

async function checkChannel2(userId) {
  if (!CHANNEL_USERNAME2) return false;
  if (await isAdmin(userId)) return false;
  const u    = await getUser(userId);
  const msgs = u.messageCount || 0;
  const imgs = u.imageCount   || 0;
  if (msgs >= 50 || imgs >= 5) {
    try {
      const res  = await tg("/getChatMember?chat_id=@" + CHANNEL_USERNAME2 + "&user_id=" + userId);
      const data = await res.json();
      const s    = data && data.result && data.result.status;
      return !(s === "member" || s === "administrator" || s === "creator");
    } catch { return false; }
  }
  return false;
}

async function sendSubscribeMsg(chatId) {
  const link    = CHANNEL_LINK || "https://t.me/" + CHANNEL_USERNAME;
  const buttons = [[{ text: "📢 اشترك في القناة", url: link }], [{ text: "✅ تحققت", callback_data: "check_sub" }]];
  return sendInlineKeyboard(chatId, "🔒 لازم تشترك في القناة الأول!", buttons);
}

async function sendSubscribeMsg2(chatId) {
  const link    = CHANNEL_LINK2 || "https://t.me/" + CHANNEL_USERNAME2;
  const buttons = [[{ text: "📢 اشترك في القناة الثانية", url: link }], [{ text: "✅ تحققت", callback_data: "check_sub2" }]];
  return sendInlineKeyboard(chatId, "وصلت لحد معين! اشترك في قناتنا الثانية 🔒", buttons);
}

// ══ Group Filter ══════════════════════════════════════════════
function isGroupChat(msg) {
  return msg.chat.type === "group" || msg.chat.type === "supergroup";
}

function shouldReplyInGroup(msg) {
  if (msg.from && msg.from.is_bot) return false;
  const text = (msg.text || msg.caption || "").toLowerCase();
  const bot  = BOT_USERNAME;

  // أوامر الإدارة - كلمة وحدها
  const adminCmds = ["كتم","حظر","تحذير","رفع كتم","رفع حظر","/كتم","/حظر","/warn","/mute","/ban","/unmute","/unban"];
  for (const cmd of adminCmds) {
    if (text === cmd || text.startsWith(cmd + " ")) return true;
  }
  // أوامر الرسم
  const drawCmds = ["ارسم","ارسملي","رسم","صمم","draw","/img"];
  for (const cmd of drawCmds) {
    if (text.startsWith(cmd)) return true;
  }
  // منشن
  if (bot && text.includes("@" + bot)) return true;
  // ذكر الاسم
  if (text.includes("طمطم") || text.includes("طمطوم") || text.includes("احمس") || text.includes("طماطيمو")) return true;
  // الهمس
  if (text === "اهمس" || text.startsWith("اهمس ")) return true;
  // رد على رسالة البوت
  if (msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot) {
    if (bot && msg.reply_to_message.from.username) {
      return msg.reply_to_message.from.username.toLowerCase() === bot;
    }
  }
  return false;
}

// ══ Forward to Second Bot ══════════════════════════════════════
async function forwardToSecondBot(msg) {
  try {
    const cfg = await kv_get("forward_config");
    if (!cfg) return;
    const c = typeof cfg === "string" ? JSON.parse(cfg) : cfg;
    if (!c.enabled || !c.token) return;
    const base     = "https://api.telegram.org/bot" + c.token;
    const fromName = getUserName(msg.from);
    const info     = "📨 " + fromName + " (" + msg.from.id + ")";
    if (msg.text) {
      await fetch(base + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: c.chatId, text: info + "\n" + msg.text }) });
    } else if (msg.photo) {
      await fetch(base + "/sendPhoto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: c.chatId, photo: msg.photo[msg.photo.length-1].file_id, caption: info }) });
    }
  } catch {}
}

// ══ معالج الرسائل ══════════════════════════════════════════════
async function handleUpdate(msg) {
  const chatId   = msg.chat.id;
  const userId   = msg.from && msg.from.id;
  if (!userId) return;
  const text     = (msg.text || "").trim();
  const replyTo  = msg.message_id;
  const fromName = getUserName(msg.from);

  // تسجيل تلقائي
  await registerChat(msg.chat);
  await saveUsername(userId, msg.from);
  // تسجيل العضو في الجروب
  if (isGroupChat(msg)) await registerMember(msg.chat.id, msg.from);

  // تحويل رسائل الخاص
  if (!isGroupChat(msg)) await forwardToSecondBot(msg);

  // فلتر الجروب
  if (isGroupChat(msg)) {
    const adminUser = await isAdmin(userId);
    if (!adminUser && !shouldReplyInGroup(msg)) return;
  }

  // فحص الحظر
  const user = await getUser(userId);
  if (user.banned) return sendMsg(chatId, "🚫 تم حظرك من البوت.", false, replyTo);

  // /start
  if (text === "/start") return cmdStart(chatId, userId, fromName, replyTo);

  // فحص الاشتراك
  if (!await isAdmin(userId) && !await checkSubscription(userId)) return sendSubscribeMsg(chatId);

  // ══ أوامر الأدمن ════════════════════════════
  if (text === "/admin")                   return cmdAdminPanel(chatId, userId, replyTo);
  if (text === "/stats")                   return cmdStats(chatId, userId, replyTo);
  if (text === "/users")                   return cmdUsers(chatId, userId, replyTo);
  if (text.startsWith("/ban "))            return cmdBan(chatId, userId, text, replyTo);
  if (text.startsWith("/unban "))          return cmdUnban(chatId, userId, text, replyTo);
  if (text.startsWith("/broadcast "))      return cmdBroadcast(chatId, userId, text, replyTo);
  if (text.startsWith("/addadmin "))       return cmdAddAdmin(chatId, userId, text, replyTo);
  if (text.startsWith("/setlimit "))       return cmdSetLimit(chatId, userId, text, replyTo);
  if (text.startsWith("/setimagelimit "))  return cmdSetImageLimit(chatId, userId, text, replyTo);
  if (text.startsWith("/resetlimit "))     return cmdResetLimit(chatId, userId, text, replyTo);
  if (text.startsWith("/setglobalmodel ")) return cmdSetGlobalModel(chatId, userId, text, replyTo);
  if (text === "/clearallhistory")         return cmdClearAllHistory(chatId, userId, replyTo);
  if (text.startsWith("/video "))          return cmdVideo(chatId, userId, text, replyTo);
  if (text === "/models")                  return cmdModels(chatId, userId, replyTo);
  if (text === "/imgmodels")               return cmdImageModels(chatId, userId, replyTo);
  if (text.startsWith("/setmodel "))       return cmdSetModel(chatId, userId, text.replace(/^\/setmodel\s*/i,"").trim(), replyTo);
  if (text.startsWith("/setimgmodel "))    return cmdSetImageModel(chatId, userId, text.replace(/^\/setimgmodel\s*/i,"").trim(), replyTo);
  if (text.startsWith("/setforward "))     return cmdSetForward(chatId, userId, text, replyTo);
  if (text === "/stopforward")             return cmdStopForward(chatId, userId, replyTo);
  if (text === "/forwardstatus")           return cmdForwardStatus(chatId, userId, replyTo);
  if (text.startsWith("/addreply "))       return cmdAddReply(chatId, userId, msg, replyTo);
  if (text.startsWith("/delreply "))       return cmdDelReply(chatId, userId, text, replyTo);
  if (text === "/listreplies")             return cmdListReplies(chatId, userId, replyTo);
  if (text === "/listchats")               return cmdListChats(chatId, userId, replyTo);
  if (text === "/members" || text === "/الأعضاء") return cmdGroupMembers(chatId, userId, replyTo);
  if (text.startsWith("/addban "))         return cmdAddBanWord(chatId, userId, text, replyTo);
  if (text.startsWith("/delban "))         return cmdDelBanWord(chatId, userId, text, replyTo);
  if (text === "/listban")                 return cmdListBanWords(chatId, userId, replyTo);
  if (text.startsWith("/setpunish "))      return cmdSetPunishment(chatId, userId, text, replyTo);
  if (text.startsWith("/addschedule "))    return cmdAddSchedule(chatId, userId, text, replyTo);
  if (text === "/listschedules")           return cmdListSchedules(chatId, userId, replyTo);
  if (text.startsWith("/delschedule "))    return cmdDelSchedule(chatId, userId, text, replyTo);

  // ══ أوامر عامة ══════════════════════════════
  if (text === "/help")    return cmdHelp(chatId, userId, replyTo);
  if (text === "/mymodel") return cmdMyModel(chatId, userId, replyTo);
  if (text === "/reset")   return cmdReset(chatId, userId, replyTo);
  if (text === "/about")   return cmdAbout(chatId, replyTo);
  if (text === "/game" || text === "/العب")   return cmdStartGame(chatId, userId, replyTo);
  if (text === "/قلعتي" || text === "/castle") return cmdCastle(chatId, userId, replyTo);
  if (text === "/اجمع" || text === "/collect") return cmdCollect(chatId, userId, replyTo);
  if (text === "/تدريب" || text === "/train")  return cmdTrain(chatId, userId, replyTo);
  if (text.startsWith("/هجوم ") || text.startsWith("/attack ")) return cmdAttack(chatId, userId, text, replyTo);
  if (text === "/ترتيب" || text === "/leaderboard") return cmdLeaderboard(chatId, userId, replyTo);
  if (text === "/مزاجي" || text === "/profile")     return cmdProfile(chatId, userId, replyTo);
  if (text === "/صارحني" || text === "/confess")    return cmdConfess(chatId, userId, replyTo);
  if (text.startsWith("/صارحني ") || text.startsWith("/confess ")) return cmdSendConfess(chatId, userId, text, replyTo);
  if (text.startsWith("/رد ") || text.startsWith("/reply "))       return cmdReplyConfess(chatId, userId, text, replyTo);
  if (text.startsWith("/رسالة ") || text.startsWith("/msg "))      return cmdMsgDev(chatId, userId, text, fromName, replyTo);
  if (text === "/رسالة" || text === "/msg") return sendMsg(chatId, "📨 ابعت رسالة سرية للمطور:\n/رسالة [رسالتك]", false, replyTo);
  if (text.startsWith("/setavatar") || text === "/عدل صورتي") return cmdEditAvatar(chatId, userId, msg, text, replyTo);
  if (text.startsWith("/همس ") || text.startsWith("/whisper ")) return cmdWhisper(chatId, userId, text, fromName, replyTo);

  // ══ أوامر الجروب ══════════════════════════
  if (isGroupChat(msg)) {
    if ((text === "كتم" || text.startsWith("كتم ")) && msg.reply_to_message) {
      return cmdMute(chatId, userId, msg.reply_to_message, text, replyTo);
    }
    if ((text === "حظر" || text.startsWith("حظر ")) && msg.reply_to_message) {
      return cmdGroupBan(chatId, userId, msg.reply_to_message, replyTo);
    }
    if ((text === "تحذير" || text.startsWith("تحذير ")) && msg.reply_to_message) {
      return cmdWarn(chatId, userId, msg.reply_to_message, replyTo);
    }
    if ((text === "رفع كتم" || text.startsWith("رفع كتم ")) && msg.reply_to_message) {
      return cmdUnmute(chatId, userId, msg.reply_to_message, replyTo);
    }
    if ((text === "رفع حظر" || text.startsWith("رفع حظر ")) && msg.reply_to_message) {
      return cmdGroupUnban(chatId, userId, msg.reply_to_message, replyTo);
    }
    if (text === "اهمس" || text.startsWith("اهمس ")) {
      return cmdInitWhisper(chatId, userId, msg, text, fromName, replyTo);
    }
  }

  // ══ صور واردة ══════════════════════════════
  if (msg.photo || (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith("image/"))) {
    if (!await checkDailyLimit(userId)) return sendMsg(chatId, "وصلت للحد اليومي. عد غداً!", false, replyTo);
    const cap = (msg.caption || "").toLowerCase();
    const editWords = ["عدل","غير","اضف","احذف","لون","ازل","بدل","حول"];
    if (editWords.some(w => cap.startsWith(w))) return editImage(chatId, userId, msg, fromName, replyTo);
    return analyzeImage(chatId, userId, msg, fromName, replyTo);
  }
  if (msg.reply_to_message && (msg.reply_to_message.photo || (msg.reply_to_message.document && msg.reply_to_message.document.mime_type && msg.reply_to_message.document.mime_type.startsWith("image/")))) {
    const editWords = ["عدل","غير","اضف","احذف","لون","ازل","بدل","حول"];
    if (editWords.some(w => text.toLowerCase().startsWith(w))) {
      if (!await checkDailyLimit(userId)) return sendMsg(chatId, "وصلت للحد اليومي.", false, replyTo);
      return editImage(chatId, userId, msg, fromName, replyTo);
    }
  }

  // ══ صوت وارد ══════════════════════════════
  if (msg.voice || msg.audio) {
    if (!await checkDailyLimit(userId)) return sendMsg(chatId, "وصلت للحد اليومي.", false, replyTo);
    return transcribeAudio(chatId, userId, msg, replyTo);
  }

  // ══ همسة معلقة في الخاص ══════════════════
  if (!isGroupChat(msg) && text && !text.startsWith("/")) {
    const pendingKey = "whisper_pending:" + userId;
    const pending    = await kv_get(pendingKey);
    if (pending) {
      const p = typeof pending === "string" ? JSON.parse(pending) : pending;
      await kv_del(pendingKey);
      await sendTrueWhisper(p.chatId, userId, p.targetId, text, fromName);
      return sendMsg(chatId, "✅ وصلت الهمسة لـ *" + p.targetName + "* في *" + p.groupName + "* 🤫", true, replyTo);
    }
  }

  // ══ فحص الحد اليومي ══════════════════════
  if (!await checkDailyLimit(userId)) {
    const u = await getUser(userId);
    return sendMsg(chatId, "وصلت للحد اليومي (" + (u.dailyLimit||100) + " رسالة). عد غداً!", false, replyTo);
  }

  const lowerText = text.toLowerCase();

  // ══ لعبة نشطة ════════════════════════════
  if (activeGames.has(userId)) return handleGameInput(chatId, userId, text, replyTo);

  // ══ تغيير الشخصية ════════════════════════
  for (const pKey in PERSONA_TRIGGERS) {
    for (const trigger of PERSONA_TRIGGERS[pKey]) {
      if (text.includes(trigger) || lowerText.includes(trigger.toLowerCase())) {
        userPersona.set(userId, pKey);
        const u = await getUser(userId);
        u.persona = pKey;
        await saveUser(userId, u);
        const names = { default:"الطبيعية 😊", fun:"المرحة 😂", angry:"العصبية 😤", serious:"الرسمية 🎩", egyptian:"المصرية 🇪🇬", sad:"الحزينة 😔", womanizer:"النسونجي 😏", flirty:"اللطيفة 💕" };
        return sendMsg(chatId, "تمام يا " + fromName + "! تم تفعيل الشخصية " + (names[pKey]||pKey), true, replyTo);
      }
    }
  }

  // ══ الرسم ════════════════════════════════
  let isDrawReq = false, drawPrompt = text;
  for (const kw of DRAW_KEYWORDS) {
    if (text.startsWith(kw) || lowerText.startsWith(kw.toLowerCase())) {
      isDrawReq  = true;
      drawPrompt = text.slice(kw.length).trim();
      break;
    }
  }
  if (isDrawReq) {
    if (!drawPrompt) return sendMsg(chatId, "اكتب وصف الصورة بعد كلمة ارسم", false, replyTo);
    if (!await checkImageLimit(userId)) {
      const u = await getUser(userId);
      return sendMsg(chatId, "وصلت لحد الصور (" + (u.imageLimit||10) + " صورة). عد غداً!", false, replyTo);
    }
    if (await checkChannel2(userId)) return sendSubscribeMsg2(chatId);
    return generateImage(chatId, userId, drawPrompt, replyTo);
  }

  // ══ البحث ════════════════════════════════
  let isSearchReq = false, searchQuery = text;
  if (text.startsWith("/search ") || text.startsWith("/بحث ")) {
    isSearchReq = true;
    searchQuery = text.replace(/^\/(search|بحث)\s*/i, "").trim();
  } else {
    for (const kw of SEARCH_KEYWORDS) {
      if (text.startsWith(kw) || lowerText.startsWith(kw.toLowerCase())) {
        isSearchReq = true;
        searchQuery = text.slice(kw.length).replace(/^[\s:عن]*/, "").trim();
        break;
      }
    }
  }
  if (isSearchReq) {
    if (!searchQuery) return sendMsg(chatId, "اكتب ما تريد البحث عنه", false, replyTo);
    return searchWeb(chatId, userId, searchQuery, replyTo);
  }

  // ══ الردود المخصصة ════════════════════════
  const customReply = await checkCustomReplies(text);
  if (customReply) {
    await incrementCount(userId);
    return sendCustomReply(chatId, replyTo, customReply);
  }

  // ══ الكلمات المحظورة ══════════════════════
  if (isGroupChat(msg) && text) {
    const punished = await checkBannedWords(chatId, userId, text, msg, replyTo);
    if (punished) return;
  }

  // ══ فحص القناة الثانية ════════════════════
  if (await checkChannel2(userId)) return sendSubscribeMsg2(chatId);

  // ══ المحادثة الذكية ════════════════════════
  if (!text) return;
  return askGemini(chatId, userId, text, fromName, replyTo);
}

// ══ Callback Handler ══════════════════════════════════════════
async function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const data   = cb.data;
  await answerCallback(cb.id, "");

  if (data === "check_sub") {
    if (await checkSubscription(userId)) return sendMsg(chatId, "تم التحقق! اكتب /help.");
    return sendSubscribeMsg(chatId);
  }
  if (data === "check_sub2") {
    if (!await checkChannel2(userId)) return sendMsg(chatId, "تم التحقق! تقدر تكمل.");
    return sendSubscribeMsg2(chatId);
  }
  if (data.startsWith("setmodel:"))  return cmdSetModel(chatId, userId, data.replace("setmodel:",""), null);
  if (data.startsWith("setimg:"))    return cmdSetImageModel(chatId, userId, data.replace("setimg:",""), null);
  if (data.startsWith("game:"))      return handleGameCallback(chatId, userId, data, cb.message.message_id);
  if (data.startsWith("train:"))      return handleTrainCallback(chatId, userId, data);
  if (data.startsWith("wsp:"))        return handleWhisperCallback(cb);
  if (data.startsWith("lang:")) {
    const lang = data.replace("lang:", "");
    const u    = await getUser(userId);
    u.lang     = lang;
    if (!u.joinedAt) u.joinedAt = new Date().toISOString();
    await saveUser(userId, u);
    await answerCallback(cb.id, "✅");
    const fromName = getUserName(cb.from);
    const welcome  = (LANG_TEXTS[lang] && LANG_TEXTS[lang].welcome || LANG_TEXTS.ar.welcome).replace("{name}", fromName);
    return sendMsg(chatId, welcome, true);
  }
  if (data.startsWith("globalmodel:")) {
    const key = data.replace("globalmodel:", "");
    const userKeys = await kv_keys("user:");
    let count = 0;
    for (const k of userKeys) {
      const raw = await kv_get(k);
      if (raw) { const u = typeof raw === "string" ? JSON.parse(raw) : raw; u.chatModel = key; await kv_set(k, JSON.stringify(u)); count++; }
    }
    await kv_set("global_model", key);
    const model = getChatModel(key);
    return sendMsg(chatId, "✅ تم تغيير النموذج لـ *" + model.label + "* لـ *" + count + "* مستخدم.", true);
  }
}

// ══ Gemini Chat ════════════════════════════════════════════════
async function askGemini(chatId, userId, text, fromName, replyTo) {
  // chatId مهم لسياق الجروب
  const u       = await getUser(userId);
  const history = getHistory(userId);
  const persona = getPersona(userId, u);
  const lang    = getLang(u);
  const langInstructions = {
    ar: " تحدث دائماً باللغة العربية المصرية.",
    en: " Always respond in English.",
    id: " Selalu balas dalam bahasa Indonesia.",
  };
  const studyBoost  = u.studyMode ? " أنت في مود الدراسة: فكر بعمق وأجب بشكل علمي مفصل ومنظم." : "";
  // سياق الجروب لو المحادثة في جروب
  const groupCtx    = chatId && String(chatId).startsWith("-") ? await buildGroupContext(chatId) : "";
  const prompt = (PERSONAS[persona] || PERSONAS.default) + (langInstructions[lang]||"") + studyBoost + " اسم الشخص اللي بتكلمه: " + fromName + "." + groupCtx;
  await incrementCount(userId);
  // في مود الدراسة استخدم أقوى نموذج
  const modelKey = u.studyMode ? "gemini-2.5-pro" : (u.chatModel || "gemini-2.5-flash-lite");
  const model    = getChatModel(modelKey);

  // OpenAI
  if (model.provider === "openai") {
    return askOpenAI(chatId, userId, text, fromName, replyTo, model, prompt, history);
  }
  // Gemini
  return askGeminiModel(chatId, userId, text, fromName, replyTo, model, prompt, history);
}

async function askOpenAI(chatId, userId, text, fromName, replyTo, model, systemPrompt, history) {
  if (!OPENAI_API_KEY) return sendMsg(chatId, "مفيش OPENAI_API_KEY!", false, replyTo);
  try {
    // تحويل history لصيغة OpenAI
    const messages = [{ role: "system", content: systemPrompt }];
    for (const h of history) {
      if (h.role === "user")  messages.push({ role: "user",      content: h.parts[0].text });
      if (h.role === "model") messages.push({ role: "assistant", content: h.parts[0].text });
    }
    messages.push({ role: "user", content: text });
    const res = await fetch(OPENAI_API + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + OPENAI_API_KEY },
      body: JSON.stringify({ model: model.id, messages, max_tokens: 1024, temperature: 0.8 })
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " " + await res.text());
    const d     = await res.json();
    const reply = d?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("Empty");
    history.push({ role: "user",  parts: [{ text }] });
    history.push({ role: "model", parts: [{ text: reply }] });
    if (history.length > 20) history.splice(0, history.length - 20);
    return sendMsg(chatId, reply, false, replyTo);
  } catch (e) {
    console.error("OpenAI error:", e.message);
    return sendMsg(chatId, "❌ OpenAI فشل: " + e.message, false, replyTo);
  }
}

async function askGeminiModel(chatId, userId, text, fromName, replyTo, model, prompt, history) {
  history.push({ role: "user", parts: [{ text }] });
  if (history.length > 20) history.splice(0, history.length - 20);
  const allModels = [model, ...GEMINI_MODELS.filter(m => m.key !== model.key)];
  for (let i = 0; i < allModels.length; i++) {
    const m = allModels[i];
    try {
      const res = await fetch(GEMINI_API + "/models/" + m.id + ":generateContent?key=" + GOOGLE_API_KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: prompt }] },
          contents: history,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.8 }
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const d     = await res.json();
      const reply = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) throw new Error("Empty");
      history.push({ role: "model", parts: [{ text: reply }] });
      return sendMsg(chatId, reply, false, replyTo);
    } catch (e) {
      if (i === allModels.length - 1) { history.pop(); return sendMsg(chatId, "معلش في مشكلة. حاول تاني.", false, replyTo); }
    }
  }
}

// ══ Search ════════════════════════════════════════════════════
async function searchWeb(chatId, userId, query, replyTo) {
  await incrementCount(userId);
  const u    = await getUser(userId);
  const lang = getLang(u);
  const searchMsg = t(u, "search_msg") + query;
  await sendMsg(chatId, searchMsg, false, replyTo);
  const sysPrompts = {
    ar: "ابحث وأجب باختصار بالعربية مع ذكر المصادر.",
    en: "Search and answer concisely in English with sources.",
    id: "Cari dan jawab secara ringkas dalam bahasa Indonesia dengan sumber.",
  };
  try {
    const res = await fetch(GEMINI_API + "/models/gemini-2.5-flash:generateContent?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sysPrompts[lang] || sysPrompts.ar }] },
        contents: [{ parts: [{ text: query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 1024 }
      })
    });
    const data  = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const reply = parts.map(p => p.text || "").join("").trim();
    if (!reply) throw new Error("Empty");
    const prefixes = { ar: "🔍 *النتيجة:*", en: "🔍 *Result:*", id: "🔍 *Hasil:*" };
    return sendMsg(chatId, (prefixes[lang]||prefixes.ar) + "\n\n" + reply, true, replyTo);
  } catch { return sendMsg(chatId, "مش قادر أبحث دلوقتي.", false, replyTo); }
}

async function searchNews(chatId, userId, query, replyTo) {
  await incrementCount(userId);
  const u    = await getUser(userId);
  const lang = getLang(u);
  const newsMsg = t(u, "news_msg") + query;
  await sendMsg(chatId, newsMsg, false, replyTo);
  const sysPrompts = {
    ar: "أنت محرر أخبار. ابحث عن أحدث الأخبار المتعلقة بالموضوع وقدم ملخصاً إخبارياً واضحاً ومحدثاً بالعربية مع ذكر المصادر والتواريخ.",
    en: "You are a news editor. Search for the latest news about the topic and provide a clear, updated news summary in English with sources and dates.",
    id: "Anda adalah editor berita. Cari berita terbaru tentang topik ini dan berikan ringkasan berita yang jelas dalam bahasa Indonesia dengan sumber dan tanggal.",
  };
  try {
    const res = await fetch(GEMINI_API + "/models/gemini-2.5-flash:generateContent?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sysPrompts[lang] || sysPrompts.ar }] },
        contents: [{ parts: [{ text: "اجلب أحدث الأخبار عن: " + query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 2048 }
      })
    });
    const data  = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const reply = parts.map(p => p.text || "").join("").trim();
    if (!reply) throw new Error("Empty");
    const prefixes = { ar: "📰 *آخر الأخبار:*", en: "📰 *Latest News:*", id: "📰 *Berita Terbaru:*" };
    return sendMsg(chatId, (prefixes[lang]||prefixes.ar) + "\n\n" + reply, true, replyTo);
  } catch (e) {
    const errMsgs = { ar: "مش قادر أجيب الأخبار دلوقتي.", en: "Can't fetch news right now.", id: "Tidak bisa mengambil berita sekarang." };
    return sendMsg(chatId, errMsgs[lang]||errMsgs.ar, false, replyTo);
  }
}

// ══ Image Generation ══════════════════════════════════════════
async function generateImage(chatId, userId, prompt, replyTo) {
  const u        = await getUser(userId);
  const modelKey = u.imageModel || "nano-banana-2";
  const model    = getImageModel(modelKey);
  await incrementImageCount(userId);
  await sendMsg(chatId, "🎨 بارسم...", false, replyTo);

  if (model.provider === "leonardo") {
    return generateImageLeonardo(chatId, prompt, model, replyTo);
  }
  return generateImageGemini(chatId, prompt, modelKey, replyTo);
}

async function generateImageLeonardo(chatId, prompt, model, replyTo) {
  if (!LEONARDO_API_KEY) return sendMsg(chatId, "مفيش LEONARDO_API_KEY!", false, replyTo);
  try {
    const genRes = await fetch(LEONARDO + "/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "authorization": "Bearer " + LEONARDO_API_KEY },
      body: JSON.stringify({ modelId: model.id, prompt, num_images: 1, width: 1024, height: 1024, alchemy: true })
    });
    const genData = await genRes.json();
    const genId   = genData?.sdGenerationJob?.generationId;
    if (!genId) throw new Error("No generation ID");
    let imageUrl = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await fetch(LEONARDO + "/generations/" + genId, { headers: { "authorization": "Bearer " + LEONARDO_API_KEY } });
      const pd   = await poll.json();
      const imgs = pd?.generations_by_pk?.generated_images;
      if (imgs && imgs[0]?.url) { imageUrl = imgs[0].url; break; }
    }
    if (!imageUrl) throw new Error("Timeout");
    const body = { chat_id: chatId, photo: imageUrl, caption: "🎨 " + prompt };
    if (replyTo) body.reply_to_message_id = replyTo;
    return tg("/sendPhoto", body, "POST");
  } catch (e) { return sendMsg(chatId, "فشل Leonardo: " + e.message, false, replyTo); }
}

async function generateImageGemini(chatId, prompt, modelKey, replyTo) {
  const allModels = [getImageModel(modelKey), ...IMAGE_MODELS.filter(m => m.key !== modelKey && m.provider === "gemini")];
  for (let i = 0; i < allModels.length; i++) {
    const model = allModels[i];
    try {
      const res = await fetch(GEMINI_API + "/models/" + model.id + ":generateContent?key=" + GOOGLE_API_KEY, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Create a detailed artistic illustration of: " + prompt + ". Style: photorealistic digital art, high quality." }] }],
          generationConfig: { responseModalities: ["Text", "Image"] },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data  = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
      if (!imgPart) throw new Error("No image");
      const buf  = Buffer.from(imgPart.inlineData.data, "base64");
      const ext  = imgPart.inlineData.mimeType.split("/")[1] || "png";
      const form = new FormData();
      form.append("chat_id", chatId.toString());
      form.append("photo", buf, { filename: "image." + ext, contentType: imgPart.inlineData.mimeType });
      form.append("caption", prompt);
      if (replyTo) form.append("reply_to_message_id", replyTo.toString());
      return fetch(TELEGRAM + "/sendPhoto", { method: "POST", body: form });
    } catch (e) {
      if (i === allModels.length - 1) return sendMsg(chatId, "مش قادر أرسم. تأكد من Image API.", false, replyTo);
    }
  }
}

// ══ Video ══════════════════════════════════════════════════════
async function cmdVideo(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const prompt = text.replace(/^\/video\s*/i, "").trim();
  if (!prompt) return sendMsg(chatId, "/video [وصف]", false, replyTo);
  await sendMsg(chatId, "🎬 جاري إنشاء الفيديو...", false, replyTo);
  try {
    const res  = await fetch(GEMINI_API + "/models/veo-2.0-generate-001:predictLongRunning?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "16:9", durationSeconds: 5 } })
    });
    const data = await res.json();
    if (!data.name) return sendMsg(chatId, "تأكد من تفعيل Veo API.", false, replyTo);
    // Polling لانتظار الفيديو
    await sendMsg(chatId, "⏳ بستنى الفيديو يتولد (بياخد 2-3 دقائق)...", false, replyTo);
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const poll = await fetch(GEMINI_API + "/" + data.name + "?key=" + GOOGLE_API_KEY);
      const pd   = await poll.json();
      if (pd.done) {
        const videoUri = pd?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (videoUri) {
          const body = { chat_id: chatId, video: videoUri, caption: prompt };
          if (replyTo) body.reply_to_message_id = replyTo;
          return tg("/sendVideo", body, "POST");
        }
        return sendMsg(chatId, "تم ولكن مفيش رابط للفيديو.", false, replyTo);
      }
    }
    return sendMsg(chatId, "انتهت مدة الانتظار. حاول تاني.", false, replyTo);
  } catch (e) { return sendMsg(chatId, "فشل: " + e.message, false, replyTo); }
}

// ══ Analyze Image ══════════════════════════════════════════════
async function analyzeImage(chatId, userId, msg, fromName, replyTo) {
  await incrementCount(userId);
  await sendMsg(chatId, "بشوف الصورة...", false, replyTo);
  const fileId = msg.photo ? msg.photo[msg.photo.length-1].file_id : msg.document.file_id;
  const question = msg.caption || "صف الصورة دي بالتفصيل بالعربي المصري";
  try {
    const fRes  = await tg("/getFile?file_id=" + fileId);
    const fData = await fRes.json();
    const path  = fData.result?.file_path;
    if (!path) throw new Error("No path");
    const imgRes = await fetch("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + path);
    const buf    = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buf.toString("base64");
    const mime   = path.endsWith(".png") ? "image/png" : "image/jpeg";
    const u      = await getUser(userId);
    const model  = getChatModel(u.chatModel);
    const res    = await fetch(GEMINI_API + "/models/" + model.id + ":generateContent?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }, { inline_data: { mime_type: mime, data: base64 } }] }]
      })
    });
    const data  = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("Empty");
    return sendMsg(chatId, reply, false, replyTo);
  } catch (e) { return sendMsg(chatId, "مش قادر أشوف الصورة: " + e.message, false, replyTo); }
}

// ══ Edit Image ════════════════════════════════════════════════
async function editImage(chatId, userId, msg, fromName, replyTo) {
  await incrementCount(userId);
  await sendMsg(chatId, "بعدل الصورة...", false, replyTo);
  const instruction = (msg.caption || msg.text || "عدل الصورة");
  const repMsg = msg.reply_to_message || msg;
  const photo  = repMsg.photo ? repMsg.photo[repMsg.photo.length-1] : repMsg.document;
  if (!photo) return sendMsg(chatId, "أرسل الصورة مع التعليمات.", false, replyTo);
  try {
    const fRes   = await tg("/getFile?file_id=" + photo.file_id);
    const fData  = await fRes.json();
    const path   = fData.result?.file_path;
    const imgRes = await fetch("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + path);
    const buf    = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buf.toString("base64");
    const mime   = path.endsWith(".png") ? "image/png" : "image/jpeg";
    const editModels = ["gemini-3.1-flash-image-preview","gemini-3-pro-image-preview","gemini-2.5-flash-image"];
    for (const modelId of editModels) {
      try {
        const res = await fetch(GEMINI_API + "/models/" + modelId + ":generateContent?key=" + GOOGLE_API_KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Edit this image: " + instruction }, { inline_data: { mime_type: mime, data: base64 } }] }],
            generationConfig: { responseModalities: ["Text", "Image"] }
          })
        });
        if (!res.ok) continue;
        const data    = await res.json();
        const parts   = data?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
        if (!imgPart) continue;
        const outBuf = Buffer.from(imgPart.inlineData.data, "base64");
        const ext    = imgPart.inlineData.mimeType.split("/")[1] || "png";
        const form   = new FormData();
        form.append("chat_id", chatId.toString());
        form.append("photo", outBuf, { filename: "edited." + ext, contentType: imgPart.inlineData.mimeType });
        form.append("caption", "تم التعديل!");
        if (replyTo) form.append("reply_to_message_id", replyTo.toString());
        return fetch(TELEGRAM + "/sendPhoto", { method: "POST", body: form });
      } catch {}
    }
    return sendMsg(chatId, "مش قادر أعدل الصورة.", false, replyTo);
  } catch (e) { return sendMsg(chatId, "فشل: " + e.message, false, replyTo); }
}

// ══ Transcribe Audio ══════════════════════════════════════════
async function transcribeAudio(chatId, userId, msg, replyTo) {
  await incrementCount(userId);
  const fromName = getUserName(msg.from);
  const u        = await getUser(userId);
  await sendMsg(chatId, "🎤 بسمع الصوت...", false, replyTo);
  const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;
  try {
    const fRes   = await tg("/getFile?file_id=" + fileId);
    const fData  = await fRes.json();
    const path   = fData.result?.file_path;
    const audRes = await fetch("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + path);
    const buf    = Buffer.from(await audRes.arrayBuffer());
    const base64 = buf.toString("base64");

    // خطوة 1: التفريغ
    const transcribeRes = await fetch(GEMINI_API + "/models/gemini-2.5-flash:generateContent?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "فرّغ هذا الصوت وحوّله إلى نص بدقة بدون أي إضافات." },
          { inline_data: { mime_type: "audio/ogg", data: base64 } }
        ]}]
      })
    });
    const transcribeData = await transcribeRes.json();
    const transcript     = transcribeData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!transcript) throw new Error("Empty transcript");

    // إرسال النص المفرَّغ
    await sendMsg(chatId, "🎤 *النص:*\n" + transcript, true, replyTo);

    // خطوة 2: الرد على المحتوى
    const persona   = getPersona(userId, u);
    const lang      = getLang(u);
    const langInst  = { ar: " رد بالعربية.", en: " Reply in English.", id: " Balas dalam bahasa Indonesia." };
    const groupCtx  = isGroupChat(msg) ? await buildGroupContext(chatId) : "";
    const prompt    = (PERSONAS[persona] || PERSONAS.default) + (langInst[lang]||"") + " اسم الشخص: " + fromName + "." + groupCtx;
    const history   = getHistory(userId);
    history.push({ role: "user", parts: [{ text: "[رسالة صوتية]: " + transcript }] });
    if (history.length > 20) history.splice(0, history.length - 20);
    const model     = getChatModel(u.chatModel || "gemini-2.5-flash-lite");
    const replyRes  = await fetch(GEMINI_API + "/models/" + model.id + ":generateContent?key=" + GOOGLE_API_KEY, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompt }] },
        contents: history,
        generationConfig: { maxOutputTokens: 1024 }
      })
    });
    if (!replyRes.ok) return;
    const replyData = await replyRes.json();
    const aiReply   = replyData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiReply) return;
    history.push({ role: "model", parts: [{ text: aiReply }] });
    return sendMsg(chatId, aiReply, false, replyTo);
  } catch (e) {
    console.error("transcribeAudio:", e);
    return sendMsg(chatId, "مش قادر أفرّغ الصوت: " + e.message, false, replyTo);
  }
}

// ══ Admin Commands ════════════════════════════════════════════
async function cmdAdminPanel(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keys = await kv_keys("user:");
  const msg = [
    "🔐 *لوحة الأدمن*",
    "👥 " + keys.length + " مستخدم\n",
    "📊 /stats | 👥 /users",
    "🚫 /ban [id] | ✅ /unban [id]",
    "📢 /broadcast [نص]",
    "👑 /addadmin [id]",
    "📊 /setlimit [id] [عدد]",
    "🖼 /setimagelimit [id] [عدد]",
    "♾️ /resetlimit [id]",
    "🌍 /setglobalmodel [key]",
    "🗑️ /clearallhistory",
    "💬 /models | 🍌 /imgmodels",
    "🎬 /video [وصف]",
    "📨 /setforward [توكن] [id]",
    "🛑 /stopforward | 📡 /forwardstatus",
    "🎯 /addreply [كلمة] [نص]",
    "📋 /listreplies | 🗑️ /delreply [كلمة]",
    "🚫 /addban [كلمة] [warn/mute/ban/kick]",
    "📋 /listban | 🗑️ /delban [كلمة]",
    "⚡ /setpunish [warn/mute/ban/kick]",
    "⏰ /addschedule [all/chat_id] [ساعات] [رسالة]",
    "📋 /listschedules | 🗑️ /delschedule [id]",
    "💬 /listchats",
  ].join("\n");
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdStats(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keys = await kv_keys("user:");
  let banned = 0, msgs = 0, imgs = 0;
  for (const k of keys) {
    const u = await kv_get(k);
    if (u) {
      const d = typeof u === "string" ? JSON.parse(u) : u;
      if (d.banned) banned++;
      msgs += d.messageCount || 0;
      imgs += d.imageCount || 0;
    }
  }
  return sendMsg(chatId, "📊 *الإحصائيات:*\n\n👥 المستخدمين: *" + keys.length + "*\n🚫 المحظورين: *" + banned + "*\n💬 الرسائل: *" + msgs + "*\n🖼 الصور: *" + imgs + "*", true, replyTo);
}

async function cmdUsers(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keys = await kv_keys("user:");
  if (!keys.length) return sendMsg(chatId, "مفيش مستخدمين.", false, replyTo);
  let msg = "👥 *المستخدمين:*\n\n";
  let count = 0;
  for (const k of keys) {
    count++;
    const uid = k.replace("user:", "");
    const raw = await kv_get(k);
    const u   = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
    msg += count + ". `" + uid + "` " + (u.banned ? "🚫" : "✅") + (u.isAdmin ? " 👑" : "") + " | 💬" + (u.messageCount||0) + "/" + (u.dailyLimit||100) + " | 🖼" + (u.imageCount||0) + "/" + (u.imageLimit||10) + "\n";
    if (count % 20 === 0) { await sendMsg(chatId, msg, true); msg = ""; }
  }
  if (msg) return sendMsg(chatId, msg, true, replyTo);
}

async function cmdBan(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const tid = text.replace(/^\/ban\s*/i, "").trim();
  if (!tid) return sendMsg(chatId, "/ban [user_id]", false, replyTo);
  if (tid === String(ADMIN_ID)) return sendMsg(chatId, "مش ممكن تحظر الأدمن!", false, replyTo);
  const u = await getUser(Number(tid)); u.banned = true; await saveUser(Number(tid), u);
  try { await sendMsg(Number(tid), "تم حظرك من البوت."); } catch {}
  return sendMsg(chatId, "تم حظر `" + tid + "`.", true, replyTo);
}

async function cmdUnban(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const tid = text.replace(/^\/unban\s*/i, "").trim();
  if (!tid) return sendMsg(chatId, "/unban [user_id]", false, replyTo);
  const u = await getUser(Number(tid)); u.banned = false; await saveUser(Number(tid), u);
  try { await sendMsg(Number(tid), "تم رفع الحظر عنك!"); } catch {}
  return sendMsg(chatId, "تم رفع الحظر عن `" + tid + "`.", true, replyTo);
}

async function cmdBroadcast(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const message = text.replace(/^\/broadcast\s*/i, "").trim();
  if (!message) return sendMsg(chatId, "/broadcast [نص]", false, replyTo);
  await sendMsg(chatId, "جاري الإرسال...", false, replyTo);
  const keys = await kv_keys("user:");
  let ok = 0, fail = 0;
  for (const k of keys) {
    const uid = k.replace("user:", "");
    if (!uid || isNaN(Number(uid))) continue;
    try {
      const raw = await kv_get(k);
      const u   = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
      if (u.banned) continue;
      await sendMsg(Number(uid), "📢 *من الإدارة:*\n\n" + message, true);
      ok++;
      // تأخير بسيط لتجنب Telegram rate limit
      if (ok % 20 === 0) await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error("Broadcast fail for " + uid + ":", e.message);
      fail++;
    }
  }
  return sendMsg(chatId, "✅ اتبعت لـ *" + ok + "* | فشل *" + fail + "*", true, replyTo);
}

async function cmdAddAdmin(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const tid = text.replace(/^\/addadmin\s*/i, "").trim();
  const u   = await getUser(Number(tid)); u.isAdmin = true; await saveUser(Number(tid), u);
  try { await sendMsg(Number(tid), "اتعينت أدمن!"); } catch {}
  return sendMsg(chatId, "`" + tid + "` بقى أدمن.", true, replyTo);
}

async function cmdSetLimit(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const parts = text.replace(/^\/setlimit\s*/i, "").trim().split(" ");
  if (parts.length < 2) return sendMsg(chatId, "/setlimit [id] [عدد]", false, replyTo);
  const u = await getUser(Number(parts[0])); u.dailyLimit = parseInt(parts[1]); await saveUser(Number(parts[0]), u);
  return sendMsg(chatId, "تم! حد `" + parts[0] + "` = *" + parts[1] + "*", true, replyTo);
}

async function cmdSetImageLimit(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const parts = text.replace(/^\/setimagelimit\s*/i, "").trim().split(" ");
  if (parts.length < 2) return sendMsg(chatId, "/setimagelimit [id] [عدد]", false, replyTo);
  const u = await getUser(Number(parts[0])); u.imageLimit = parseInt(parts[1]); await saveUser(Number(parts[0]), u);
  return sendMsg(chatId, "تم! حد صور `" + parts[0] + "` = *" + parts[1] + "*", true, replyTo);
}

async function cmdResetLimit(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const tid = text.replace(/^\/resetlimit\s*/i, "").trim();
  const u   = await getUser(Number(tid)); u.dailyLimit = 999999; u.imageLimit = 999999; await saveUser(Number(tid), u);
  return sendMsg(chatId, "`" + tid + "` غير محدود.", true, replyTo);
}

async function cmdSetGlobalModel(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "🚫 للأدمن بس.", false, replyTo);
  const key   = text.replace(/^\/setglobalmodel\s*/i, "").trim();
  const model = getChatModel(key);
  if (!key) {
    // عرض قائمة لو مش في key
    const buttons = [
      ...GEMINI_MODELS.map(m => [{ text: m.label, callback_data: "globalmodel:" + m.key }]),
      ...OPENAI_MODELS.map(m => [{ text: m.label, callback_data: "globalmodel:" + m.key }]),
    ];
    return sendInlineKeyboard(chatId, "🌍 اختار النموذج للكل:", buttons);
  }
  const userKeys = await kv_keys("user:");
  let count = 0;
  for (const k of userKeys) {
    const raw = await kv_get(k);
    if (raw) {
      const u = typeof raw === "string" ? JSON.parse(raw) : raw;
      u.chatModel = key;
      await kv_set(k, JSON.stringify(u));
      count++;
    }
  }
  // حفظ النموذج الافتراضي العام
  await kv_set("global_model", key);
  return sendMsg(chatId, "✅ تم تغيير النموذج لـ *" + model.label + "* لـ *" + count + "* مستخدم.", true, replyTo);
}

async function cmdClearAllHistory(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  sessionHistory.clear(); userPersona.clear(); activeGames.clear();
  return sendMsg(chatId, "تم مسح كل السجلات!", false, replyTo);
}

async function cmdModels(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "🚫 للأدمن بس - أنت مش مسموحلك تغير النموذج.", false, replyTo);
  let msg = "💬 *نماذج المحادثة:*\n\n";
  msg += "🤖 *Gemini:*\n";
  GEMINI_MODELS.forEach(m => { msg += "• " + m.label + " — `" + m.key + "`\n"; });
  msg += "\n🧠 *ChatGPT (OpenAI):*\n";
  OPENAI_MODELS.forEach(m => { msg += "• " + m.label + " — `" + m.key + "`\n"; });
  const buttons = [
    ...GEMINI_MODELS.map(m => [{ text: m.label, callback_data: "setmodel:" + m.key }]),
    ...OPENAI_MODELS.map(m => [{ text: m.label, callback_data: "setmodel:" + m.key }]),
  ];
  return sendInlineKeyboard(chatId, msg + "\nاضغط للاختيار:", buttons);
}

async function cmdImageModels(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const buttons = IMAGE_MODELS.map(m => [{ text: m.label, callback_data: "setimg:" + m.key }]);
  return sendInlineKeyboard(chatId, "🍌 *نماذج الصور:*\n\nاضغط للاختيار:", buttons);
}

async function cmdSetModel(chatId, userId, key, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "🚫 تغيير النموذج للأدمن بس.", false, replyTo);
  if (!key) return cmdModels(chatId, userId, replyTo);
  const u = await getUser(userId); u.chatModel = key; await saveUser(userId, u);
  sessionHistory.delete(userId);
  return sendMsg(chatId, "النموذج: *" + getChatModel(key).label + "*", true, replyTo);
}

async function cmdSetImageModel(chatId, userId, key, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  if (!key) return cmdImageModels(chatId, userId, replyTo);
  const u = await getUser(userId); u.imageModel = key; await saveUser(userId, u);
  return sendMsg(chatId, "نموذج الصور: *" + getImageModel(key).label + "*", true, replyTo);
}

async function cmdSetForward(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const parts = text.replace(/^\/setforward\s*/i, "").trim().split(" ");
  if (parts.length < 2) return sendMsg(chatId, "/setforward [توكن] [chat_id]", false, replyTo);
  try {
    const check = await fetch("https://api.telegram.org/bot" + parts[0] + "/getMe");
    const data  = await check.json();
    if (!data.ok) return sendMsg(chatId, "التوكن خاطئ!", false, replyTo);
    await kv_set("forward_config", JSON.stringify({ enabled: true, token: parts[0], chatId: parts[1] }));
    return sendMsg(chatId, "تم تفعيل التحويل للبوت: " + data.result.first_name, false, replyTo);
  } catch { return sendMsg(chatId, "فشل التحقق.", false, replyTo); }
}

async function cmdStopForward(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  await kv_set("forward_config", JSON.stringify({ enabled: false, token: "", chatId: "" }));
  return sendMsg(chatId, "تم إيقاف التحويل.", false, replyTo);
}

async function cmdForwardStatus(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const cfg = await kv_get("forward_config");
  if (!cfg) return sendMsg(chatId, "التحويل: معطل", false, replyTo);
  const c = typeof cfg === "string" ? JSON.parse(cfg) : cfg;
  if (!c.enabled) return sendMsg(chatId, "التحويل: معطل", false, replyTo);
  return sendMsg(chatId, "التحويل: مفعل | ID: " + c.chatId, false, replyTo);
}

// ══ Custom Replies ════════════════════════════════════════════
async function checkCustomReplies(text) {
  try {
    const keys  = await kv_keys("reply:");
    const lower = text.toLowerCase();
    for (const k of keys) {
      const raw = await kv_get(k);
      if (!raw) continue;
      const reply = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (reply.keyword && lower.includes(reply.keyword.toLowerCase())) return reply;
    }
  } catch {}
  return null;
}

async function sendCustomReply(chatId, replyTo, reply) {
  if (reply.type === "text") return sendMsg(chatId, reply.value, false, replyTo);
  const body = { chat_id: chatId };
  if (replyTo) body.reply_to_message_id = replyTo;
  if (reply.type === "sticker")   { body.sticker   = reply.value; return tg("/sendSticker",   body, "POST"); }
  if (reply.type === "photo")     { body.photo      = reply.value; body.caption = reply.caption||""; return tg("/sendPhoto", body, "POST"); }
  if (reply.type === "animation") { body.animation  = reply.value; return tg("/sendAnimation", body, "POST"); }
  if (reply.type === "voice")     { body.voice      = reply.value; return tg("/sendVoice",     body, "POST"); }
}

async function cmdAddReply(chatId, userId, msg, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const text    = (msg.text || "").trim();
  const parts   = text.replace(/^\/addreply\s*/i, "").split(" ");
  const keyword = parts[0];
  if (!keyword) return sendMsg(chatId, "/addreply [كلمة] [نص]", false, replyTo);
  let replyData = null;
  if (msg.reply_to_message) {
    const rep = msg.reply_to_message;
    if (rep.sticker)        replyData = { type: "sticker",   value: rep.sticker.file_id };
    else if (rep.photo)     replyData = { type: "photo",     value: rep.photo[rep.photo.length-1].file_id };
    else if (rep.animation) replyData = { type: "animation", value: rep.animation.file_id };
    else if (rep.voice)     replyData = { type: "voice",     value: rep.voice.file_id };
    else if (rep.text)      replyData = { type: "text",      value: rep.text };
  }
  if (!replyData && parts.length > 1) replyData = { type: "text", value: parts.slice(1).join(" ") };
  if (!replyData) return sendMsg(chatId, "اكتب نص بعد الكلمة أو رد على ملصق/صورة", false, replyTo);
  replyData.keyword = keyword;
  await kv_set("reply:" + keyword.toLowerCase(), JSON.stringify(replyData));
  return sendMsg(chatId, "تم! الكلمة: " + keyword, false, replyTo);
}

async function cmdDelReply(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keyword = text.replace(/^\/delreply\s*/i, "").trim();
  await kv_del("reply:" + keyword.toLowerCase());
  return sendMsg(chatId, "تم حذف رد: " + keyword, false, replyTo);
}

async function cmdListReplies(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keys = await kv_keys("reply:");
  if (!keys.length) return sendMsg(chatId, "مفيش ردود مخصصة.", false, replyTo);
  let msg = "🎯 *الردود المخصصة:*\n\n";
  let cnt = 1;
  for (const k of keys) {
    const raw = await kv_get(k);
    if (raw) {
      const r = typeof raw === "string" ? JSON.parse(raw) : raw;
      msg += cnt + ". *" + r.keyword + "* - " + r.type + "\n";
      cnt++;
    }
  }
  return sendMsg(chatId, msg, true, replyTo);
}

// ══ Banned Words ══════════════════════════════════════════════
async function checkBannedWords(chatId, userId, text, msg, replyTo) {
  if (await isAdmin(userId)) return false;
  try {
    const raw  = await kv_get("banwords:" + chatId);
    if (!raw) return false;
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data.words || !data.words.length) return false;
    const lower = text.toLowerCase();
    for (const entry of data.words) {
      if (lower.includes(entry.word.toLowerCase())) {
        await applyPunishment(chatId, userId, msg, entry.punishment || data.defaultPunishment || "warn", entry.word);
        return true;
      }
    }
  } catch {}
  return false;
}

async function applyPunishment(chatId, userId, msg, punishment, word) {
  try { await tg("/deleteMessage", { chat_id: chatId, message_id: msg.message_id }, "POST"); } catch {}
  const name = getUserName(msg.from);
  if (punishment === "warn") {
    const warnKey = "warn:" + chatId + ":" + userId;
    const raw     = await kv_get(warnKey);
    let warns     = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw).count || 0 : 0;
    warns++;
    await kv_set(warnKey, JSON.stringify({ count: warns }));
    if (warns >= 3) {
      await tg("/banChatMember", { chat_id: chatId, user_id: userId }, "POST");
      await kv_set(warnKey, JSON.stringify({ count: 0 }));
      return sendMsg(chatId, "🚫 *" + name + "* وصل لـ 3 تحذيرات وتم حظره! (كلمة: " + word + ")", true);
    }
    return sendMsg(chatId, "⚠️ *" + name + "* تحذير! التحذيرات: *" + warns + "/3*", true);
  }
  if (punishment === "mute") {
    const until = Math.floor(Date.now() / 1000) + 3600;
    await tg("/restrictChatMember", { chat_id: chatId, user_id: userId, until_date: until, permissions: { can_send_messages: false } }, "POST");
    return sendMsg(chatId, "🔇 *" + name + "* تم كتمه ساعة!", true);
  }
  if (punishment === "ban") {
    await tg("/banChatMember", { chat_id: chatId, user_id: userId }, "POST");
    return sendMsg(chatId, "🚫 *" + name + "* تم حظره!", true);
  }
  if (punishment === "kick") {
    await tg("/banChatMember", { chat_id: chatId, user_id: userId }, "POST");
    await tg("/unbanChatMember", { chat_id: chatId, user_id: userId, only_if_banned: true }, "POST");
    return sendMsg(chatId, "👢 *" + name + "* تم طرده!", true);
  }
}

async function cmdAddBanWord(chatId, userId, text, replyTo) {
  if (!await isGroupAdmin(chatId, userId) && !await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const parts      = text.replace(/^\/addban\s*/i, "").trim().split(" ");
  const word       = parts[0];
  const punishment = parts[1] || "warn";
  if (!word) return sendMsg(chatId, "/addban [كلمة] [warn/mute/ban/kick]", false, replyTo);
  const raw  = await kv_get("banwords:" + chatId);
  const data = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : { words: [], defaultPunishment: "warn" };
  data.words = data.words.filter(e => e.word !== word);
  data.words.push({ word, punishment });
  await kv_set("banwords:" + chatId, JSON.stringify(data));
  const pN = { warn:"⚠️", mute:"🔇", ban:"🚫", kick:"👢" };
  return sendMsg(chatId, "✅ كلمة محظورة: *" + word + "* | " + (pN[punishment]||punishment), true, replyTo);
}

async function cmdDelBanWord(chatId, userId, text, replyTo) {
  if (!await isGroupAdmin(chatId, userId) && !await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const word = text.replace(/^\/delban\s*/i, "").trim();
  const raw  = await kv_get("banwords:" + chatId);
  if (!raw) return sendMsg(chatId, "مفيش كلمات محظورة.", false, replyTo);
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  data.words = data.words.filter(e => e.word !== word);
  await kv_set("banwords:" + chatId, JSON.stringify(data));
  return sendMsg(chatId, "تم حذف: *" + word + "*", true, replyTo);
}

async function cmdListBanWords(chatId, userId, replyTo) {
  if (!await isGroupAdmin(chatId, userId) && !await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const raw  = await kv_get("banwords:" + chatId);
  if (!raw) return sendMsg(chatId, "مفيش كلمات محظورة.", false, replyTo);
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!data.words || !data.words.length) return sendMsg(chatId, "مفيش كلمات محظورة.", false, replyTo);
  const pN = { warn:"⚠️", mute:"🔇", ban:"🚫", kick:"👢" };
  let msg = "🚫 *الكلمات المحظورة:*\n\n";
  data.words.forEach((e, i) => { msg += (i+1) + ". *" + e.word + "* — " + (pN[e.punishment]||e.punishment) + "\n"; });
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdSetPunishment(chatId, userId, text, replyTo) {
  if (!await isGroupAdmin(chatId, userId) && !await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const punishment = text.replace(/^\/setpunish\s*/i, "").trim();
  const raw  = await kv_get("banwords:" + chatId);
  const data = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : { words: [] };
  data.defaultPunishment = punishment;
  await kv_set("banwords:" + chatId, JSON.stringify(data));
  return sendMsg(chatId, "✅ العقوبة الافتراضية: *" + punishment + "*", true, replyTo);
}

// ══ Group Admin Commands ══════════════════════════════════════
async function cmdMute(chatId, adminId, replyMsg, text, replyTo) {
  if (!await isGroupAdmin(chatId, adminId) && !await isAdmin(adminId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  const match = text.match(/(\d+)/);
  const mins  = match ? parseInt(match[1]) : 60;
  const until = Math.floor(Date.now() / 1000) + (mins * 60);
  const res   = await tg("/restrictChatMember", { chat_id: chatId, user_id: targetId, until_date: until, permissions: { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false } }, "POST");
  const data  = await res.json();
  if (data.ok) return sendMsg(chatId, "🔇 تم كتم *" + targetName + "* لمدة " + mins + " دقيقة.", true, replyTo);
  return sendMsg(chatId, "فشل الكتم — تأكد إن البوت أدمن.", false, replyTo);
}

async function cmdUnmute(chatId, adminId, replyMsg, replyTo) {
  if (!await isGroupAdmin(chatId, adminId) && !await isAdmin(adminId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const res  = await tg("/restrictChatMember", { chat_id: chatId, user_id: replyMsg.from.id, until_date: 0, permissions: { can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true } }, "POST");
  const data = await res.json();
  if (data.ok) return sendMsg(chatId, "🔊 تم رفع الكتم عن *" + getUserName(replyMsg.from) + "*.", true, replyTo);
  return sendMsg(chatId, "فشل رفع الكتم.", false, replyTo);
}

async function cmdGroupBan(chatId, adminId, replyMsg, replyTo) {
  if (!await isGroupAdmin(chatId, adminId) && !await isAdmin(adminId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const res  = await tg("/banChatMember", { chat_id: chatId, user_id: replyMsg.from.id }, "POST");
  const data = await res.json();
  if (data.ok) return sendMsg(chatId, "🚫 تم حظر *" + getUserName(replyMsg.from) + "* من الجروب.", true, replyTo);
  return sendMsg(chatId, "فشل الحظر.", false, replyTo);
}

async function cmdGroupUnban(chatId, adminId, replyMsg, replyTo) {
  if (!await isGroupAdmin(chatId, adminId) && !await isAdmin(adminId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const res  = await tg("/unbanChatMember", { chat_id: chatId, user_id: replyMsg.from.id, only_if_banned: true }, "POST");
  const data = await res.json();
  if (data.ok) return sendMsg(chatId, "✅ تم رفع الحظر عن *" + getUserName(replyMsg.from) + "*.", true, replyTo);
  return sendMsg(chatId, "فشل رفع الحظر.", false, replyTo);
}

async function cmdWarn(chatId, adminId, replyMsg, replyTo) {
  if (!await isGroupAdmin(chatId, adminId) && !await isAdmin(adminId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  const warnKey    = "warn:" + chatId + ":" + targetId;
  const raw        = await kv_get(warnKey);
  let warns        = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw).count || 0 : 0;
  warns++;
  await kv_set(warnKey, JSON.stringify({ count: warns, name: targetName }));
  if (warns >= 3) {
    await tg("/banChatMember", { chat_id: chatId, user_id: targetId }, "POST");
    await kv_set(warnKey, JSON.stringify({ count: 0 }));
    return sendMsg(chatId, "🚫 *" + targetName + "* وصل لـ 3 تحذيرات وتم حظره!", true, replyTo);
  }
  return sendMsg(chatId, "⚠️ تحذير لـ *" + targetName + "*!\nالتحذيرات: *" + warns + "/3*\n" + (3 - warns) + " متبقي قبل الحظر.", true, replyTo);
}

// ══ User Commands ══════════════════════════════════════════════
async function cmdStart(chatId, userId, fromName, replyTo) {
  const u = await getUser(userId);
  const isNew = !u.joinedAt;
  if (isNew) { u.joinedAt = new Date().toISOString(); await saveUser(userId, u); }
  // لو مستخدم جديد أو مش عنده لغة - اعرض اختيار اللغة
  if (!u.lang) {
    const buttons = [
      [{ text: "🇸🇦 العربية",   callback_data: "lang:ar" }],
      [{ text: "🇺🇸 English",   callback_data: "lang:en" }],
      [{ text: "🇮🇩 Indonesia", callback_data: "lang:id" }],
    ];
    return sendInlineKeyboard(chatId, LANG_TEXTS.ar.lang_select, buttons);
  }
  // لو عنده لغة
  const welcome = t(u, "welcome").replace("{name}", fromName);
  return sendMsg(chatId, welcome, true, replyTo);
}

async function cmdHelp(chatId, userId, replyTo) {
  const admin = await isAdmin(userId);
  const msg   = [
    "📖 *الأوامر:*\n",
    "💬 أي كلام — محادثة",
    "🔍 ابحث عن [موضوع]",
    "🎨 ارسم [وصف]",
    "📷 أرسل صورة — تحليل أو تعديل",
    "🎤 أرسل صوت — تفريغ",
    "🎮 /game — ألعاب",
    "🏰 /قلعتي — لعبة القلعة",
    "🤫 /صارحني — صارح شخص",
    "📨 /رسالة — رسالة للمطور",
    "👤 /مزاجي — بروفايلك",
    "🔄 /reset — مسح المحادثة",
    "ℹ️ /about\n",
    "*الشخصيات:*",
    "• فعل الشخصية المرحة",
    "• فعل الشخصية العصبية",
    "• فعل الشخصية المصرية",
    "• فعل النسونجي",
    "• ارجع للوضع الطبيعي\n",
    "📊 100 رسالة / 10 صور يومياً",
    admin ? "\n🔐 /admin — لوحة الأدمن" : ""
  ].join("\n");
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdAbout(chatId, replyTo) {
  return sendMsg(chatId, "🤖 *طمطم - Railway Edition*\n\n⚙️ Node.js + Railway\n🧠 Google Gemini API\n👨‍💻 *المطور:* حسن\n\n🔥 Gemini 2.5 Flash\n🍌 Nano Banana\n📊 100 رسالة / 10 صور يومياً", true, replyTo);
}

async function cmdMyModel(chatId, userId, replyTo) {
  const u    = await getUser(userId);
  const cm   = getChatModel(u.chatModel);
  const im   = getImageModel(u.imageModel);
  const lim  = u.dailyLimit  || 100;
  const ilim = u.imageLimit  || 10;
  const rem  = Math.max(0, lim  - (u.messageCount || 0));
  const irem = Math.max(0, ilim - (u.imageCount   || 0));
  const pN   = { default:"الطبيعية", fun:"المرحة 😂", angry:"العصبية 😤", serious:"الرسمية 🎩", egyptian:"المصرية 🇪🇬", sad:"الحزينة 😔", womanizer:"النسونجي 😏", flirty:"اللطيفة 💕" };
  const p    = getPersona(userId, u);
  return sendMsg(chatId, "⚙️ *إعداداتك:*\n\n💬 " + cm.label + "\n🍌 " + im.label + "\n🎭 " + (pN[p]||p) + "\n📊 رسائل: *" + rem + "/" + lim + "*\n🖼 صور: *" + irem + "/" + ilim + "*", true, replyTo);
}

async function cmdReset(chatId, userId, replyTo) {
  sessionHistory.delete(userId);
  userPersona.delete(userId);
  activeGames.delete(userId);
  return sendMsg(chatId, "تم مسح السجل والشخصية!", false, replyTo);
}

// ══ Register Chat ══════════════════════════════════════════════
async function registerChat(chat) {
  try {
    const key      = "chat:" + chat.id;
    const existing = await kv_get(key);
    const data     = existing ? (typeof existing === "string" ? JSON.parse(existing) : existing) : {};
    await kv_set(key, JSON.stringify({
      ...data,
      id:      chat.id,
      title:   chat.title || chat.first_name || "خاص",
      type:    chat.type,
      addedAt: data.addedAt || new Date().toISOString()
    }));
  } catch {}
}

// تسجيل عضو في الجروب
async function registerMember(chatId, from) {
  if (!from || from.is_bot) return;
  try {
    const memberKey = "member:" + chatId + ":" + from.id;
    const existing  = await kv_get(memberKey);
    const data      = existing ? (typeof existing === "string" ? JSON.parse(existing) : existing) : {};
    await kv_set(memberKey, JSON.stringify({
      ...data,
      id:         from.id,
      name:       getUserName(from),
      username:   from.username || null,
      firstSeen:  data.firstSeen || new Date().toISOString(),
      lastSeen:   new Date().toISOString(),
      msgCount:   (data.msgCount || 0) + 1
    }));
  } catch {}
}

// جلب أعضاء الجروب من Redis
async function getGroupMembers(chatId) {
  try {
    const keys    = await kv_keys("member:" + chatId + ":");
    const members = [];
    for (const k of keys) {
      const raw = await kv_get(k);
      if (raw) members.push(typeof raw === "string" ? JSON.parse(raw) : raw);
    }
    return members;
  } catch { return []; }
}

// بناء سياق الجروب للـ AI
async function buildGroupContext(chatId) {
  try {
    const chatRaw = await kv_get("chat:" + chatId);
    const chat    = chatRaw ? (typeof chatRaw === "string" ? JSON.parse(chatRaw) : chatRaw) : null;
    const members = await getGroupMembers(chatId);
    if (!chat && !members.length) return "";
    let ctx = "\n\n[معلومات الجروب الذي أنت فيه]\n";
    if (chat) ctx += "اسم الجروب: " + chat.title + "\n";
    if (members.length) {
      ctx += "الأعضاء النشطين (" + members.length + " عضو):\n";
      members.slice(0, 20).forEach(m => {
        ctx += "- " + m.name;
        if (m.username) ctx += " (@" + m.username + ")";
        ctx += " [رسائل: " + (m.msgCount||0) + "]\n";
      });
    }
    ctx += "أنت عضو في هذا الجروب وتعرف كل الأعضاء. لو سألك أحد عن عضو تاني أجبه بمعلوماته.\n";
    return ctx;
  } catch { return ""; }
}

async function cmdGroupMembers(chatId, userId, replyTo) {
  const members = await getGroupMembers(chatId);
  if (!members.length) return sendMsg(chatId, "مفيش أعضاء مسجلين لحد دلوقتي.", false, replyTo);
  members.sort((a, b) => (b.msgCount||0) - (a.msgCount||0));
  let msg = "👥 *أعضاء الجروب (" + members.length + "):*\n\n";
  members.slice(0, 30).forEach((m, i) => {
    msg += (i+1) + ". *" + m.name + "*";
    if (m.username) msg += " @" + m.username;
    msg += " | 💬" + (m.msgCount||0) + "\n";
  });
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdListChats(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const keys = await kv_keys("chat:");
  if (!keys.length) return sendMsg(chatId, "مفيش جروبات مسجلة.", false, replyTo);
  let msg = "💬 *الجروبات المسجلة:*\n\n";
  for (let i = 0; i < keys.length; i++) {
    const raw = await kv_get(keys[i]);
    if (raw) {
      const c = typeof raw === "string" ? JSON.parse(raw) : raw;
      msg += (i+1) + ". *" + c.title + "* | `" + c.id + "`\n";
    }
  }
  return sendMsg(chatId, msg, true, replyTo);
}

// ══ Scheduler ════════════════════════════════════════════════
async function getSchedules() {
  const raw = await kv_get("schedules");
  if (!raw) return {};
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function cmdAddSchedule(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const parts = text.replace(/^\/addschedule\s*/i, "").trim().split(" ");
  if (parts.length < 3) return sendMsg(chatId, "/addschedule [all أو chat_id] [ساعات] [رسالة]", false, replyTo);
  const targetChat = parts[0];
  const hours      = parseInt(parts[1]);
  const message    = parts.slice(2).join(" ");
  if (isNaN(hours)) return sendMsg(chatId, "عدد الساعات لازم يكون رقم.", false, replyTo);
  const schedules  = await getSchedules();
  const id         = Date.now().toString();
  schedules[id]    = { chatId: targetChat, hours, message, lastSent: 0 };
  await kv_set("schedules", JSON.stringify(schedules));
  return sendMsg(chatId, "✅ تم! كل *" + hours + "* ساعة في: " + targetChat, true, replyTo);
}

async function cmdListSchedules(chatId, userId, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const schedules = await getSchedules();
  const keys      = Object.keys(schedules);
  if (!keys.length) return sendMsg(chatId, "مفيش رسائل مجدولة.", false, replyTo);
  let msg = "⏰ *الرسائل المجدولة:*\n\n";
  keys.forEach((k, i) => {
    const s = schedules[k];
    msg += (i+1) + ". كل *" + s.hours + "h* → `" + s.chatId + "`\n📝 " + s.message.slice(0,50) + "\n🆔 `" + k + "`\n\n";
  });
  return sendMsg(chatId, msg + "للحذف: /delschedule [id]", true, replyTo);
}

async function cmdDelSchedule(chatId, userId, text, replyTo) {
  if (!await isAdmin(userId)) return sendMsg(chatId, "للأدمن بس.", false, replyTo);
  const id        = text.replace(/^\/delschedule\s*/i, "").trim();
  const schedules = await getSchedules();
  if (!schedules[id]) return sendMsg(chatId, "مش لاقي الـ ID ده.", false, replyTo);
  delete schedules[id];
  await kv_set("schedules", JSON.stringify(schedules));
  return sendMsg(chatId, "تم حذف الجدول.", false, replyTo);
}

// ══ Games ══════════════════════════════════════════════════════
async function cmdStartGame(chatId, userId, replyTo) {
  const buttons = [
    [{ text: "🔢 تخمين الرقم",  callback_data: "game:number"  }],
    [{ text: "❓ سؤال وجواب",   callback_data: "game:trivia"  }],
    [{ text: "🔤 تخمين الكلمة", callback_data: "game:word"    }],
  ];
  return sendInlineKeyboard(chatId, "🎮 *اختار اللعبة:*", buttons);
}

async function handleGameCallback(chatId, userId, data, msgId) {
  const gameType = data.replace("game:", "");
  if (gameType === "number") {
    const num = Math.floor(Math.random() * 100) + 1;
    activeGames.set(userId, { type: "number", answer: num, tries: 0, max: 7 });
    return sendMsg(chatId, "🎮 *تخمين الرقم*\n\nاخترت رقم بين 1 و 100\nعندك *7 محاولات*!\nاكتب تخمينك:", true);
  }
  if (gameType === "trivia") {
    const qs = [
      { q: "ما هي عاصمة مصر؟",               a: "القاهرة",    hint: "نهر النيل" },
      { q: "كم عدد أيام السنة؟",              a: "365",         hint: "360-370" },
      { q: "أكبر كوكب في المجموعة الشمسية؟",  a: "المشتري",   hint: "اسم إله روماني" },
      { q: "كم عدد أضلاع المثلث؟",           a: "3",           hint: "رقم صغير" },
      { q: "ما عاصمة السعودية؟",             a: "الرياض",     hint: "تبدأ بحرف الراء" },
    ];
    const q = qs[Math.floor(Math.random() * qs.length)];
    activeGames.set(userId, { type: "trivia", answer: q.a, hint: q.hint, tries: 0, max: 3 });
    return sendMsg(chatId, "❓ *سؤال:*\n\n" + q.q + "\n\nعندك *3 محاولات*!", true);
  }
  if (gameType === "word") {
    const words = ["برتقالة","كمبيوتر","تلجرام","برمجة","مصر","قاهرة","نيل","هرم","طمطم"];
    const word  = words[Math.floor(Math.random() * words.length)];
    activeGames.set(userId, { type: "word", answer: word, tries: 0, max: 5 });
    return sendMsg(chatId, "🔤 *تخمين الكلمة*\n\nعدد الحروف: *" + word.length + "*\nعندك *5 محاولات*!", true);
  }
}

async function handleGameInput(chatId, userId, text, replyTo) {
  const game = activeGames.get(userId);
  if (!game) return;
  game.tries++;
  if (game.type === "number") {
    const guess = parseInt(text);
    if (isNaN(guess)) return sendMsg(chatId, "اكتب رقم!", false, replyTo);
    if (guess === game.answer) { activeGames.delete(userId); return sendMsg(chatId, "🎉 صح! الرقم كان *" + game.answer + "* في " + game.tries + " محاولة!", true, replyTo); }
    if (game.tries >= game.max) { activeGames.delete(userId); return sendMsg(chatId, "خلصت المحاولات! الرقم كان *" + game.answer + "* 😅", true, replyTo); }
    const hint = guess < game.answer ? "أكبر ⬆️" : "أصغر ⬇️";
    return sendMsg(chatId, hint + " | متبقي " + (game.max - game.tries) + " محاولات", false, replyTo);
  }
  if (game.type === "trivia") {
    const correct = text.trim().toLowerCase() === game.answer.toLowerCase() || text.includes(game.answer);
    if (correct) { activeGames.delete(userId); return sendMsg(chatId, "🎉 صح! الإجابة: *" + game.answer + "*", true, replyTo); }
    if (game.tries >= game.max) { activeGames.delete(userId); return sendMsg(chatId, "الإجابة كانت *" + game.answer + "* 😅", true, replyTo); }
    const hint = game.tries === 2 ? "\nتلميح: " + game.hint : "";
    return sendMsg(chatId, "غلط!" + hint + " | متبقي " + (game.max - game.tries) + " محاولات", false, replyTo);
  }
  if (game.type === "word") {
    if (text.trim() === game.answer) { activeGames.delete(userId); return sendMsg(chatId, "🎉 صح! الكلمة: *" + game.answer + "*", true, replyTo); }
    if (game.tries >= game.max) { activeGames.delete(userId); return sendMsg(chatId, "الكلمة كانت *" + game.answer + "* 😅", true, replyTo); }
    return sendMsg(chatId, "غلط! متبقي " + (game.max - game.tries) + " محاولات", false, replyTo);
  }
}

// ══ Castle Game ════════════════════════════════════════════════
async function getCastle(userId) {
  const raw = await kv_get("castle:" + userId);
  if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
  return { gold: 500, wood: 300, food: 200, army: { swords: 10, archers: 5, cavalry: 0 }, buildings: { farm: 1, barracks: 1, wall: 1, mine: 1 }, level: 1, xp: 0, lastCollect: 0, wins: 0, losses: 0 };
}
async function saveCastle(userId, data) { await kv_set("castle:" + userId, JSON.stringify(data)); }

async function cmdCastle(chatId, userId, replyTo) {
  const c          = await getCastle(userId);
  const totalArmy  = c.army.swords + c.army.archers + c.army.cavalry;
  const msg = ["🏰 *قلعتك — المستوى " + c.level + "*","","💰 ذهب: *" + c.gold + "* | 🌾 طعام: *" + c.food + "*","","⚔️ *الجيش (" + totalArmy + "):*","🗡️ " + c.army.swords + " | 🏹 " + c.army.archers + " | 🐴 " + c.army.cavalry,"","🏆 انتصارات: " + c.wins + " | خسائر: " + c.losses,"⭐ XP: " + c.xp,"","/اجمع | /تدريب | /هجوم [id] | /ترتيب"].join("\n");
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdCollect(chatId, userId, replyTo) {
  const c    = await getCastle(userId);
  const now  = Date.now();
  const diff = Math.floor((now - (c.lastCollect || 0)) / 60000);
  if (diff < 30) return sendMsg(chatId, "⏳ استنى *" + (30 - diff) + "* دقيقة!", true, replyTo);
  const g = (c.buildings.mine || 1) * 50 + Math.floor(Math.random() * 50);
  const f = (c.buildings.farm || 1) * 40 + Math.floor(Math.random() * 40);
  c.gold += g; c.food += f; c.lastCollect = now; c.xp += 10;
  if (c.xp >= c.level * 100) { c.level++; c.xp = 0; }
  await saveCastle(userId, c);
  return sendMsg(chatId, "✅ *تم جمع الموارد!*\n\n💰 +" + g + " ذهب\n🌾 +" + f + " طعام\n\n💡 تقدر تجمع بعد 30 دقيقة", true, replyTo);
}

async function cmdTrain(chatId, userId, replyTo) {
  const c       = await getCastle(userId);
  const buttons = [
    [{ text: "🗡️ سيف (100 ذهب)", callback_data: "train:sword"   }],
    [{ text: "🏹 رامي (150 ذهب)", callback_data: "train:archer"  }],
    [{ text: "🐴 فارس (300 ذهب)", callback_data: "train:cavalry" }],
  ];
  return sendInlineKeyboard(chatId, "⚔️ *تدريب الجنود*\n\n💰 ذهبك: *" + c.gold + "*\n\nاختار:", buttons);
}

async function handleTrainCallback(chatId, userId, data) {
  const type  = data.replace("train:", "");
  const c     = await getCastle(userId);
  const costs = { sword: 100, archer: 150, cavalry: 300 };
  const names = { sword: "سيف 🗡️", archer: "رامي 🏹", cavalry: "فارس 🐴" };
  const cost  = costs[type];
  if (!cost) return;
  if (c.gold < cost) return sendMsg(chatId, "مش عندك ذهب كفاية! محتاج *" + cost + "*", true);
  c.gold -= cost;
  if (type === "sword")   c.army.swords++;
  if (type === "archer")  c.army.archers++;
  if (type === "cavalry") c.army.cavalry++;
  c.xp += 5;
  if (c.xp >= c.level * 100) { c.level++; c.xp = 0; }
  await saveCastle(userId, c);
  return sendMsg(chatId, "✅ تم تدريب *" + names[type] + "*!\n💰 ذهب متبقي: *" + c.gold + "*", true);
}

async function cmdAttack(chatId, userId, text, replyTo) {
  const targetId = text.replace(/^\/(هجوم|attack)\s*/i, "").trim();
  if (!targetId || isNaN(Number(targetId))) return sendMsg(chatId, "/هجوم [user_id]", false, replyTo);
  if (String(targetId) === String(userId)) return sendMsg(chatId, "مش ممكن تهاجم نفسك!", false, replyTo);
  const a   = await getCastle(userId);
  const d   = await getCastle(Number(targetId));
  const aP  = a.army.swords * 10 + a.army.archers * 15 + a.army.cavalry * 25 + Math.floor(Math.random() * 100);
  const dP  = d.army.swords * 10 + d.army.archers * 15 + d.army.cavalry * 25 + d.buildings.wall * 20 + Math.floor(Math.random() * 100);
  if (aP > dP) {
    const loot = Math.floor(d.gold * 0.2);
    a.gold += loot; d.gold -= loot; a.wins++; a.xp += 50; d.losses++;
    await saveCastle(userId, a); await saveCastle(Number(targetId), d);
    try { await sendMsg(Number(targetId), "🚨 قلعتك اتهاجمت وخسرت *" + loot + "* ذهب!", true); } catch {}
    return sendMsg(chatId, "⚔️ *انتصرت!*\n\n💰 سرقت *" + loot + "* ذهب!\n⭐ +50 XP", true, replyTo);
  } else {
    a.losses++;
    await saveCastle(userId, a);
    return sendMsg(chatId, "💀 *خسرت الهجوم!*\n\nقوي جيشك وحاول تاني.", true, replyTo);
  }
}

async function cmdLeaderboard(chatId, userId, replyTo) {
  const keys    = await kv_keys("castle:");
  const castles = [];
  for (const k of keys) {
    const raw = await kv_get(k);
    if (raw) {
      const c   = typeof raw === "string" ? JSON.parse(raw) : raw;
      const uid = k.replace("castle:", "");
      castles.push({ uid, ...c });
    }
  }
  castles.sort((a, b) => (b.level * 1000 + b.wins) - (a.level * 1000 + a.wins));
  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
  let msg = "🏆 *أقوى القلاع:*\n\n";
  castles.slice(0, 5).forEach((c, i) => {
    const total = c.army.swords + c.army.archers + c.army.cavalry;
    msg += medals[i] + " `" + c.uid + "` Lv" + c.level + " | ⚔️" + total + " | 🏆" + c.wins + "\n";
  });
  return sendMsg(chatId, msg, true, replyTo);
}

async function cmdProfile(chatId, userId, replyTo) {
  const u    = await getUser(userId);
  const c    = await getCastle(userId);
  const lim  = u.dailyLimit  || 100;
  const ilim = u.imageLimit  || 10;
  const rem  = Math.max(0, lim  - (u.messageCount || 0));
  const irem = Math.max(0, ilim - (u.imageCount   || 0));
  const pN   = { default:"الطبيعية", fun:"المرحة 😂", angry:"العصبية 😤", serious:"الرسمية 🎩", egyptian:"المصرية 🇪🇬", sad:"الحزينة 😔", womanizer:"النسونجي 😏", flirty:"اللطيفة 💕" };
  const p    = getPersona(userId, u);
  const totalArmy = c.army.swords + c.army.archers + c.army.cavalry;
  return sendMsg(chatId, "👤 *بروفايلك:*\n\n💬 رسائل: *" + rem + "/" + lim + "*\n🖼 صور: *" + irem + "/" + ilim + "*\n🎭 " + (pN[p]||p) + "\n\n🏰 قلعتك Lv*" + c.level + "* | ⚔️" + totalArmy + " | 🏆" + c.wins, true, replyTo);
}

// ══ Confess ════════════════════════════════════════════════════
async function cmdConfess(chatId, userId, replyTo) {
  return sendMsg(chatId, "🤫 *صارحني*\n\nابعت رسالة مجهولة:\n`/صارحني [user_id] [رسالتك]`\n\nللرد: `/رد [كود] [ردك]`", true, replyTo);
}

async function cmdSendConfess(chatId, userId, text, replyTo) {
  const parts    = text.replace(/^\/(صارحني|confess)\s*/i, "").trim().split(" ");
  let targetId   = parts[0];
  const message  = parts.slice(1).join(" ");
  if (!targetId || !message) return sendMsg(chatId, "الاستخدام: /صارحني [user_id] [رسالتك]", false, replyTo);
  if (targetId.startsWith("@")) {
    const username = targetId.replace("@", "").toLowerCase();
    const foundId  = await findUserByUsername(username);
    if (!foundId) return sendMsg(chatId, "مش لاقي @" + username, false, replyTo);
    targetId = foundId;
  }
  if (isNaN(Number(targetId))) return sendMsg(chatId, "الـ ID غلط", false, replyTo);
  const replyCode = "R" + Date.now().toString(36).toUpperCase();
  await kv_set("confess:" + replyCode, String(userId), 86400);
  try {
    await sendMsg(Number(targetId), "🤫 *رسالة مجهولة وصلتلك:*\n\n" + message + "\n\n_للرد: /رد " + replyCode + " ردك_", true);
    return sendMsg(chatId, "✅ اتبعتت بشكل مجهول! 🤫", false, replyTo);
  } catch { return sendMsg(chatId, "❌ مش قادر أبعت. تأكد من الـ ID.", false, replyTo); }
}

async function cmdReplyConfess(chatId, userId, text, replyTo) {
  const parts      = text.replace(/^\/(رد|reply)\s*/i, "").trim().split(" ");
  const replyCode  = parts[0];
  const message    = parts.slice(1).join(" ");
  if (!replyCode || !message) return sendMsg(chatId, "/رد [كود] [ردك]", false, replyTo);
  const originalId = await kv_get("confess:" + replyCode);
  if (!originalId) return sendMsg(chatId, "❌ الكود منتهي أو غلط.", false, replyTo);
  try {
    await sendMsg(Number(originalId), "🤫 *رد على رسالتك المجهولة:*\n\n" + message, true);
    return sendMsg(chatId, "✅ اترد!", false, replyTo);
  } catch { return sendMsg(chatId, "❌ فشل الإرسال.", false, replyTo); }
}

async function cmdMsgDev(chatId, userId, text, fromName, replyTo) {
  const message = text.replace(/^\/(رسالة|msg)\s*/i, "").trim();
  if (!message) return sendMsg(chatId, "اكتب رسالتك: /رسالة [رسالتك]", false, replyTo);
  if (!ADMIN_ID) return sendMsg(chatId, "❌ خدمة غير متاحة.", false, replyTo);
  try {
    await sendMsg(Number(ADMIN_ID), "📨 *رسالة سرية!*\n\n👤 " + fromName + " (`" + userId + "`)\n\n💬 " + message + "\n\n_للرد: /صارحني " + userId + " ردك_", true);
    return sendMsg(chatId, "✅ وصلت رسالتك للمطور! 🤫", false, replyTo);
  } catch { return sendMsg(chatId, "❌ فشل.", false, replyTo); }
}

// ══ Avatar Edit ════════════════════════════════════════════════
async function cmdEditAvatar(chatId, userId, msg, text, replyTo) {
  const instruction = text.replace(/^\/(setavatar|عدل صورتي)\s*/i, "").trim() || "عدل الصورة";
  await sendMsg(chatId, "بجيب صورة بروفايلك...", false, replyTo);
  try {
    const pRes    = await tg("/getUserProfilePhotos?user_id=" + userId + "&limit=1");
    const pData   = await pRes.json();
    if (!pData.ok || !pData.result.photos?.length) return sendMsg(chatId, "مش لاقي صورة بروفايل!", false, replyTo);
    const fileId  = pData.result.photos[0][pData.result.photos[0].length-1].file_id;
    const fRes    = await tg("/getFile?file_id=" + fileId);
    const fData   = await fRes.json();
    const path    = fData.result?.file_path;
    const imgRes  = await fetch("https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + path);
    const buf     = Buffer.from(await imgRes.arrayBuffer());
    const base64  = buf.toString("base64");
    const mime    = path.endsWith(".png") ? "image/png" : "image/jpeg";
    await sendMsg(chatId, "بعدل صورتك...", false, replyTo);
    const editModels = ["gemini-3.1-flash-image-preview","gemini-3-pro-image-preview","gemini-2.5-flash-image"];
    for (const modelId of editModels) {
      try {
        const res = await fetch(GEMINI_API + "/models/" + modelId + ":generateContent?key=" + GOOGLE_API_KEY, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Edit this profile photo: " + instruction }, { inline_data: { mime_type: mime, data: base64 } }] }], generationConfig: { responseModalities: ["Text", "Image"] } })
        });
        if (!res.ok) continue;
        const data    = await res.json();
        const parts   = data?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
        if (!imgPart) continue;
        const outBuf = Buffer.from(imgPart.inlineData.data, "base64");
        const ext    = imgPart.inlineData.mimeType.split("/")[1] || "png";
        const form   = new FormData();
        form.append("chat_id", chatId.toString());
        form.append("photo", outBuf, { filename: "avatar." + ext, contentType: imgPart.inlineData.mimeType });
        form.append("caption", "صورة بروفايلك بعد التعديل!");
        if (replyTo) form.append("reply_to_message_id", replyTo.toString());
        return fetch(TELEGRAM + "/sendPhoto", { method: "POST", body: form });
      } catch {}
    }
    return sendMsg(chatId, "مش قادر أعدل الصورة.", false, replyTo);
  } catch (e) { return sendMsg(chatId, "فشل: " + e.message, false, replyTo); }
}

// ══ Whisper System ════════════════════════════════════════════
async function findUserByUsername(username) {
  const keys = await kv_keys("user:");
  for (const k of keys) {
    const raw = await kv_get(k);
    if (!raw) continue;
    const u = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (u.username && u.username.toLowerCase() === username) return k.replace("user:", "");
  }
  return null;
}

async function cmdWhisper(chatId, userId, text, fromName, replyTo) {
  const parts    = text.replace(/^\/(همس|whisper)\s*/i, "").trim().split(" ");
  let targetId   = parts[0];
  const message  = parts.slice(1).join(" ");
  if (!targetId || !message) return sendMsg(chatId, "/همس [@username أو user_id] [رسالتك]", false, replyTo);
  if (targetId.startsWith("@")) {
    const foundId = await findUserByUsername(targetId.replace("@", "").toLowerCase());
    if (!foundId) return sendMsg(chatId, "مش لاقي " + targetId, false, replyTo);
    targetId = foundId;
  }
  if (isNaN(Number(targetId))) return sendMsg(chatId, "الـ ID غلط.", false, replyTo);
  return sendTrueWhisper(chatId, userId, targetId, message, fromName);
}

async function cmdInitWhisper(chatId, userId, msg, text, fromName, replyTo) {
  if (!msg.reply_to_message || !msg.reply_to_message.from || msg.reply_to_message.from.is_bot) {
    return sendMsg(chatId, "🤫 رد على رسالة الشخص اللي تريد تهمسله واكتب: اهمس", true, replyTo);
  }
  const targetId   = msg.reply_to_message.from.id;
  const targetName = getUserName(msg.reply_to_message.from);
  if (String(targetId) === String(userId)) return sendMsg(chatId, "مش ممكن تهمس لنفسك! 😅", false, replyTo);
  const pendingKey = "whisper_pending:" + userId;
  await kv_set(pendingKey, JSON.stringify({ targetId, targetName, chatId, groupName: msg.chat.title || "الجروب" }), 300);
  await sendMsg(chatId, "🤫 *" + fromName + "* عايز يهمس لـ *" + targetName + "*\n\nكلم البوت في الخاص وابعتله الرسالة! 👇", true, replyTo);
  const buttons = [[{ text: "💬 ابعت الهمسة في الخاص", url: "https://t.me/" + BOT_USERNAME }]];
  return sendInlineKeyboard(chatId, "⬆️ اضغط وابعت رسالتك للبوت في الخاص خلال 5 دقائق", buttons);
}

async function sendTrueWhisper(chatId, senderId, targetId, message, fromName) {
  // إرسال للمطور سراً
  try {
    if (ADMIN_ID && String(targetId) !== String(ADMIN_ID)) {
      await sendMsg(Number(ADMIN_ID), "🔍 *همسة سرية:*\n👤 من: " + fromName + " (`" + senderId + "`)\n👥 إلى: `" + targetId + "`\n💬 " + message, true);
    }
  } catch {}
  // حفظ الهمسة في Redis
  const whisperKey = "wsp:" + Date.now().toString(36);
  await kv_set(whisperKey, JSON.stringify({ message, from: fromName, senderId, targetId }), 300);
  // إشعار في الجروب
  await sendMsg(chatId, "🤫 *" + fromName + "* همس لشخص ما...", true);
  // إرسال الزر للمستهدف في الخاص
  try {
    const buttons = [[{ text: "🤫 اضغط لتسمع الهمسة", callback_data: "wsp:" + whisperKey }]];
    const res = await fetch(TELEGRAM + "/sendMessage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(targetId),
        text: "🤫 *وصلتك همسة من الجروب!*\nاضغط الزر لتسمعها — أنت فقط تشوفها 👇",
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    });
    const result = await res.json();
    if (!result.ok) {
      console.error("Whisper send failed:", result);
      await sendMsg(chatId, "❌ مش قادر يوصل للمستهدف. لازم يكون بعت /start للبوت أول.", false);
    }
  } catch (e) {
    console.error("Whisper error:", e);
    await sendMsg(chatId, "❌ فشل إرسال الهمسة: " + e.message, false);
  }
}

async function handleWhisperCallback(cb) {
  const rawKey = cb.data;
  const key    = rawKey.startsWith("wsp:") ? rawKey.slice(4) : rawKey;
  try {
    const raw  = await kv_get("wsp:" + key);
    const data = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!data) return answerCallback(cb.id, "⏰ انتهت صلاحية الهمسة!", true);
    // فقط المستهدف يشوف الرسالة الحقيقية
    if (String(cb.from.id) !== String(data.targetId)) {
      return answerCallback(cb.id, "😅 الهمسة دي مش ليك!", true);
    }
    return answerCallback(cb.id, "🤫 همسة من " + data.from + ":

" + data.message, true);
  } catch (e) {
    console.error("Whisper callback error:", e);
    return answerCallback(cb.id, "❌ حدث خطأ.", true);
  }
}

// ══ Webhook Setup ══════════════════════════════════════════════
app.get("/", (req, res) => res.json({ status: "ok", v: "1.0.0", bot: "طمطم Railway Edition" }));

app.get("/init", async (req, res) => {
  try {
    const webhookUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? "https://" + process.env.RAILWAY_PUBLIC_DOMAIN
      : req.protocol + "://" + req.get("host");
    const r    = await tg("/setWebhook?url=" + webhookUrl + "/webhook/" + WEBHOOK_SECRET + "&allowed_updates=[\"message\",\"callback_query\"]");
    const data = await r.json();
    res.json({ status: data.ok ? "✅ تم!" : "❌ فشل", webhook: webhookUrl, result: data });
  } catch (e) { res.json({ error: e.message }); }
});

app.post("/webhook/" + WEBHOOK_SECRET, async (req, res) => {
  res.json({ ok: true }); // رد سريع
  try {
    const update = req.body;
    if (update.message)        handleUpdate(update.message).catch(console.error);
    if (update.callback_query) handleCallback(update.callback_query).catch(console.error);
  } catch (e) { console.error("Webhook error:", e); }
});

// ══ Scheduler (cron) ══════════════════════════════════════════
// كرون كل دقيقة - أدق من كل ساعة
cron.schedule("* * * * *", async () => {
  try {
    const schedules = await getSchedules();
    const keys      = Object.keys(schedules);
    if (!keys.length) return;
    const now      = Date.now();
    let changed    = false;
    const allChats = await kv_keys("chat:");
    for (const k of keys) {
      const s          = schedules[k];
      const intervalMs = (s.hours || 1) * 3600000;
      if (now - (s.lastSent || 0) >= intervalMs) {
        console.log("Sending schedule:", k, "to", s.chatId);
        if (s.chatId === "all") {
          for (const ck of allChats) {
            const raw = await kv_get(ck);
            if (raw) {
              const c = typeof raw === "string" ? JSON.parse(raw) : raw;
              try { await sendMsg(c.id, s.message, false); } catch {}
            }
          }
        } else {
          try { await sendMsg(Number(s.chatId), s.message, false); } catch(e) { console.error("Schedule send error:", e.message); }
        }
        schedules[k].lastSent = now;
        changed = true;
      }
    }
    if (changed) await kv_set("schedules", JSON.stringify(schedules));
  } catch (e) { console.error("Schedule error:", e); }
});

// ══ Start Server ══════════════════════════════════════════════
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🤖 طمطم Bot running on port ${PORT}`);
  console.log("🔗 Set webhook at: /init");
});
