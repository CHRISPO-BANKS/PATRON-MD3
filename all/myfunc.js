// myfunc.js (updated)
// Requires: @whiskeysockets/baileys, chalk, axios, human-readable, node-os-utils

const { proto, generateWAMessage, getContentType, areJidsSameUser } = require('@whiskeysockets/baileys');
const chalk = require("chalk");
const axios = require("axios");
const { sizeFormatter } = require("human-readable");

// ---------- Colors ----------
exports.color = (text, color) => (!color ? chalk.green(text) : chalk.keyword(color)(text));

// ---------- Group helpers ----------
exports.getGroupAdmins = (participants = []) => {
  const admins = [];
  for (const p of participants) {
    if (p?.admin === "superadmin" || p?.admin === "admin") {
      admins.push(p.jid || p.id); // prefer jid, fallback to id
    }
  }
  return admins;
};

// ---------- Size helpers ----------
exports.h2k = (number) => {
  const SI_POSTFIXES = ["", " Ribu", " Juta", " Miliar", " Triliun", " P", " E"];
  if (!Number.isFinite(number)) return number;
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const postfix = SI_POSTFIXES[tier] || "";
  const scale = Math.pow(10, tier * 3);
  let formatted = (number / scale).toFixed(1);
  if (/\.0$/.test(formatted)) formatted = formatted.slice(0, -2);
  return formatted + postfix;
};

exports.FileSize = (number) => {
  const SI_POSTFIXES = ["B", " KB", " MB", " GB", " TB", " PB", " EB"];
  if (!Number.isFinite(number)) return number;
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const postfix = SI_POSTFIXES[tier] || "";
  const scale = Math.pow(10, tier * 3);
  let formatted = (number / scale).toFixed(1);
  if (/\.0$/.test(formatted)) formatted = formatted.slice(0, -2);
  return formatted + postfix;
};

exports.bytesToSize = (bytes, decimals = 2) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

exports.formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

// ---------- Network / bandwidth ----------
exports.checkBandwidth = async () => {
  let ind = 0;
  let out = 0;
  const stats = await require("node-os-utils").netstat.stats();
  for (const i of stats) {
    ind += parseInt(i.inputBytes || 0);
    out += parseInt(i.outputBytes || 0);
  }
  return {
    download: exports.bytesToSize(ind),
    upload: exports.bytesToSize(out),
  };
};

// ---------- HTTP helpers ----------
exports.fetchJson = async (url, options) => {
  try {
    const res = await axios({
      method: "GET",
      url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
      },
      ...(options || {}),
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

exports.getBuffer = async (url, options) => {
  try {
    const res = await axios({
      method: "GET",
      url,
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      ...(options || {}),
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

exports.nganuin = exports.fetchJson; // alias

// ---------- Misc small utils ----------
exports.getRandom = (ext = "") => `${Math.floor(Math.random() * 10000)}${ext}`;
exports.pickRandom = (arr = []) => arr[Math.floor(Math.random() * arr.length)];

exports.isUrl = (url = "") =>
  typeof url === "string" &&
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi.test(
    url
  );

exports.jsonformat = (data) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

exports.runtime = function (seconds) {
  seconds = Number(seconds) || 0;
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
  const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay || "0 seconds";
};

exports.shorturl = async function shorturl(longUrl) {
  try {
    const response = await axios.post("https://shrtrl.vercel.app/", { url: longUrl });
    return response?.data?.data?.shortUrl || longUrl;
  } catch {
    return longUrl;
  }
};

exports.formatp = sizeFormatter({
  std: "JEDEC",
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

exports.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- getSizeMedia ----------
exports.getSizeMedia = (path) =>
  new Promise((resolve, reject) => {
    try {
      if (typeof path === "string" && /^https?:\/\//i.test(path)) {
        axios
          .get(path, { method: "HEAD" })
          .then((res) => {
            const length = parseInt(res.headers["content-length"] || "0");
            if (!isNaN(length)) resolve(exports.bytesToSize(length, 3));
            else reject(new Error("No content-length header"));
          })
          .catch(reject);
      } else if (Buffer.isBuffer(path)) {
        const length = Buffer.byteLength(path);
        resolve(exports.bytesToSize(length, 3));
      } else {
        reject(new Error("Unsupported path type"));
      }
    } catch (e) {
      reject(e);
    }
  });

// ---------- smsg (Optimized Hardened with LID support) ----------

exports.smsg = (ptz = {}, m = null, store = null) => {
  try {
    if (!m || typeof m !== "object") return {};

    const { proto, getContentType, downloadContentFromMessage } =
      require("@whiskeysockets/baileys");

    const decode =
      typeof ptz.decodeJid === "function"
        ? ptz.decodeJid
        : (x) => x || "";

    // =========================
    // 🔥 DEEP UNWRAP (BULLETPROOF)
    // =========================
    const unwrap = (msg = {}) => {
      let mmsg = msg;

      const safeGet = (x) => x?.message || x || {};

      while (true) {
        if (mmsg?.ephemeralMessage) {
          mmsg = safeGet(mmsg.ephemeralMessage);
          continue;
        }

        if (mmsg?.viewOnceMessage) {
          mmsg = safeGet(mmsg.viewOnceMessage);
          continue;
        }

        if (mmsg?.viewOnceMessageV2) {
          mmsg = safeGet(mmsg.viewOnceMessageV2);
          continue;
        }

        if (mmsg?.viewOnceMessageV2Extension) {
          mmsg = safeGet(mmsg.viewOnceMessageV2Extension);
          continue;
        }

        break;
      }

      return mmsg || {};
    };

    m.message = unwrap(m.message || {});

    // =========================
    // 2. BASIC INFO
    // =========================
    const key = m.key || {};
    const remote = key.remoteJid || "";

    m.id = key.id || "";
    m.chat = remote;
    m.fromMe = !!key.fromMe;
    m.isBaileys = m.id?.startsWith("BAE5") && m.id.length === 16;

    m.isGroup = remote.endsWith("@g.us");
    m.isUser = remote.endsWith("@s.whatsapp.net");

    const participant =
      (m.fromMe && ptz?.user?.id) ||
      key.participant ||
      remote;

    m.sender = decode(participant);
    if (m.isGroup) m.participant = decode(key.participant || "");

    // =========================
    // 3. TYPE
    // =========================
    m.mtype = getContentType(m.message) || "unknown";
    m.msg = m.message[m.mtype] || {};

    // =========================
    // 🔥 UNIVERSAL TEXT EXTRACTION
    // =========================
    const getText = (msg, full = m) => {
      return (
        msg?.text ||
        msg?.caption ||
        msg?.conversation ||
        msg?.contentText ||
        msg?.selectedDisplayText ||
        msg?.title ||
        msg?.description ||
        full?.message?.conversation ||
        full?.message?.extendedTextMessage?.text ||
        ""
      );
    };

    m.body = getText(m.msg, m);
    m.text = String(m.body || "").trim();

    // =========================
    // 🔥 MEDIA DETECTION (SAFE)
    // =========================
    const type = m.mtype;

    m.isMedia = /image|video|audio|sticker|document/.test(type);

    m.mimetype =
      m.msg?.mimetype ||
      ({
        imageMessage: "image/jpeg",
        videoMessage: "video/mp4",
        audioMessage: "audio/mpeg",
        stickerMessage: "image/webp"
      }[type] || "");

    // =========================
    // 🔥 CONTEXT (FULL COVERAGE)
    // =========================
    const ctx =
      m.msg?.contextInfo ||
      m.message?.extendedTextMessage?.contextInfo ||
      m.message?.imageMessage?.contextInfo ||
      m.message?.videoMessage?.contextInfo ||
      m.message?.audioMessage?.contextInfo ||
      m.message?.stickerMessage?.contextInfo ||
      {};

    // =========================
    // 🔥 QUOTED (FULL BULLETPROOF)
    // =========================
    if (ctx?.quotedMessage) {
      const quotedMsg = unwrap(ctx.quotedMessage);
      const quotedType = getContentType(quotedMsg) || Object.keys(quotedMsg)[0];
      const q = quotedMsg[quotedType] || {};

      const sender =
        decode(ctx.participant) ||
        decode(ctx.remoteJid) ||
        m.chat;

      const quoted = {
        mtype: quotedType,
        id: ctx.stanzaId || "",
        chat: ctx.remoteJid || m.chat,
        sender,
        fromMe: sender === decode(ptz?.user?.id),

        text: getText(q),

        msg: q,

        mimetype:
          q?.mimetype ||
          ({
            imageMessage: "image/jpeg",
            videoMessage: "video/mp4",
            audioMessage: "audio/mpeg",
            stickerMessage: "image/webp"
          }[quotedType] || ""),

        download: async () => {
          try {
            const stream = await downloadContentFromMessage(
              q,
              quotedType.replace("Message", "")
            );

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }

            return buffer;
          } catch {
            return null;
          }
        },

        reply: (text, chatId = m.chat, options = {}) =>
          ptz?.sendText?.(chatId, String(text), m, options)
      };

      m.quoted = quoted;
    } else {
      m.quoted = null;
    }

    // =========================
    // 🔥 DOWNLOAD
    // =========================
    m.download = async () => {
      try {
        const stream = await downloadContentFromMessage(
          m.msg,
          m.mtype.replace("Message", "")
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
      } catch {
        return null;
      }
    };

    // =========================
    // REPLY
    // =========================
    m.reply = (text, chatId = m.chat, options = {}) =>
      ptz?.sendText?.(chatId, String(text), m, options);

    return m;
  } catch (e) {
    console.error("smsg error:", e);
    return {};
  }
};