const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Telegraf, session } = require('telegraf');
const config = require('./config');
const { initFirebase } = require('./database/firebase');
const { UserModel } = require('./database/models');
const { antispamMiddleware } = require('./middleware/antispam');
const { rateLimitMiddleware } = require('./middleware/ratelimit');
const { detectPlatform } = require('./utils/helpers');

const { setupStartCommand } = require('./commands/start');
const { setupDownloadCommand, handleDownloadRequest } = require('./commands/download');
const { setupPremiumCommand } = require('./commands/premium');
const { setupCoinsCommand } = require('./commands/coins');
const { setupReferralCommand } = require('./commands/referral');
const { setupHistoryCommand } = require('./commands/history');
const { setupProfileCommand } = require('./commands/profile');
const { setupHelpCommand } = require('./commands/help');
const { setupAdminCommand } = require('./commands/admin');
const { flushSave } = require('./database/localdb');

const downloader = require('./services/downloader');
const ffmpeg = require('./services/ffmpeg');

async function main() {
  console.log('Initializing Firebase...');
  initFirebase();

  console.log('Checking yt-dlp...');
  const ytDlpOk = await downloader.checkYtDlp();
  if (!ytDlpOk) {
    console.warn('Warning: yt-dlp not found. Install it for download functionality.');
  } else {
    console.log('yt-dlp is available');
  }

  console.log('Checking FFmpeg...');
  const ffmpegOk = await ffmpeg.checkFfmpeg();
  if (!ffmpegOk) {
    console.warn('Warning: FFmpeg not found. Some features may be limited.');
  } else {
    console.log('FFmpeg is available');
  }

  const bot = new Telegraf(config.botToken);

  bot.use(session({ defaultSession: () => ({ awaitingUrl: false }) }));
  bot.use(antispamMiddleware());
  bot.use(rateLimitMiddleware(20, 60000));

  bot.catch((err, ctx) => {
    console.error(`Bot error for ${ctx.updateType}:`, err.message);
  });

  setupStartCommand(bot);
  setupDownloadCommand(bot);
  setupPremiumCommand(bot);
  setupCoinsCommand(bot);
  setupReferralCommand(bot);
  setupHistoryCommand(bot);
  setupProfileCommand(bot);
  setupHelpCommand(bot);
  setupAdminCommand(bot);

  bot.on('text', async (ctx) => {
    if (!ctx.chat || ctx.chat.type !== 'private') return;

    const text = ctx.message.text;
    const userId = ctx.from.id;

    const user = await UserModel.get(userId);
    if (user?.isBanned) {
      return ctx.reply('\u26D4 Your account has been restricted. Contact support.');
    }

    if (ctx.session.awaitingRedeem) {
      ctx.session.awaitingRedeem = false;
      return ctx.reply('\uD83C\uDF81 Premium code system coming soon. Contact admin for now.');
    }

    if (ctx.session.awaitingBroadcast) {
      ctx.session.awaitingBroadcast = false;
      const users = await (require('./database/models').UserModel.getAll());
      const userIds = Object.keys(users);
      let sent = 0;
      let failed = 0;
      const statusMsg = await ctx.reply(`\uD83D\uDCE3 Broadcasting to ${userIds.length} users...`);
      for (const id of userIds) {
        try {
          await ctx.telegram.sendMessage(parseInt(id), text, { parse_mode: 'HTML' });
          sent++;
        } catch { failed++; }
        await new Promise((r) => setTimeout(r, 50));
      }
      return ctx.telegram.editMessageText(
        ctx.chat.id, statusMsg.message_id, null,
        `\u2705 Broadcast done!\n\n\u2705 Sent: ${sent}\n\u274C Failed: ${failed}`
      );
    }

    const platform = detectPlatform(text);
    if (platform) {
      return handleDownloadRequest(ctx, text);
    }

    if (ctx.session.awaitingUrl) {
      ctx.session.awaitingUrl = false;
      return ctx.reply(
        '\u274C <b>Unsupported Link</b>\n\n' +
        'Please send a valid video link from:\n' +
        'YouTube, TikTok, Facebook, Instagram, Twitter/X, or Vimeo.',
        { parse_mode: 'HTML' }
      );
    }

    const helpText =
      '\u2753 <b>Need Help?</b>\n\n' +
      'Send a video link to start downloading.\n' +
      'Use /start to see the main menu.\n\n' +
      'Supported: YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo';

    ctx.reply(helpText, { parse_mode: 'HTML' });
  });

  bot.on('message', async (ctx) => {
    if (ctx.message?.video || ctx.message?.photo || ctx.message?.document) {
      if (ctx.chat?.type === 'private') {
        ctx.reply('\uD83D\uDCE5 Send me a video <b>link</b> (URL) to download.\n\nI don\'t process uploaded files directly.', { parse_mode: 'HTML' });
      }
    }
  });

  const port = process.env.PORT || 10000;
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  }).listen(port, '0.0.0.0', () => {
    console.log(`Health check server on port ${port}`);
  });

  const botInfo = await bot.telegram.getMe();
  bot.botInfo = botInfo;
  console.log(`Bot started: @${botInfo.username}`);

  bot.launch().then(() => {
    console.log('Bot is running...');
  });

  const shutdown = async (signal) => {
    console.log('Shutting down...');
    bot.stop(signal);
    await flushSave();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(console.error);
