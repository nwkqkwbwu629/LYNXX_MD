const {
  default: makeWASocket,
  useMultiFileAuthState,
  Browsers,
  makeInMemoryStore,
} = require("@whiskeysockets/baileys");
const fs = require("fs");
const { serialize } = require("./lib/serialize");
const { Message, Image, Sticker } = require("./lib/Base");
const pino = require("pino");
const path = require("path");
const events = require("./lib/event");
const got = require("got");
const config = require("./config");
const { PluginDB } = require("./lib/database/plugins");
const Greetings = require("./lib/Greetings");
const { MakeSession } = require("./lib/session");
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

require("events").EventEmitter.defaultMaxListeners = 500;
require("./port");

fs.readdirSync("./lib/database/").forEach((plugin) => {
  if (path.extname(plugin).toLowerCase() == ".js") {
    require("./lib/database/" + plugin);
  }
});

fs.readdirSync("./plugins").forEach((plugin) => {
  if (path.extname(plugin).toLowerCase() == ".js") {
    require("./plugins/" + plugin);
  }
});

async function Abhiy() {
  await MakeSession(config.SESSION_ID, "./session");
  
  console.log("Syncing Database");
  await config.DATABASE.sync();

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  let conn = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: true,

    browser: Browsers.macOS("Desktop"),
    downloadHistory: false,
    syncFullHistory: false,
  });
  store.bind(conn.ev);
  setInterval(() => {
    store.writeToFile("./lib/store_db.json");
    console.log("saved store");
  }, 30 * 60 * 1000);

  conn.ev.on("connection.update", async (s) => {
    const { connection, lastDisconnect } = s;
    if (
      connection === "close" &&
      lastDisconnect &&
      lastDisconnect.error &&
      lastDisconnect.error.output.statusCode != 401
    ) {
      console.log(lastDisconnect.error.output.payload);
      Abhiy();
    }

    if (connection === "open") {
      console.log(" 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 𝗜𝗡𝗧𝗢 𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣🧩");
      let plugins = await PluginDB.findAll();
      plugins.map(async (plugin) => {
        if (!fs.existsSync("./plugins/" + plugin.dataValues.name + ".js")) {
          console.log(plugin.dataValues.name);
          var response = await got(plugin.dataValues.url);
          if (response.statusCode == 200) {
            fs.writeFileSync(
              "./plugins/" + plugin.dataValues.name + ".js",
              response.body
            );
            require("./plugins/" + plugin.dataValues.name + ".js");
            console.log(" 𝗣𝗹𝘂𝗴𝗶𝗻𝘀 𝗜𝗻𝘀𝘁𝗮𝗹𝗹𝗲𝗱 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆🧩");
          }
        }
      });
      let str = `𝐋𝐲𝐧𝐱 𝐦𝐝 𝐒𝐓𝐀𝐑𝐓𝐄𝐃 \n\n\n𝘝𝘌𝘙𝘚𝘐𝘖𝘕   : *${require("./package.json").version}* \n𝘗𝘓𝘜𝘎𝘐𝘕𝘚  : *${events.commands.length}* \n𝘔𝘖𝘋𝘌  : *${config.WORK_TYPE}* \n𝘗𝘙𝘌𝘍𝘐𝘟  : *${config.HANDLERS}*`;
      conn.sendMessage("919747257996@s.whatsapp.net", { text: str });
      conn.ev.on("creds.update", saveCreds);
      conn.ev.on("group-participants.update", async (data) => {
        Greetings(data, conn);
      });
      conn.ev.on("messages.upsert", async (m) => {
        if (m.type !== "notify") return;
        let ms = m.messages[0];
        let msg = await serialize(JSON.parse(JSON.stringify(ms)), conn);
        if (!msg.message) return;
        let text_msg = msg.body;
        events.commands.map(async (command) => {
          if (
            command.fromMe &&
            !config.SUDO.split(",").includes(
              msg.sender.split("@")[0] || !msg.isSelf
            )
          )
            return;
          let comman;
          if (text_msg) {
            comman = text_msg.trim().split(/ +/)[0];
            msg.prefix = new RegExp(config.HANDLERS).test(text_msg)
              ? text_msg.split("").shift()
              : ",";
          }
          if (command.pattern && command.pattern.test(comman)) {
            var match;
            try {
              match = text_msg.replace(new RegExp(comman, "i"), "").trim();
            } catch {
              match = false;
            }
            whats = new Message(conn, msg, ms);
            command.function(whats, match, msg, conn);
          } else if (text_msg && command.on === "text") {
            whats = new Message(conn, msg, ms);
            command.function(whats, text_msg, msg, conn, m);
          } else if (
            (command.on === "image" || command.on === "photo") &&
            msg.type === "imageMessage"
          ) {
            whats = new Image(conn, msg, ms);
            command.function(whats, text_msg, msg, conn, m, ms);
          } else if (
            command.on === "sticker" &&
            msg.type === "stickerMessage"
          ) {
            whats = new Sticker(conn, msg, ms);
            command.function(whats, msg, conn, m, ms);
          }
        });
      });
    }
  });
  process.on("uncaughtException", async (err) => {
    let error = err.message;

    await console.log(err);
    await conn.sendMessage(conn.user.id, { text: error });

  });
}
setTimeout(() => {
  Abhiy();
}, 3000);
