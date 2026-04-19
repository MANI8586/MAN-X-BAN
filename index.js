
/*SIMPLE REPORT BOT CODED BY MINATO DEV*/


const { Telegraf } = require("telegraf");
const nodemailer = require("nodemailer");
const validator = require("validator");
require("dotenv").config();

/* ================= CONFIG ================= */

const bot = new Telegraf(process.env.BOT_TOKEN);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const sessions = {};
const cooldowns = {};
const COOLDOWN_TIME = parseInt(process.env.COOLDOWN) || 60000;

/* ================= START ================= */

bot.start((ctx) => {
  ctx.reply(`
📨 TELEGRAM GMAIL BOT

Use /send to send an email.
Emails are sent using the owner's Gmail.
`);
});

/* ================= COMMAND SEND ================= */

bot.command("send", (ctx) => {
  const userId = ctx.from.id;

  if (cooldowns[userId] && Date.now() - cooldowns[userId] < COOLDOWN_TIME) {
    return ctx.reply("⏳ Please wait a moment before sending again.");
  }

  sessions[userId] = { step: "email" };
  ctx.reply("📧 Enter the recipient's email:");
});

/* ================= HANDLE TEXT ================= */

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const session = sessions[userId];
  if (!session) return;

  /* STEP 1: EMAIL */
  if (session.step === "email") {
    const email = ctx.message.text.trim();

    if (!validator.isEmail(email)) {
      return ctx.reply("❌ Invalid email format. Please enter again:");
    }

    session.email = email;
    session.step = "subject";
    return ctx.reply("📝 Enter the email subject:");
  }

  /* STEP 2: SUBJECT */
  if (session.step === "subject") {
    session.subject = ctx.message.text.trim();
    session.step = "message";
    return ctx.reply("✍️ Enter your message:");
  }

  /* STEP 3: MESSAGE */
  if (session.step === "message") {
    session.message = ctx.message.text;

    try {
      await transporter.sendMail({
        from: `"Telegram Mail Bot" <${process.env.GMAIL_USER}>`,
        to: session.email,
        subject: session.subject,
        text: `
Telegram Sender:
ID: ${ctx.from.id}
Username: @${ctx.from.username || "-"}
Name: ${ctx.from.first_name}

Message Content:
${session.message}
        `,
        html: `
<h2>Email from Telegram Bot</h2>
<p><b>User ID:</b> ${ctx.from.id}</p>
<p><b>Username:</b> @${ctx.from.username || "-"}</p>
<p><b>Name:</b> ${ctx.from.first_name}</p>
<hr>
<p>${session.message}</p>
        `
      });

      cooldowns[userId] = Date.now();
      ctx.reply("✅ Email sent successfully!");
    } catch (error) {
      console.error("Email Error:", error);
      ctx.reply("❌ Failed to send email.\nCheck your Gmail App Password.");
    }

    delete sessions[userId];
  }
});

/* ================= ERROR HANDLER ================= */

bot.catch((err) => {
  console.error("Bot Error:", err);
});

/* ================= LAUNCH ================= */

bot.launch();
console.log("🚀 Bot is running...");

/* ================= GRACEFUL STOP ================= */

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));