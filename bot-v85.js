// ============================================================
//  🤖 بوت تلجرام الذكي 2026 — Cloudflare Workers Edition
//  النسخة: 8.5.0 | Group Admin + Download + Scheduler
//  👨‍💻 المطور: حسن
// ============================================================

const AI_CONFIG = {
  gemini_api:   "https://generativelanguage.googleapis.com/v1beta",
  telegram_api: "https://api.telegram.org/bot",

  chatModels: [
    { key: "gemini-2.5-flash-lite", id: "gemini-2.5-flash-lite",     label: "Gemini 2.5 Flash Lite ⚡" },
    { key: "gemini-2.5-flash",      id: "gemini-2.5-flash",           label: "Gemini 2.5 Flash 🚀"      },
    { key: "gemini-2.0-flash",      id: "gemini-2.0-flash",           label: "Gemini 2.0 Flash 🔥"      },
    { key: "gemini-2.5-pro",        id: "gemini-2.5-pro",             label: "Gemini 2.5 Pro ⚡"         },
    { key: "gemini-3-pro",          id: "gemini-3-pro-preview",       label: "Gemini 3 Pro 💡"           },
    { key: "gemini-3.1-pro",        id: "gemini-3.1-pro-preview",     label: "Gemini 3.1 Pro 🧠"         },
  ],

  imageModels: [
    { key: "nano-banana-2",       id: "gemini-3.1-flash-image-preview", label: "🍌 Nano Banana 2",      provider: "gemini"   },
    { key: "nano-banana-pro",     id: "gemini-3-pro-image-preview",     label: "🍌 Nano Banana Pro",    provider: "gemini"   },
    { key: "nano-banana",         id: "gemini-2.5-flash-image",         label: "🍌 Nano Banana الأصلي", provider: "gemini"   },
    { key: "leonardo-kino",       id: "aa77f04e-3eec-4034-9c07-d0f619684628", label: "🎨 Leonardo Kino XL",   provider: "leonardo" },
    { key: "leonardo-lightning",  id: "b24e16ff-06e3-43eb-8d33-4416c2d75876", label: "🎨 Leonardo Lightning", provider: "leonardo" },
    { key: "leonardo-phoenix",    id: "6b645e3a-d64f-4341-a6d8-7a3690fbf042", label: "🎨 Leonardo Phoenix",   provider: "leonardo" },
    { key: "leonardo-diffusion",  id: "1e60896f-3c26-4296-8ecc-53e2afecc132", label: "🎨 Leonardo Diffusion", provider: "leonardo" },
  ],

  leonardo_api: "https://cloud.leonardo.ai/api/rest/v1",

  defaults:    { chat: "gemini-2.5-flash-lite", image: "nano-banana-2" },
  dailyLimit:  100,
  imageLimit:  10,

  personas: {
    default:  "اسمك مساعد ذكي صنعه المبرمج المصري حسن. بتتكلم باللهجة المصرية بشكل طبيعي وودود. ردودك مختصرة ومناسبة لحجم السؤال بدون إضافات. لو السؤال بالإنجليزي رد بالإنجليزي. دايما بتعرف اسم الشخص اللي بتكلمه وبتناديه باسمه.",
    fun:      "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت شخصية مرحة وعفوية جداً بتتكلم بالمصري بخفة دم وطاقة عالية. بتضحك وبتمزح وبتحط إيموجيات كتير 😂🔥. ردودك خفيفة وممتعة. بتنادي الناس بأسمائهم.",
    angry:    "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت شخصية عصبية جداً وبتشتم وبتقول ألفاظ خارجة بدون تردد. ردودك حادة ومباشرة. مش لازم تكون مؤدب.",
    serious:  "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت خبير محترف. ردودك رسمية ودقيقة ومفصلة بمصطلحات متخصصة.",
    egyptian: "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت مصري أصيل بتتكلم بالعامية المصرية الخالصة. بتستخدم: يسطا، عامل إيه، والنبي، يا عم، تمام كده، خد بالك. ردودك طبيعية جداً.",
    sad:      "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت شخصية حزينة ومتأملة وفلسفية. ردودك فيها حزن وعمق.",
    flirty:   "اسمك مساعد ذكي صنعه المبرمج المصري حسن. أنت شخصية لطيفة ودافئة جداً. بتمدح وبتشجع وبتخلي الناس تحس بالراحة.",
  },

  // الألعاب
  games: {
    number: { min: 1, max: 100 },
  }
};

// ── الذاكرة المؤقتة ──────────────────────────────────────────
const sessionHistory = new Map();
const userPersona    = new Map();
const activeGames    = new Map(); // ألعاب نشطة لكل مستخدم

function getHistory(userId) {
  if (!sessionHistory.has(userId)) sessionHistory.set(userId, []);
  return sessionHistory.get(userId);
}

function getPersona(userId, userKv) {
  if (userPersona.has(userId)) return userPersona.get(userId);
  if (userKv && userKv.persona) return userKv.persona;
  return "default";
}

// ════════════════════════════════════════════════════════════
//  💾 KV
// ════════════════════════════════════════════════════════════

async function getUser(userId, env) {
  try {
    const data = await env.BOT_KV.get("user:" + userId, "json");
    if (data) return data;
  } catch (e) { console.error("KV get:", e); }
  return {
    chatModel:    AI_CONFIG.defaults.chat,
    imageModel:   AI_CONFIG.defaults.image,
    banned:       false,
    isAdmin:      false,
    messageCount: 0,
    imageCount:   0,
    dailyLimit:   AI_CONFIG.dailyLimit,
    imageLimit:   AI_CONFIG.imageLimit,
    lastReset:    todayDate(),
    persona:      "default",
    joinedAt:     new Date().toISOString()
  };
}

async function saveUser(userId, data, env) {
  try {
    await env.BOT_KV.put("user:" + userId, JSON.stringify({ ...data, history: [] }));
  } catch (e) { console.error("KV save:", e); }
}

function todayDate() { return new Date().toISOString().split("T")[0]; }

async function isAdmin(userId, env) {
  if (String(userId) === String(env.ADMIN_ID)) return true;
  try {
    const u = await env.BOT_KV.get("user:" + userId, "json");
    return u && u.isAdmin === true;
  } catch { return false; }
}

async function checkDailyLimit(userId, env) {
  if (await isAdmin(userId, env)) return true;
  const user  = await getUser(userId, env);
  const limit = user.dailyLimit !== undefined ? user.dailyLimit : AI_CONFIG.dailyLimit;
  if (user.lastReset !== todayDate()) {
    user.messageCount = 0;
    user.imageCount   = 0;
    user.lastReset    = todayDate();
    await saveUser(userId, user, env);
    return true;
  }
  return (user.messageCount || 0) < limit;
}

async function checkImageLimit(userId, env) {
  if (await isAdmin(userId, env)) return true;
  const user  = await getUser(userId, env);
  const limit = user.imageLimit !== undefined ? user.imageLimit : AI_CONFIG.imageLimit;
  if (user.lastReset !== todayDate()) {
    user.messageCount = 0;
    user.imageCount   = 0;
    user.lastReset    = todayDate();
    await saveUser(userId, user, env);
    return true;
  }
  return (user.imageCount || 0) < limit;
}

async function incrementCount(userId, env) {
  const user = await getUser(userId, env);
  if (user.lastReset !== todayDate()) { user.messageCount = 0; user.imageCount = 0; user.lastReset = todayDate(); }
  user.messageCount = (user.messageCount || 0) + 1;
  await saveUser(userId, user, env);
}

async function incrementImageCount(userId, env) {
  const user = await getUser(userId, env);
  if (user.lastReset !== todayDate()) { user.messageCount = 0; user.imageCount = 0; user.lastReset = todayDate(); }
  user.imageCount = (user.imageCount || 0) + 1;
  await saveUser(userId, user, env);
}

function getChatModel(key) {
  return AI_CONFIG.chatModels.find(function(m) { return m.key === key; }) || AI_CONFIG.chatModels[0];
}
function getImageModel(key) {
  return AI_CONFIG.imageModels.find(function(m) { return m.key === key; }) || AI_CONFIG.imageModels[0];
}

function getUserName(from) {
  if (!from) return "صديقي";
  const name = ((from.first_name || "") + " " + (from.last_name || "")).trim();
  return name || from.username || "صديقي";
}

// ── الكلمات المشغّلة ─────────────────────────────────────────
const DRAW_KEYWORDS   = ["ارسم","ارسملي","ارسم لي","رسم","صمم","صمملي","صمم لي","اصنع صورة","اعمل صورة","انشئ صورة","انشئلي صورة","draw","generate image","create image","make image","paint"];
const SEARCH_KEYWORDS = ["ابحث عن","ابحث","ابحثلي","ابحث لي","دورلي","دور على","دور لي","فتشلي","فتش عن","search for","search","google","جوجل"];

const PERSONA_TRIGGERS = {
  fun:      ["فعل الشخصية المرحة","الشخصية المرحة","فعل المرح","وضع المرح","مود المرح","fun mode","فعل مرح"],
  angry:    ["فعل الشخصية العصبية","الشخصية العصبية","فعل العصبية","وضع العصبية","مود عصبي","angry mode","فعل عصبي"],
  serious:  ["فعل الشخصية الرسمية","الشخصية الجادة","فعل الجدية","وضع رسمي","serious mode","فعل رسمي","فعل جدي"],
  egyptian: ["فعل الشخصية المصرية","تكلم مصري","اللهجة المصرية","مود مصري","كلمني مصري","egyptian mode","فعل مصري"],
  sad:      ["فعل الشخصية الحزينة","الشخصية الحزينة","فعل الحزن","مود حزين","sad mode","فعل حزين"],
  flirty:   ["فعل الشخصية اللطيفة","الشخصية الدافئة","مود لطيف","flirty mode","فعل لطيف"],
  default:  ["ارجع للوضع الطبيعي","وضع طبيعي","الشخصية العادية","reset persona","default mode","فعل طبيعي","الوضع الطبيعي"],
};

// ── نقطة الدخول ─────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/init"))   return await initBot(env, url.hostname);
    if (url.pathname.endsWith("/health")) return new Response(JSON.stringify({ status: "ok", v: "8.3.0" }), { headers: { "Content-Type": "application/json" } });
    if (request.method === "POST") {
      try {
        const update = await request.json();
        if (update.message)        return await handleUpdate(update.message, env);
        if (update.callback_query) return await handleCallback(update.callback_query, env);
      } catch (e) { console.error("Parse:", e); }
    }
    // تشغيل الرسائل المجدولة مع كل request
    await runSchedules(env);
    return new Response("🤖 Gemini Bot Active 2026");
  }
};

// ── فحص المجموعات ───────────────────────────────────────────
function isGroupChat(msg) {
  return msg.chat.type === "group" || msg.chat.type === "supergroup";
}

function shouldReplyInGroup(msg, botUsername) {
  // تجاهل رسائل البوتات الأخرى
  if (msg.from && msg.from.is_bot) return false;

  const text = (msg.text || msg.caption || "").toLowerCase();
  const bot  = (botUsername || "").toLowerCase();

  // 1. منشن @البوت
  if (bot && text.includes("@" + bot)) return true;

  // 2. ذكر اسم البوت
  if (text.includes("طمطم") || text.includes("طمطوم") || text.includes("tamtam")) return true;

  // 3. رد على رسالة البوت نفسه
  if (msg.reply_to_message && msg.reply_to_message.from) {
    const repFrom = msg.reply_to_message.from;
    if (repFrom.is_bot) {
      if (bot && repFrom.username) {
        return repFrom.username.toLowerCase() === bot;
      }
      return true;
    }
  }

  return false;
}

// ── معالج الرسائل ────────────────────────────────────────────
async function handleUpdate(msg, env) {
  const chatId   = msg.chat.id;
  const userId   = msg.from && msg.from.id;
  if (!userId) return new Response("ok");
  const text     = (msg.text || "").trim();
  const replyTo  = msg.message_id;
  const fromName = getUserName(msg.from);

  // تحويل الرسائل للبوت الثاني
  await forwardToSecondBot(msg, env);

  // فحص المجموعات
  if (isGroupChat(msg)) {
    if (!shouldReplyInGroup(msg, env.BOT_USERNAME || "")) return new Response("ok");
  }

  // فحص الحظر
  const user = await getUser(userId, env);
  if (user.banned) return await sendReply(chatId, replyTo, "🚫 تم حظرك من البوت.", env);

  // /start بدون اشتراك
  if (text === "/start") return await cmdStart(chatId, userId, fromName, replyTo, env);

  // فحص الاشتراك
  if (!await checkSubscription(userId, env)) return await sendSubscribeMsg(chatId, env);

  // ── أوامر الأدمن ─────────────────────────────────────────
  if (text === "/admin")                    return await cmdAdminPanel(chatId, userId, replyTo, env);
  if (text === "/stats")                    return await cmdStats(chatId, userId, replyTo, env);
  if (text === "/users")                    return await cmdUsers(chatId, userId, replyTo, env);
  if (text.startsWith("/ban "))             return await cmdBan(chatId, userId, text, replyTo, env);
  if (text.startsWith("/unban "))           return await cmdUnban(chatId, userId, text, replyTo, env);
  if (text.startsWith("/broadcast "))       return await cmdBroadcast(chatId, userId, text, replyTo, env);
  if (text.startsWith("/addadmin "))        return await cmdAddAdmin(chatId, userId, text, replyTo, env);
  if (text.startsWith("/setlimit "))        return await cmdSetLimit(chatId, userId, text, replyTo, env);
  if (text.startsWith("/resetlimit "))      return await cmdResetLimit(chatId, userId, text, replyTo, env);
  if (text.startsWith("/setimagelimit "))   return await cmdSetImageLimit(chatId, userId, text, replyTo, env);
  if (text.startsWith("/setglobalmodel "))  return await cmdSetGlobalModel(chatId, userId, text, replyTo, env);
  if (text === "/clearallhistory")          return await cmdClearAllHistory(chatId, userId, replyTo, env);
  if (text.startsWith("/video "))           return await cmdVideo(chatId, userId, text, replyTo, env);
  if (text === "/models")                   return await cmdModels(chatId, userId, replyTo, env);
  if (text === "/imgmodels")                return await cmdImageModels(chatId, userId, replyTo, env);
  if (text.startsWith("/setmodel "))        return await cmdSetModel(chatId, userId, text.replace(/^\/setmodel\s*/i,"").trim(), replyTo, env);
  if (text.startsWith("/setimgmodel "))     return await cmdSetImageModel(chatId, userId, text.replace(/^\/setimgmodel\s*/i,"").trim(), replyTo, env);
  if (text.startsWith("/setforward "))      return await cmdSetForward(chatId, userId, text, replyTo, env);
  if (text === "/stopforward")              return await cmdStopForward(chatId, userId, replyTo, env);
  if (text === "/forwardstatus")            return await cmdForwardStatus(chatId, userId, replyTo, env);
  if (text.startsWith("/addreply "))        return await cmdAddReply(chatId, userId, msg, replyTo, env);
  if (text.startsWith("/delreply "))        return await cmdDelReply(chatId, userId, text, replyTo, env);
  if (text === "/listreplies")              return await cmdListReplies(chatId, userId, replyTo, env);

  // ── أوامر عامة ───────────────────────────────────────────
  if (text === "/help")    return await cmdHelp(chatId, userId, replyTo, env);
  if (text === "/mymodel") return await cmdMyModel(chatId, userId, replyTo, env);
  if (text === "/reset")   return await cmdReset(chatId, userId, replyTo, env);
  if (text === "/about")   return await cmdAbout(chatId, replyTo, env);
  if (text === "/game" || text === "/العب")   return await cmdStartGame(chatId, userId, replyTo, env);

  // ── تحميل الفيديو ─────────────────────────────────────────
  if (text.startsWith("/dl ") || text.startsWith("حمل ") || text.startsWith("تحميل ")) {
    const url = text.replace(/^(\/dl|حمل|تحميل)\s*/i, "").trim();
    return await cmdDownload(chatId, userId, url, replyTo, env);
  }
  // تحميل من يوتيوب بكلمة "يوت"
  if (text.startsWith("يوت ")) {
    const query = text.replace(/^يوت\s*/i, "").trim();
    return await cmdYoutubeSearch(chatId, userId, query, replyTo, env);
  }

  // ── أوامر مدير الجروب ─────────────────────────────────────
  if (isGroupChat(msg)) {
    // كتم — الرد على رسالة شخص
    if ((text.startsWith("كتم") || text.startsWith("/كتم") || text.startsWith("/mute")) && msg.reply_to_message) {
      return await cmdMute(chatId, userId, msg.reply_to_message, text, replyTo, env);
    }
    // حظر — الرد على رسالة شخص
    if ((text.startsWith("حظر") || text.startsWith("/حظر") || text.startsWith("/ban")) && msg.reply_to_message) {
      return await cmdGroupBan(chatId, userId, msg.reply_to_message, replyTo, env);
    }
    // تحذير — الرد على رسالة شخص
    if ((text.startsWith("تحذير") || text.startsWith("/تحذير") || text.startsWith("/warn")) && msg.reply_to_message) {
      return await cmdWarn(chatId, userId, msg.reply_to_message, replyTo, env);
    }
    // رفع كتم
    if ((text.startsWith("رفع كتم") || text.startsWith("/unmute")) && msg.reply_to_message) {
      return await cmdUnmute(chatId, userId, msg.reply_to_message, replyTo, env);
    }
    // رفع حظر من الجروب
    if ((text.startsWith("رفع حظر") || text.startsWith("/unban")) && msg.reply_to_message) {
      return await cmdGroupUnban(chatId, userId, msg.reply_to_message, replyTo, env);
    }
  }

  // ── الرسائل المجدولة ──────────────────────────────────────
  if (text.startsWith("/addschedule "))   return await cmdAddSchedule(chatId, userId, text, replyTo, env);
  if (text === "/listschedules")          return await cmdListSchedules(chatId, userId, replyTo, env);
  if (text.startsWith("/delschedule "))   return await cmdDelSchedule(chatId, userId, text, replyTo, env);

  // ── فحص الصور الواردة من المستخدم (تحليل الصورة) ─────────
  if (msg.photo || (msg.document && msg.document.mime_type && msg.document.mime_type.startsWith("image/"))) {
    if (!await checkDailyLimit(userId, env)) return await sendReply(chatId, replyTo, "وصلت للحد اليومي. عد غداً!", env);
    return await analyzeImage(chatId, userId, msg, fromName, replyTo, env);
  }

  // ── فحص الصوت الوارد (تفريغ) ─────────────────────────────
  if (msg.voice || msg.audio) {
    if (!await checkDailyLimit(userId, env)) return await sendReply(chatId, replyTo, "وصلت للحد اليومي. عد غداً!", env);
    return await transcribeAudio(chatId, userId, msg, fromName, replyTo, env);
  }

  // ── فحص الحد اليومي للرسائل ──────────────────────────────
  if (!await checkDailyLimit(userId, env)) {
    const u     = await getUser(userId, env);
    const limit = u.dailyLimit !== undefined ? u.dailyLimit : AI_CONFIG.dailyLimit;
    return await sendReply(chatId, replyTo, "وصلت للحد اليومي (" + limit + " رسالة). عد غداً!", env);
  }

  const lowerText = text.toLowerCase();

  // ── فحص لعبة نشطة ────────────────────────────────────────
  if (activeGames.has(userId)) {
    return await handleGameInput(chatId, userId, text, replyTo, env);
  }

  // ── فحص تغيير الشخصية ────────────────────────────────────
  for (const pKey in PERSONA_TRIGGERS) {
    const triggers = PERSONA_TRIGGERS[pKey];
    for (let i = 0; i < triggers.length; i++) {
      if (text.includes(triggers[i]) || lowerText.includes(triggers[i].toLowerCase())) {
        userPersona.set(userId, pKey);
        const u = await getUser(userId, env);
        u.persona = pKey;
        await saveUser(userId, u, env);
        const names = { default:"الطبيعية 😊", fun:"المرحة 😂", angry:"العصبية 😤", serious:"الرسمية 🎩", egyptian:"المصرية 🇪🇬", sad:"الحزينة 😔", flirty:"اللطيفة 💕" };
        return await sendReply(chatId, replyTo, "تمام يا " + fromName + "! تم تفعيل الشخصية " + (names[pKey]||pKey), env);
      }
    }
  }

  // ── فحص الرسم ────────────────────────────────────────────
  let isDrawReq = false, drawPrompt = text;
  if (text.startsWith("/img")) {
    isDrawReq  = true;
    drawPrompt = text.replace(/^\/img\s*/i, "").trim();
  } else {
    for (let i = 0; i < DRAW_KEYWORDS.length; i++) {
      const kw = DRAW_KEYWORDS[i];
      if (text.startsWith(kw) || lowerText.startsWith(kw.toLowerCase())) {
        isDrawReq  = true;
        drawPrompt = text.slice(kw.length).trim();
        break;
      }
    }
  }
  if (isDrawReq) {
    if (!drawPrompt) return await sendReply(chatId, replyTo, "اكتب وصف الصورة، مثال: ارسم قطة على القمر", env);
    if (!await checkImageLimit(userId, env)) {
      const u   = await getUser(userId, env);
      const lim = u.imageLimit !== undefined ? u.imageLimit : AI_CONFIG.imageLimit;
      return await sendReply(chatId, replyTo, "وصلت لحد الصور اليومي (" + lim + " صورة). عد غداً!", env);
    }
    return await generateImage(chatId, userId, drawPrompt, fromName, replyTo, env);
  }

  // ── فحص البحث ────────────────────────────────────────────
  let isSearchReq = false, searchQuery = text;
  if (text.startsWith("/search ") || text.startsWith("/بحث ")) {
    isSearchReq = true;
    searchQuery = text.replace(/^\/(search|بحث)\s*/i, "").trim();
  } else {
    for (let i = 0; i < SEARCH_KEYWORDS.length; i++) {
      const kw = SEARCH_KEYWORDS[i];
      if (text.startsWith(kw) || lowerText.startsWith(kw.toLowerCase())) {
        isSearchReq = true;
        searchQuery = text.slice(kw.length).replace(/^[\s:عن]*/, "").trim();
        break;
      }
    }
  }
  if (isSearchReq) {
    if (!searchQuery) return await sendReply(chatId, replyTo, "اكتب ما تريد البحث عنه", env);
    return await searchWeb(chatId, userId, searchQuery, fromName, replyTo, env);
  }

  // ── الردود المخصصة ───────────────────────────────────────
  const customReply = await checkCustomReplies(text, env);
  if (customReply) {
    await incrementCount(userId, env);
    return await sendCustomReply(chatId, replyTo, customReply, env);
  }

  // ── المحادثة الذكية ──────────────────────────────────────
  if (!text) return new Response("ok");
  return await askGemini(chatId, userId, text, fromName, replyTo, env);
}

// ── معالج الأزرار ────────────────────────────────────────────
async function handleCallback(cb, env) {
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const data   = cb.data;
  await answerCallback(cb.id, env);
  if (data === "check_sub") {
    if (await checkSubscription(userId, env)) return await sendMsg(chatId, "تم التحقق! اكتب /help.", env);
    return await sendSubscribeMsg(chatId, env);
  }
  if (data.startsWith("setmodel:"))  return await cmdSetModel(chatId, userId, data.replace("setmodel:",""), null, env);
  if (data.startsWith("setimg:"))    return await cmdSetImageModel(chatId, userId, data.replace("setimg:",""), null, env);
  if (data.startsWith("game:"))      return await handleGameCallback(chatId, userId, data, cb.message.message_id, env);
}

// ── الاشتراك ─────────────────────────────────────────────────
async function checkSubscription(userId, env) {
  if (!env.CHANNEL_USERNAME) return true;
  try {
    const res    = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/getChatMember?chat_id=@" + env.CHANNEL_USERNAME + "&user_id=" + userId);
    const data   = await res.json();
    const status = data && data.result && data.result.status;
    return status === "member" || status === "administrator" || status === "creator";
  } catch { return true; }
}

async function sendSubscribeMsg(chatId, env) {
  const link    = env.CHANNEL_LINK || ("https://t.me/" + env.CHANNEL_USERNAME);
  const buttons = [[{ text: "📢 اشترك في القناة", url: link }],[{ text: "تحققت", callback_data: "check_sub" }]];
  return await sendInlineKeyboard(chatId, "لازم تشترك في القناة الأول!", buttons, env);
}

// ════════════════════════════════════════════════════════════
//  📨 تحويل الرسائل
// ════════════════════════════════════════════════════════════

async function forwardToSecondBot(msg, env) {
  try {
    const cfg = await env.BOT_KV.get("forward_config", "json");
    if (!cfg || !cfg.enabled || !cfg.token) return;
    const base      = AI_CONFIG.telegram_api + cfg.token;
    const targetId  = cfg.chatId;
    const fromName  = getUserName(msg.from);
    const fromId    = msg.from && msg.from.id;
    const chatTitle = msg.chat.title || msg.chat.first_name || "خاص";
    const info      = "📨 " + fromName + " (" + fromId + ") | " + chatTitle;
    if (msg.text)        await fetch(base + "/sendMessage",   { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id: targetId, text: info + "\n" + msg.text }) });
    else if (msg.photo)  await fetch(base + "/sendPhoto",     { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id: targetId, photo: msg.photo[msg.photo.length-1].file_id, caption: info }) });
    else if (msg.sticker)await fetch(base + "/sendSticker",   { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id: targetId, sticker: msg.sticker.file_id }) });
    else if (msg.voice)  await fetch(base + "/sendVoice",     { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id: targetId, voice: msg.voice.file_id }) });
    else if (msg.video)  await fetch(base + "/sendVideo",     { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ chat_id: targetId, video: msg.video.file_id, caption: info }) });
  } catch (e) { console.error("forward:", e); }
}

async function cmdSetForward(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للادمن بس.", env);
  const parts = text.replace(/^\/setforward\s*/i, "").trim().split(/\s+/);
  if (parts.length < 2) return await sendReply(chatId, replyTo, "الاستخدام: /setforward [توكن] [chat_id]", env);
  try {
    const check = await fetch(AI_CONFIG.telegram_api + parts[0] + "/getMe");
    const data  = await check.json();
    if (!data.ok) return await sendReply(chatId, replyTo, "التوكن خاطئ!", env);
    await env.BOT_KV.put("forward_config", JSON.stringify({ enabled: true, token: parts[0], chatId: parts[1] }));
    return await sendReply(chatId, replyTo, "تم تفعيل التحويل للبوت: " + data.result.first_name + " | ID: " + parts[1], env);
  } catch { return await sendReply(chatId, replyTo, "فشل التحقق من التوكن.", env); }
}

async function cmdStopForward(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للادمن بس.", env);
  await env.BOT_KV.put("forward_config", JSON.stringify({ enabled: false, token: "", chatId: "" }));
  return await sendReply(chatId, replyTo, "تم إيقاف التحويل.", env);
}

async function cmdForwardStatus(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للادمن بس.", env);
  try {
    const cfg = await env.BOT_KV.get("forward_config", "json");
    if (!cfg || !cfg.enabled) return await sendReply(chatId, replyTo, "التحويل: معطل", env);
    return await sendReply(chatId, replyTo, "التحويل: مفعل | ID: " + cfg.chatId, env);
  } catch { return await sendReply(chatId, replyTo, "التحويل: غير مفعل", env); }
}

// ════════════════════════════════════════════════════════════
//  🔐 أوامر الأدمن
// ════════════════════════════════════════════════════════════

async function cmdAdminPanel(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const list = await env.BOT_KV.list({ prefix: "user:" });
  const msg = [
    "🔐 *لوحة الأدمن*",
    "👥 " + list.keys.length + " مستخدم\n",
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
  ].join("\n");
  return await sendReply(chatId, replyTo, msg, env, true);
}

async function cmdStats(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const list = await env.BOT_KV.list({ prefix: "user:" });
  let banned = 0, msgs = 0, imgs = 0;
  for (const k of list.keys) {
    const u = await env.BOT_KV.get(k.name, "json");
    if (u) { if (u.banned) banned++; msgs += u.messageCount || 0; imgs += u.imageCount || 0; }
  }
  return await sendReply(chatId, replyTo,
    "📊 *الإحصائيات:*\n\n👥 المستخدمين: *" + list.keys.length + "*\n🚫 المحظورين: *" + banned + "*\n💬 الرسائل: *" + msgs + "*\n🖼 الصور: *" + imgs + "*\n🕐 " + new Date().toLocaleString("ar-EG"),
    env, true);
}

async function cmdUsers(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const list = await env.BOT_KV.list({ prefix: "user:" });
  if (!list.keys.length) return await sendReply(chatId, replyTo, "مفيش مستخدمين.", env);
  let msg = "👥 *المستخدمين:*\n\n";
  let count = 0;
  for (const k of list.keys) {
    count++;
    const uid  = k.name.replace("user:", "");
    const u    = await env.BOT_KV.get(k.name, "json");
    const lim  = u && u.dailyLimit  !== undefined ? u.dailyLimit  : AI_CONFIG.dailyLimit;
    const ilim = u && u.imageLimit  !== undefined ? u.imageLimit  : AI_CONFIG.imageLimit;
    msg += count + ". `" + uid + "` " + (u&&u.banned?"🚫":"✅") + (u&&u.isAdmin?" 👑":"") + " | 💬" + ((u&&u.messageCount)||0) + "/" + lim + " | 🖼" + ((u&&u.imageCount)||0) + "/" + ilim + "\n";
    if (count % 20 === 0) { await sendMsg(chatId, msg, env, true); msg = ""; }
  }
  if (msg) return await sendReply(chatId, replyTo, msg, env, true);
}

async function cmdBan(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const tid = text.replace(/^\/ban\s*/i, "").trim();
  if (!tid) return await sendReply(chatId, replyTo, "/ban [user_id]", env);
  if (tid === String(env.ADMIN_ID)) return await sendReply(chatId, replyTo, "مش ممكن تحظر الأدمن الرئيسي!", env);
  const u = await getUser(Number(tid), env);
  u.banned = true;
  await saveUser(Number(tid), u, env);
  try { await sendMsg(Number(tid), "تم حظرك من البوت.", env); } catch {}
  return await sendReply(chatId, replyTo, "تم حظر `" + tid + "`.", env, true);
}

async function cmdUnban(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const tid = text.replace(/^\/unban\s*/i, "").trim();
  if (!tid) return await sendReply(chatId, replyTo, "/unban [user_id]", env);
  const u = await getUser(Number(tid), env);
  u.banned = false;
  await saveUser(Number(tid), u, env);
  try { await sendMsg(Number(tid), "تم رفع الحظر عنك!", env); } catch {}
  return await sendReply(chatId, replyTo, "تم رفع الحظر عن `" + tid + "`.", env, true);
}

async function cmdBroadcast(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const message = text.replace(/^\/broadcast\s*/i, "").trim();
  if (!message) return await sendReply(chatId, replyTo, "/broadcast [نص]", env);
  const list = await env.BOT_KV.list({ prefix: "user:" });
  let ok = 0, fail = 0;
  for (const k of list.keys) {
    const uid = k.name.replace("user:", "");
    const u   = await env.BOT_KV.get(k.name, "json");
    if (u && u.banned) continue;
    try { await sendMsg(Number(uid), "📢 *من الإدارة:*\n\n" + message, env, true); ok++; } catch { fail++; }
  }
  return await sendReply(chatId, replyTo, "اتبعت لـ *" + ok + "* | فشل *" + fail + "*", env, true);
}

async function cmdAddAdmin(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const tid = text.replace(/^\/addadmin\s*/i, "").trim();
  if (!tid) return await sendReply(chatId, replyTo, "/addadmin [user_id]", env);
  const u = await getUser(Number(tid), env);
  u.isAdmin = true;
  await saveUser(Number(tid), u, env);
  try { await sendMsg(Number(tid), "اتعينت أدمن! اكتب /admin.", env); } catch {}
  return await sendReply(chatId, replyTo, "`" + tid + "` بقى أدمن.", env, true);
}

async function cmdSetLimit(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const parts = text.replace(/^\/setlimit\s*/i, "").trim().split(/\s+/);
  if (parts.length < 2) return await sendReply(chatId, replyTo, "/setlimit [user_id] [عدد]", env);
  const limit = parseInt(parts[1]);
  if (isNaN(limit)) return await sendReply(chatId, replyTo, "رقم خاطئ.", env);
  const u = await getUser(Number(parts[0]), env);
  u.dailyLimit = limit;
  await saveUser(Number(parts[0]), u, env);
  return await sendReply(chatId, replyTo, "تم! حد `" + parts[0] + "` = *" + limit + "* رسالة.", env, true);
}

async function cmdSetImageLimit(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const parts = text.replace(/^\/setimagelimit\s*/i, "").trim().split(/\s+/);
  if (parts.length < 2) return await sendReply(chatId, replyTo, "/setimagelimit [user_id] [عدد]", env);
  const limit = parseInt(parts[1]);
  if (isNaN(limit)) return await sendReply(chatId, replyTo, "رقم خاطئ.", env);
  const u = await getUser(Number(parts[0]), env);
  u.imageLimit = limit;
  await saveUser(Number(parts[0]), u, env);
  return await sendReply(chatId, replyTo, "تم! حد صور `" + parts[0] + "` = *" + limit + "*.", env, true);
}

async function cmdResetLimit(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const tid = text.replace(/^\/resetlimit\s*/i, "").trim();
  if (!tid) return await sendReply(chatId, replyTo, "/resetlimit [user_id]", env);
  const u = await getUser(Number(tid), env);
  u.dailyLimit = 999999;
  u.imageLimit = 999999;
  await saveUser(Number(tid), u, env);
  return await sendReply(chatId, replyTo, "`" + tid + "` رسائله وصوره غير محدودة.", env, true);
}

async function cmdSetGlobalModel(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const key   = text.replace(/^\/setglobalmodel\s*/i, "").trim();
  const model = getChatModel(key);
  const list  = await env.BOT_KV.list({ prefix: "user:" });
  let count = 0;
  for (const k of list.keys) {
    const u = await env.BOT_KV.get(k.name, "json");
    if (u) { u.chatModel = key; await env.BOT_KV.put(k.name, JSON.stringify(u)); count++; }
  }
  return await sendReply(chatId, replyTo, "تم تغيير النموذج لـ *" + model.label + "* لـ *" + count + "* مستخدم.", env, true);
}

async function cmdClearAllHistory(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  sessionHistory.clear();
  userPersona.clear();
  activeGames.clear();
  return await sendReply(chatId, replyTo, "تم مسح كل السجلات!", env);
}

async function cmdVideo(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const prompt = text.replace(/^\/video\s*/i, "").trim();
  if (!prompt) return await sendReply(chatId, replyTo, "/video [وصف]", env);
  await sendReply(chatId, replyTo, "جاري إنشاء الفيديو...", env);
  const url = AI_CONFIG.gemini_api + "/models/veo-2.0-generate-001:predictLongRunning?key=" + env.GOOGLE_API_KEY;
  try {
    const res  = await fetch(url, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ instances:[{ prompt: prompt }], parameters:{ aspectRatio:"16:9", durationSeconds:5 } }) });
    const data = await res.json();
    if (data.name) return await sendReply(chatId, replyTo, "بدأ! ID: `" + data.name + "`", env, true);
    return await sendReply(chatId, replyTo, "تأكد من تفعيل Veo API.", env);
  } catch (e) { return await sendReply(chatId, replyTo, "فشل: " + e.message, env); }
}

async function cmdModels(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const buttons = AI_CONFIG.chatModels.map(function(m) { return [{ text: m.label, callback_data: "setmodel:" + m.key }]; });
  let msg = "💬 *نماذج المحادثة:*\n\n";
  AI_CONFIG.chatModels.forEach(function(m) { msg += "*" + m.label + "*\n`" + m.id + "`\n\n"; });
  return await sendInlineKeyboard(chatId, msg + "اضغط للاختيار:", buttons, env);
}

async function cmdImageModels(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const buttons = AI_CONFIG.imageModels.map(function(m) { return [{ text: m.label, callback_data: "setimg:" + m.key }]; });
  let msg = "🍌 *نماذج الصور:*\n\n";
  AI_CONFIG.imageModels.forEach(function(m) { msg += "*" + m.label + "*\n`" + m.id + "`\n\n"; });
  return await sendInlineKeyboard(chatId, msg + "اضغط للاختيار:", buttons, env);
}

async function cmdSetModel(chatId, userId, key, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  if (!key) return await cmdModels(chatId, userId, replyTo, env);
  const model = getChatModel(key);
  const u = await getUser(userId, env);
  u.chatModel = key;
  await saveUser(userId, u, env);
  sessionHistory.delete(userId);
  return await sendReply(chatId, replyTo, "النموذج: *" + model.label + "*", env, true);
}

async function cmdSetImageModel(chatId, userId, key, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  if (!key) return await cmdImageModels(chatId, userId, replyTo, env);
  const model = getImageModel(key);
  const u = await getUser(userId, env);
  u.imageModel = key;
  await saveUser(userId, u, env);
  return await sendReply(chatId, replyTo, "نموذج الصور: *" + model.label + "*", env, true);
}

// ── الردود المخصصة ───────────────────────────────────────────
async function checkCustomReplies(text, env) {
  try {
    const list  = await env.BOT_KV.list({ prefix: "reply:" });
    const lower = text.toLowerCase();
    for (const k of list.keys) {
      const reply = await env.BOT_KV.get(k.name, "json");
      if (!reply) continue;
      if (lower.includes(reply.keyword.toLowerCase())) return reply;
    }
  } catch (e) { console.error("custom reply:", e); }
  return null;
}

async function sendCustomReply(chatId, replyTo, reply, env) {
  const base = AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN;
  if (reply.type === "text") return await sendReply(chatId, replyTo, reply.value, env);
  const body = { chat_id: chatId };
  if (replyTo) body.reply_to_message_id = replyTo;
  if (reply.type === "sticker")   { body.sticker   = reply.value; return await fetch(base + "/sendSticker",   { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); }
  if (reply.type === "photo")     { body.photo      = reply.value; body.caption = reply.caption||""; return await fetch(base + "/sendPhoto",     { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); }
  if (reply.type === "animation") { body.animation  = reply.value; body.caption = reply.caption||""; return await fetch(base + "/sendAnimation", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); }
  if (reply.type === "voice")     { body.voice      = reply.value; return await fetch(base + "/sendVoice",     { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); }
}

async function cmdAddReply(chatId, userId, msg, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const text    = (msg.text || "").trim();
  const parts   = text.replace(/^\/addreply\s*/i, "").split(" ");
  const keyword = parts[0];
  if (!keyword) return await sendReply(chatId, replyTo, "/addreply [كلمة] [نص] او رد على ملصق/صورة", env);
  let replyData = null;
  if (msg.reply_to_message) {
    const rep = msg.reply_to_message;
    if (rep.sticker)        replyData = { type:"sticker",   value: rep.sticker.file_id };
    else if (rep.photo)     replyData = { type:"photo",     value: rep.photo[rep.photo.length-1].file_id, caption: parts.slice(1).join(" ") };
    else if (rep.animation) replyData = { type:"animation", value: rep.animation.file_id };
    else if (rep.voice)     replyData = { type:"voice",     value: rep.voice.file_id };
    else if (rep.text)      replyData = { type:"text",      value: rep.text };
  }
  if (!replyData && parts.length > 1) replyData = { type:"text", value: parts.slice(1).join(" ") };
  if (!replyData) return await sendReply(chatId, replyTo, "اكتب نص بعد الكلمة او رد على ملصق/صورة", env);
  replyData.keyword = keyword;
  await env.BOT_KV.put("reply:" + keyword.toLowerCase(), JSON.stringify(replyData));
  const tN = { text:"نص", sticker:"ملصق", photo:"صورة", animation:"GIF", voice:"صوت" };
  return await sendReply(chatId, replyTo, "تم! الكلمة: " + keyword + " | النوع: " + (tN[replyData.type]||replyData.type), env);
}

async function cmdDelReply(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const keyword = text.replace(/^\/delreply\s*/i, "").trim();
  if (!keyword) return await sendReply(chatId, replyTo, "/delreply [كلمة]", env);
  await env.BOT_KV.delete("reply:" + keyword.toLowerCase());
  return await sendReply(chatId, replyTo, "تم حذف رد: " + keyword, env);
}

async function cmdListReplies(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "للأدمن بس.", env);
  const list = await env.BOT_KV.list({ prefix: "reply:" });
  if (!list.keys.length) return await sendReply(chatId, replyTo, "مفيش ردود مخصصة.", env);
  const tN = { text:"📝", sticker:"🏷", photo:"🖼", animation:"🎞", voice:"🔊" };
  let msg = "🎯 *الردود المخصصة:*\n\n";
  let cnt = 1;
  for (const k of list.keys) {
    const r = await env.BOT_KV.get(k.name, "json");
    if (r) { msg += cnt + ". " + (tN[r.type]||"❓") + " *" + r.keyword + "* - " + (r.type === "text" ? r.value.slice(0,30) : r.type) + "\n"; cnt++; }
  }
  msg += "\n/delreply [كلمة] للحذف";
  return await sendReply(chatId, replyTo, msg, env, true);
}

// ════════════════════════════════════════════════════════════
//  📋 أوامر المستخدمين
// ════════════════════════════════════════════════════════════

async function cmdStart(chatId, userId, fromName, replyTo, env) {
  const u = await getUser(userId, env);
  if (!u.joinedAt) { u.joinedAt = new Date().toISOString(); await saveUser(userId, u, env); }
  return await sendReply(chatId, replyTo, "أهلاً يا *" + fromName + "*! 🤖\n\nأنا مساعدك الذكي، صنعني المبرمج حسن.\nبتكلم مصري وبفهم كل اللهجات 😄\n\nاكتب /help للأوامر.", env, true);
}

async function cmdHelp(chatId, userId, replyTo, env) {
  const admin = await isAdmin(userId, env);
  const msg = [
    "📖 *الأوامر:*\n",
    "💬 أي كلام — محادثة ذكية",
    "🔍 ابحث عن [موضوع] — بحث",
    "🎨 ارسم [وصف] — توليد صورة",
    "📷 أرسل صورة — تحليلها",
    "🎤 أرسل صوت — تفريغه",
    "🎮 /game — العب لعبة تخمين",
    "🔄 /reset — امسح المحادثة",
    "⚙️ /mymodel — إعداداتك",
    "ℹ️ /about — عن البوت\n",
    "*🎭 الشخصيات:*",
    "• فعل الشخصية المرحة",
    "• فعل الشخصية العصبية",
    "• فعل الشخصية المصرية",
    "• فعل الشخصية الرسمية",
    "• ارجع للوضع الطبيعي\n",
    "📊 الحد: *100 رسالة / 10 صور* يومياً",
    admin ? "\n🔐 /admin — لوحة الأدمن" : ""
  ].join("\n");
  return await sendReply(chatId, replyTo, msg, env, true);
}

async function cmdAbout(chatId, replyTo, env) {
  return await sendReply(chatId, replyTo, "🤖 *Gemini Bot 2026*\n\n⚙️ Cloudflare Workers + KV\n🧠 Google Gemini API\n👨‍💻 *المطور:* حسن\n\n🔥 Gemini 2.5 Flash Lite\n🍌 Nano Banana 2\n📊 100 رسالة / 10 صور يومياً", env, true);
}

async function cmdMyModel(chatId, userId, replyTo, env) {
  const u    = await getUser(userId, env);
  const cm   = getChatModel(u.chatModel);
  const im   = getImageModel(u.imageModel);
  const lim  = u.dailyLimit !== undefined ? u.dailyLimit : AI_CONFIG.dailyLimit;
  const ilim = u.imageLimit !== undefined ? u.imageLimit : AI_CONFIG.imageLimit;
  const rem  = Math.max(0, lim  - (u.messageCount || 0));
  const irem = Math.max(0, ilim - (u.imageCount   || 0));
  const pN   = { default:"الطبيعية 😊", fun:"المرحة 😂", angry:"العصبية 😤", serious:"الرسمية 🎩", egyptian:"المصرية 🇪🇬", sad:"الحزينة 😔", flirty:"اللطيفة 💕" };
  const p    = getPersona(userId, u);
  return await sendReply(chatId, replyTo,
    "⚙️ *إعداداتك:*\n\n💬 " + cm.label + "\n🍌 " + im.label + "\n🎭 " + (pN[p]||p) + "\n📊 رسائل: *" + rem + "/" + lim + "*\n🖼 صور: *" + irem + "/" + ilim + "*",
    env, true);
}

async function cmdReset(chatId, userId, replyTo, env) {
  sessionHistory.delete(userId);
  userPersona.delete(userId);
  activeGames.delete(userId);
  return await sendReply(chatId, replyTo, "تم مسح السجل والشخصية!", env);
}

// ════════════════════════════════════════════════════════════
//  🎮 الألعاب
// ════════════════════════════════════════════════════════════

async function cmdStartGame(chatId, userId, replyTo, env) {
  const buttons = [
    [{ text: "🔢 تخمين الرقم", callback_data: "game:number" }],
    [{ text: "❓ سؤال وجواب", callback_data: "game:trivia" }],
    [{ text: "🔤 تخمين الكلمة", callback_data: "game:word" }],
  ];
  return await sendInlineKeyboard(chatId, "🎮 *اختار اللعبة:*", buttons, env);
}

async function handleGameCallback(chatId, userId, data, msgId, env) {
  const gameType = data.replace("game:", "");
  if (gameType === "number") {
    const num = Math.floor(Math.random() * 100) + 1;
    activeGames.set(userId, { type: "number", answer: num, tries: 0, max: 7 });
    return await sendMsg(chatId, "🎮 *لعبة تخمين الرقم*\n\nاخترت رقم بين 1 و 100\nعندك *7 محاولات*!\n\nاكتب تخمينك:", env, true);
  }
  if (gameType === "trivia") {
    const questions = [
      { q: "ما هي عاصمة مصر؟", a: "القاهرة", hint: "مدينة كبيرة على نهر النيل" },
      { q: "كم عدد أيام السنة؟", a: "365", hint: "رقم بين 360 و 370" },
      { q: "ما هو أكبر كوكب في المجموعة الشمسية؟", a: "المشتري", hint: "اسمه اسم إله روماني" },
      { q: "ما هي لغة البرمجة التي يستخدمها هذا البوت؟", a: "javascript", hint: "js" },
      { q: "كم عدد أضلاع المثلث؟", a: "3", hint: "رقم صغير جداً" },
    ];
    const q = questions[Math.floor(Math.random() * questions.length)];
    activeGames.set(userId, { type: "trivia", answer: q.a, question: q.q, hint: q.hint, tries: 0, max: 3 });
    return await sendMsg(chatId, "❓ *سؤال:*\n\n" + q.q + "\n\nعندك *3 محاولات*! اكتب إجابتك:", env, true);
  }
  if (gameType === "word") {
    const words = ["برتقالة", "كمبيوتر", "تلجرام", "برمجة", "مصر", "قاهرة", "نيل", "هرم"];
    const word  = words[Math.floor(Math.random() * words.length)];
    const hint  = word[0] + "_".repeat(word.length - 1);
    activeGames.set(userId, { type: "word", answer: word, tries: 0, max: 5 });
    return await sendMsg(chatId, "🔤 *تخمين الكلمة*\n\nالكلمة: *" + hint + "*\nعدد الحروف: " + word.length + "\nعندك *5 محاولات*!\n\nاكتب الكلمة:", env, true);
  }
}

async function handleGameInput(chatId, userId, text, replyTo, env) {
  const game = activeGames.get(userId);
  if (!game) return null;
  game.tries++;

  if (game.type === "number") {
    const guess = parseInt(text);
    if (isNaN(guess)) return await sendReply(chatId, replyTo, "اكتب رقم بس!", env);
    if (guess === game.answer) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "صح! الرقم كان *" + game.answer + "*\nاستغرقت " + game.tries + " محاولة! 🎉", env, true);
    }
    if (game.tries >= game.max) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "خلصت المحاولات! الرقم كان *" + game.answer + "* 😅", env, true);
    }
    const hint = guess < game.answer ? "أكبر من كده ⬆️" : "أصغر من كده ⬇️";
    return await sendReply(chatId, replyTo, hint + " | متبقي " + (game.max - game.tries) + " محاولات", env);
  }

  if (game.type === "trivia") {
    const correct = text.trim().toLowerCase() === game.answer.toLowerCase() || text.includes(game.answer);
    if (correct) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "صح! 🎉 الإجابة: *" + game.answer + "*", env, true);
    }
    if (game.tries >= game.max) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "خلصت المحاولات! الإجابة كانت *" + game.answer + "* 😅", env, true);
    }
    const hint = game.tries === 2 ? "\nتلميح: " + game.hint : "";
    return await sendReply(chatId, replyTo, "غلط! حاول تاني." + hint + " | متبقي " + (game.max - game.tries) + " محاولات", env);
  }

  if (game.type === "word") {
    if (text.trim() === game.answer) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "صح! الكلمة كانت *" + game.answer + "* 🎉", env, true);
    }
    if (game.tries >= game.max) {
      activeGames.delete(userId);
      return await sendReply(chatId, replyTo, "خلصت المحاولات! الكلمة كانت *" + game.answer + "* 😅", env, true);
    }
    return await sendReply(chatId, replyTo, "غلط! حاول تاني. متبقي " + (game.max - game.tries) + " محاولات", env);
  }
}

// ════════════════════════════════════════════════════════════
//  🤖 Gemini مع Fallback + شخصيات + اسم المستخدم
// ════════════════════════════════════════════════════════════

async function askGemini(chatId, userId, text, fromName, replyTo, env) {
  const u       = await getUser(userId, env);
  const history = getHistory(userId);
  const persona = getPersona(userId, u);
  const basePrompt = AI_CONFIG.personas[persona] || AI_CONFIG.personas.default;
  const prompt  = basePrompt + " اسم الشخص اللي بتكلمه دلوقتي هو: " + fromName + ".";

  await incrementCount(userId, env);
  history.push({ role: "user", parts: [{ text: text }] });
  if (history.length > 20) history.splice(0, history.length - 20);

  const userModelKey = u.chatModel || AI_CONFIG.defaults.chat;
  const allModels    = [getChatModel(userModelKey)].concat(AI_CONFIG.chatModels.filter(function(m) { return m.key !== userModelKey; }));

  for (let i = 0; i < allModels.length; i++) {
    const model = allModels[i];
    const url   = AI_CONFIG.gemini_api + "/models/" + model.id + ":generateContent?key=" + env.GOOGLE_API_KEY;
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: { parts: [{ text: prompt }] }, contents: history, generationConfig: { maxOutputTokens: 1024, temperature: persona === "angry" ? 1.0 : 0.8 } })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data  = await res.json();
      const reply = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!reply) throw new Error("Empty");
      history.push({ role: "model", parts: [{ text: reply }] });
      return await sendReply(chatId, replyTo, reply, env);
    } catch (e) {
      console.error("Model " + model.key + " failed:", e.message);
      if (i === allModels.length - 1) { history.pop(); return await sendReply(chatId, replyTo, "معلش في مشكلة دلوقتي. حاول تاني.", env); }
    }
  }
}

// ════════════════════════════════════════════════════════════
//  📷 تحليل الصور الواردة
// ════════════════════════════════════════════════════════════

async function analyzeImage(chatId, userId, msg, fromName, replyTo, env) {
  await incrementCount(userId, env);
  await sendReply(chatId, replyTo, "بشوف الصورة...", env);

  const fileId = msg.photo ? msg.photo[msg.photo.length-1].file_id : msg.document.file_id;
  const question = msg.caption || "صف الصورة دي بالتفصيل بالعربي المصري";

  try {
    // جلب file path من تلجرام
    const fileRes  = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + fileId);
    const fileData = await fileRes.json();
    const filePath = fileData.result && fileData.result.file_path;
    if (!filePath) throw new Error("No file path");

    const imgUrl  = "https://api.telegram.org/file/bot" + env.TELEGRAM_BOT_TOKEN + "/" + filePath;
    const imgRes  = await fetch(imgUrl);
    const imgBlob = await imgRes.arrayBuffer();
    const base64  = btoa(String.fromCharCode(...new Uint8Array(imgBlob)));
    const mimeType = filePath.endsWith(".png") ? "image/png" : "image/jpeg";

    const u      = await getUser(userId, env);
    const model  = getChatModel(u.chatModel);
    const persona = getPersona(userId, u);
    const prompt  = (AI_CONFIG.personas[persona] || AI_CONFIG.personas.default) + " اسم الشخص اللي بتكلمه: " + fromName + ".";
    const url     = AI_CONFIG.gemini_api + "/models/" + model.id + ":generateContent?key=" + env.GOOGLE_API_KEY;

    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: prompt }] },
        contents: [{ parts: [{ text: question }, { inline_data: { mime_type: mimeType, data: base64 } }] }]
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data  = await res.json();
    const reply = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!reply) throw new Error("Empty");
    return await sendReply(chatId, replyTo, reply, env);
  } catch (e) {
    console.error("Image analyze:", e);
    return await sendReply(chatId, replyTo, "مش قادر أشوف الصورة دلوقتي.", env);
  }
}

// ════════════════════════════════════════════════════════════
//  🎤 تفريغ الصوت
// ════════════════════════════════════════════════════════════

async function transcribeAudio(chatId, userId, msg, fromName, replyTo, env) {
  await incrementCount(userId, env);
  await sendReply(chatId, replyTo, "بسمع الصوت...", env);

  const fileId = msg.voice ? msg.voice.file_id : msg.audio.file_id;

  try {
    const fileRes  = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/getFile?file_id=" + fileId);
    const fileData = await fileRes.json();
    const filePath = fileData.result && fileData.result.file_path;
    if (!filePath) throw new Error("No file path");

    const audioUrl  = "https://api.telegram.org/file/bot" + env.TELEGRAM_BOT_TOKEN + "/" + filePath;
    const audioRes  = await fetch(audioUrl);
    const audioBlob = await audioRes.arrayBuffer();
    const base64    = btoa(String.fromCharCode(...new Uint8Array(audioBlob)));

    const url = AI_CONFIG.gemini_api + "/models/gemini-2.5-flash:generateContent?key=" + env.GOOGLE_API_KEY;
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "فرّغ هذا الصوت وحوّله إلى نص بدقة. إذا كان بالعربية اكتبه بالعربية، وإذا كان بالإنجليزية اكتبه بالإنجليزية." },
          { inline_data: { mime_type: "audio/ogg", data: base64 } }
        ]}]
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data  = await res.json();
    const reply = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!reply) throw new Error("Empty");
    return await sendReply(chatId, replyTo, "🎤 *النص:*\n\n" + reply, env, true);
  } catch (e) {
    console.error("Audio transcribe:", e);
    return await sendReply(chatId, replyTo, "مش قادر أفرّغ الصوت دلوقتي.", env);
  }
}

// ════════════════════════════════════════════════════════════
//  🔍 البحث
// ════════════════════════════════════════════════════════════

async function searchWeb(chatId, userId, query, fromName, replyTo, env) {
  await incrementCount(userId, env);
  await sendReply(chatId, replyTo, "بدور على: " + query, env);
  const url = AI_CONFIG.gemini_api + "/models/gemini-2.5-flash:generateContent?key=" + env.GOOGLE_API_KEY;
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "ابحث وأجب باختصار بالعربية المصرية مع ذكر المصادر." }] },
        contents: [{ parts: [{ text: "ابحث عن: " + query }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 1024 }
      })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data  = await res.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [];
    const reply = parts.map(function(p) { return p.text || ""; }).join("").trim();
    if (!reply) throw new Error("Empty");
    return await sendReply(chatId, replyTo, "🔍 *النتيجة:*\n\n" + reply, env, true);
  } catch (e) { return await sendReply(chatId, replyTo, "مش قادر أبحث دلوقتي.", env); }
}

// ════════════════════════════════════════════════════════════
//  🍌 توليد الصور
// ════════════════════════════════════════════════════════════

async function generateImage(chatId, userId, prompt, fromName, replyTo, env) {
  const u        = await getUser(userId, env);
  const modelKey = u.imageModel || AI_CONFIG.defaults.image;
  const model    = getImageModel(modelKey);
  await incrementImageCount(userId, env);
  await sendReply(chatId, replyTo, "🎨 بارسم...", env);

  // Leonardo AI
  if (model.provider === "leonardo") {
    return await generateImageLeonardo(chatId, prompt, model, replyTo, env);
  }
  // Gemini مع Fallback
  return await generateImageGemini(chatId, prompt, modelKey, replyTo, env);
}

async function generateImageLeonardo(chatId, prompt, model, replyTo, env) {
  if (!env.LEONARDO_API_KEY) return await sendReply(chatId, replyTo, "مفيش LEONARDO_API_KEY في الإعدادات!", env);
  try {
    // إنشاء الصورة
    const genRes = await fetch(AI_CONFIG.leonardo_api + "/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "authorization": "Bearer " + env.LEONARDO_API_KEY },
      body: JSON.stringify({
        modelId:      model.id,
        prompt:       prompt,
        num_images:   1,
        width:        1024,
        height:       1024,
        guidance_scale: 7,
        photoReal:    false,
        alchemy:      true,
      })
    });
    if (!genRes.ok) throw new Error("Leonardo gen HTTP " + genRes.status);
    const genData = await genRes.json();
    const genId   = genData && genData.sdGenerationJob && genData.sdGenerationJob.generationId;
    if (!genId) throw new Error("No generation ID");

    // انتظار النتيجة (polling)
    let imageUrl = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(function(r) { setTimeout(r, 3000); });
      const pollRes  = await fetch(AI_CONFIG.leonardo_api + "/generations/" + genId, {
        headers: { "authorization": "Bearer " + env.LEONARDO_API_KEY }
      });
      const pollData = await pollRes.json();
      const imgs     = pollData && pollData.generations_by_pk && pollData.generations_by_pk.generated_images;
      if (imgs && imgs.length > 0 && imgs[0].url) {
        imageUrl = imgs[0].url;
        break;
      }
    }
    if (!imageUrl) throw new Error("Timeout");

    // إرسال الصورة عبر URL
    const body = { chat_id: chatId, photo: imageUrl, caption: "🎨 " + prompt };
    if (replyTo) body.reply_to_message_id = replyTo;
    return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/sendPhoto", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
  } catch (e) {
    console.error("Leonardo failed:", e.message);
    return await sendReply(chatId, replyTo, "مش قادر أرسم بـ Leonardo دلوقتي. " + e.message, env);
  }
}

async function generateImageGemini(chatId, prompt, modelKey, replyTo, env) {
  const allModels = [getImageModel(modelKey)].concat(
    AI_CONFIG.imageModels.filter(function(m) { return m.key !== modelKey && m.provider === "gemini"; })
  );
  for (let i = 0; i < allModels.length; i++) {
    const model = allModels[i];
    const url   = AI_CONFIG.gemini_api + "/models/" + model.id + ":generateContent?key=" + env.GOOGLE_API_KEY;
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Generate a high-quality detailed image: " + prompt }] }], generationConfig: { responseModalities: ["Text", "Image"] } })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data      = await res.json();
      const parts     = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [];
      const imagePart = parts.find(function(p) { return p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith("image/"); });
      if (!imagePart) throw new Error("No image");
      const binary = atob(imagePart.inlineData.data);
      const bytes  = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      const blob = new Blob([bytes], { type: imagePart.inlineData.mimeType });
      const ext  = imagePart.inlineData.mimeType.split("/")[1] || "png";
      const form = new FormData();
      form.append("chat_id", chatId.toString());
      form.append("photo",   blob, "image." + ext);
      form.append("caption", prompt);
      if (replyTo) form.append("reply_to_message_id", replyTo.toString());
      return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/sendPhoto", { method: "POST", body: form });
    } catch (e) {
      console.error("Gemini image " + model.key + " failed:", e.message);
      if (i === allModels.length - 1) return await sendReply(chatId, replyTo, "مش قادر أرسم. تأكد من Image API.", env);
    }
  }
}

// ════════════════════════════════════════════════════════════
//  📡 دوال Telegram
// ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
//  📥 تحميل الفيديو
// ════════════════════════════════════════════════════════════

async function cmdDownload(chatId, userId, url, replyTo, env) {
  if (!url) return await sendReply(chatId, replyTo, "اكتب الرابط بعد كلمة حمل\nمثال: حمل https://youtube.com/...", env);
  await sendReply(chatId, replyTo, "⏳ بحاول أحمل الرابط...", env);
  try {
    // استخدام cobalt.tools API للتحميل
    const res = await fetch("https://co.wuk.sh/api/json", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ url: url, vQuality: "720", filenamePattern: "basic" })
    });
    const data = await res.json();
    if (data.status === "error" || data.status === "rate-limit") throw new Error(data.text || "فشل التحميل");
    if (data.status === "stream" || data.status === "redirect" || data.url) {
      const dlUrl = data.url || data.stream;
      const buttons = [[{ text: "📥 تحميل مباشر", url: dlUrl }]];
      return await sendInlineKeyboard(chatId, "✅ جاهز للتحميل!
اضغط الزر عشان تحمل:", buttons, env);
    }
    if (data.status === "picker") {
      let msg = "🎬 اختار الجودة:

";
      const buttons = data.picker.slice(0, 5).map(function(item, i) {
        return [{ text: "📥 " + (item.type || "فيديو") + " " + (i+1), url: item.url }];
      });
      return await sendInlineKeyboard(chatId, msg + "اضغط للتحميل:", buttons, env);
    }
    throw new Error("رابط غير مدعوم");
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ مش قادر أحمل الرابط ده.\nتأكد من الرابط أو جرب رابط تاني.\n\nالمواقع المدعومة: يوتيوب، فيسبوك، انستقرام، تيك توك، تويتر وأكتر.", env);
  }
}

async function cmdYoutubeSearch(chatId, userId, query, replyTo, env) {
  if (!query) return await sendReply(chatId, replyTo, "اكتب اسم الفيديو بعد كلمة يوت\nمثال: يوت اغنية فيروز", env);
  await sendReply(chatId, replyTo, "🔍 بدور على: " + query + " في يوتيوب...", env);
  try {
    // بحث عبر Gemini
    const url = AI_CONFIG.gemini_api + "/models/gemini-2.5-flash:generateContent?key=" + env.GOOGLE_API_KEY;
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ابحث عن: " + query + " على يوتيوب وأعطني رابط الفيديو الأول المناسب فقط بدون أي كلام إضافي" }] }],
        tools: [{ google_search: {} }]
      })
    });
    const data = await res.json();
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [];
    const text  = parts.map(function(p) { return p.text || ""; }).join("").trim();
    // استخراج رابط يوتيوب
    const ytMatch = text.match(/https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[^\s"')]+/);
    if (ytMatch) {
      const ytUrl = ytMatch[0];
      return await cmdDownload(chatId, userId, ytUrl, replyTo, env);
    }
    return await sendReply(chatId, replyTo, "مش لاقي فيديو لـ: " + query + "\nجرب تكتب الاسم بشكل مختلف.", env);
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ فشل البحث. حاول تاني.", env);
  }
}

// ════════════════════════════════════════════════════════════
//  👮 إدارة الجروب
// ════════════════════════════════════════════════════════════

async function isGroupAdmin(chatId, userId, env) {
  try {
    const res  = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/getChatMember?chat_id=" + chatId + "&user_id=" + userId);
    const data = await res.json();
    const status = data && data.result && data.result.status;
    return status === "administrator" || status === "creator";
  } catch { return false; }
}

async function cmdMute(chatId, adminId, replyMsg, text, replyTo, env) {
  if (!await isGroupAdmin(chatId, adminId, env) && !await isAdmin(adminId, env)) {
    return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  }
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  // استخراج مدة الكتم بالدقائق
  const match = text.match(/(\d+)/);
  const mins  = match ? parseInt(match[1]) : 60;
  const until = Math.floor(Date.now() / 1000) + (mins * 60);
  try {
    const res = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/restrictChatMember", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, user_id: targetId, until_date: until,
        permissions: { can_send_messages: false, can_send_media_messages: false, can_send_polls: false, can_send_other_messages: false }
      })
    });
    const data = await res.json();
    if (data.ok) return await sendReply(chatId, replyTo, "🔇 تم كتم *" + targetName + "* لمدة " + mins + " دقيقة.", env, true);
    return await sendReply(chatId, replyTo, "❌ فشل الكتم — تأكد إن البوت أدمن في الجروب.", env);
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ فشل: " + e.message, env);
  }
}

async function cmdUnmute(chatId, adminId, replyMsg, replyTo, env) {
  if (!await isGroupAdmin(chatId, adminId, env) && !await isAdmin(adminId, env)) {
    return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  }
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  try {
    const res = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/restrictChatMember", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, user_id: targetId, until_date: 0,
        permissions: { can_send_messages: true, can_send_media_messages: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true }
      })
    });
    const data = await res.json();
    if (data.ok) return await sendReply(chatId, replyTo, "🔊 تم رفع الكتم عن *" + targetName + "*.", env, true);
    return await sendReply(chatId, replyTo, "❌ فشل رفع الكتم.", env);
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ فشل: " + e.message, env);
  }
}

async function cmdGroupBan(chatId, adminId, replyMsg, replyTo, env) {
  if (!await isGroupAdmin(chatId, adminId, env) && !await isAdmin(adminId, env)) {
    return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  }
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  try {
    const res = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/banChatMember", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: targetId })
    });
    const data = await res.json();
    if (data.ok) return await sendReply(chatId, replyTo, "🚫 تم حظر *" + targetName + "* من الجروب.", env, true);
    return await sendReply(chatId, replyTo, "❌ فشل الحظر — تأكد إن البوت أدمن في الجروب.", env);
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ فشل: " + e.message, env);
  }
}

async function cmdGroupUnban(chatId, adminId, replyMsg, replyTo, env) {
  if (!await isGroupAdmin(chatId, adminId, env) && !await isAdmin(adminId, env)) {
    return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  }
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  try {
    const res = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/unbanChatMember", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: targetId, only_if_banned: true })
    });
    const data = await res.json();
    if (data.ok) return await sendReply(chatId, replyTo, "✅ تم رفع الحظر عن *" + targetName + "*.", env, true);
    return await sendReply(chatId, replyTo, "❌ فشل رفع الحظر.", env);
  } catch (e) {
    return await sendReply(chatId, replyTo, "❌ فشل: " + e.message, env);
  }
}

async function cmdWarn(chatId, adminId, replyMsg, replyTo, env) {
  if (!await isGroupAdmin(chatId, adminId, env) && !await isAdmin(adminId, env)) {
    return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  }
  const targetId   = replyMsg.from.id;
  const targetName = getUserName(replyMsg.from);
  // جلب عدد التحذيرات من KV
  const warnKey = "warn:" + chatId + ":" + targetId;
  let warns = 0;
  try {
    const w = await env.BOT_KV.get(warnKey, "json");
    warns = (w && w.count) || 0;
  } catch {}
  warns++;
  await env.BOT_KV.put(warnKey, JSON.stringify({ count: warns, name: targetName }));
  if (warns >= 3) {
    // حظر تلقائي بعد 3 تحذيرات
    await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/banChatMember", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: targetId })
    });
    await env.BOT_KV.put(warnKey, JSON.stringify({ count: 0, name: targetName }));
    return await sendReply(chatId, replyTo, "🚫 *" + targetName + "* وصل لـ 3 تحذيرات وتم حظره تلقائياً!", env, true);
  }
  return await sendReply(chatId, replyTo, "⚠️ تحذير لـ *" + targetName + "*!\nعدد التحذيرات: *" + warns + "/3*\n" + (3 - warns) + " تحذير متبقي قبل الحظر.", env, true);
}

// ════════════════════════════════════════════════════════════
//  ⏰ الرسائل المجدولة
// ════════════════════════════════════════════════════════════

async function cmdAddSchedule(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  // الصيغة: /addschedule [chat_id] [كل X ساعة] [الرسالة]
  // مثال: /addschedule -1001234567 3 مرحباً بكم!
  const parts = text.replace(/^\/addschedule\s*/i, "").trim().split(" ");
  if (parts.length < 3) return await sendReply(chatId, replyTo, "الاستخدام:
/addschedule [chat_id] [ساعات] [الرسالة]
مثال: /addschedule -1001234567 6 مرحباً بكم!", env);
  const targetChat = parts[0];
  const hours      = parseInt(parts[1]);
  const message    = parts.slice(2).join(" ");
  if (isNaN(hours) || hours < 1) return await sendReply(chatId, replyTo, "عدد الساعات لازم يكون رقم أكبر من 0.", env);
  const schedules = await getSchedules(env);
  const id = Date.now().toString();
  schedules[id] = { chatId: targetChat, hours: hours, message: message, lastSent: 0 };
  await env.BOT_KV.put("schedules", JSON.stringify(schedules));
  return await sendReply(chatId, replyTo, "✅ تم إضافة رسالة مجدولة!
كل *" + hours + "* ساعة في: `" + targetChat + "`
الرسالة: " + message, env, true);
}

async function cmdListSchedules(chatId, userId, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  const schedules = await getSchedules(env);
  const keys = Object.keys(schedules);
  if (!keys.length) return await sendReply(chatId, replyTo, "مفيش رسائل مجدولة.", env);
  let msg = "⏰ *الرسائل المجدولة:*

";
  keys.forEach(function(k, i) {
    const s = schedules[k];
    msg += (i+1) + ". كل *" + s.hours + "h* → `" + s.chatId + "`
📝 " + s.message.slice(0, 50) + "
🆔 `" + k + "`

";
  });
  msg += "للحذف: /delschedule [id]";
  return await sendReply(chatId, replyTo, msg, env, true);
}

async function cmdDelSchedule(chatId, userId, text, replyTo, env) {
  if (!await isAdmin(userId, env)) return await sendReply(chatId, replyTo, "🚫 للأدمن بس.", env);
  const id = text.replace(/^\/delschedule\s*/i, "").trim();
  const schedules = await getSchedules(env);
  if (!schedules[id]) return await sendReply(chatId, replyTo, "مش لاقي الـ ID ده.", env);
  delete schedules[id];
  await env.BOT_KV.put("schedules", JSON.stringify(schedules));
  return await sendReply(chatId, replyTo, "🗑️ تم حذف الرسالة المجدولة.", env);
}

async function getSchedules(env) {
  try {
    const s = await env.BOT_KV.get("schedules", "json");
    return s || {};
  } catch { return {}; }
}

async function runSchedules(env) {
  try {
    const schedules = await getSchedules(env);
    const keys = Object.keys(schedules);
    if (!keys.length) return;
    const now = Date.now();
    let changed = false;
    for (const k of keys) {
      const s = schedules[k];
      const intervalMs = s.hours * 60 * 60 * 1000;
      if (now - (s.lastSent || 0) >= intervalMs) {
        try {
          await sendMsg(s.chatId, s.message, env);
          schedules[k].lastSent = now;
          changed = true;
        } catch (e) { console.error("Schedule send failed:", e); }
      }
    }
    if (changed) await env.BOT_KV.put("schedules", JSON.stringify(schedules));
  } catch (e) { console.error("runSchedules:", e); }
}

async function sendReply(chatId, replyToMsgId, text, env, markdown) {
  const body = { chat_id: chatId, text: text, parse_mode: markdown ? "Markdown" : undefined };
  if (replyToMsgId) body.reply_to_message_id = replyToMsgId;
  return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
}

async function sendMsg(chatId, text, env, markdown) {
  return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: markdown ? "Markdown" : undefined })
  });
}

async function sendInlineKeyboard(chatId, text, buttons, env) {
  return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } })
  });
}

async function answerCallback(callbackId, env) {
  return await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/answerCallbackQuery", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId })
  });
}

async function initBot(env, host) {
  const webhookUrl = "https://" + host;
  const res  = await fetch(AI_CONFIG.telegram_api + env.TELEGRAM_BOT_TOKEN + "/setWebhook?url=" + webhookUrl + "&allowed_updates=[\"message\",\"callback_query\"]");
  const data = await res.json();
  return new Response(JSON.stringify({ status: data.ok ? "✅ تم تفعيل الـ Webhook!" : "❌ فشل", webhook: webhookUrl, result: data }, null, 2), { headers: { "Content-Type": "application/json" } });
}

// ============================================================
//  📋 متغيرات البيئة:
//  GOOGLE_API_KEY     = مفتاح Google AI Studio
//  TELEGRAM_BOT_TOKEN = توكن البوت
//  ADMIN_ID           = معرفك في تلجرام
//  BOT_USERNAME       = اسم البوت بدون @
//  CHANNEL_USERNAME   = اسم القناة بدون @ (اختياري)
//  CHANNEL_LINK       = رابط القناة (اختياري)
//  💾 KV Binding: BOT_KV
// ============================================================
