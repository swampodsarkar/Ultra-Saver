const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Telegraf, session } = require('telegraf');
const config = require('./config');
const { initFirebase } = require('./database/firebase');
const { antispamMiddleware } = require('./middleware/antispam');
const { rateLimitMiddleware } = require('./middleware/ratelimit');
const { detectPlatform } = require('./utils/helpers');

const { setupStartCommand } = require('./commands/start');
const { setupDownloadCommand, handleDownloadRequest } = require('./commands/download');
const { setupHelpCommand } = require('./commands/help');
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
  setupHelpCommand(bot);

  bot.on('text', async (ctx) => {
    if (!ctx.chat || ctx.chat.type !== 'private') return;

    const text = ctx.message.text;

    if (ctx.session.awaitingUrl) {
      ctx.session.awaitingUrl = false;
      const platform = detectPlatform(text);
      if (platform) return handleDownloadRequest(ctx, text);
      return ctx.reply(
        '\u274C <b>Unsupported Link</b>\n\n' +
        'Please send a valid video link from:\n' +
        'YouTube, TikTok, Facebook, Instagram, Twitter/X, or Vimeo.',
        { parse_mode: 'HTML' }
      );
    }

    const platform = detectPlatform(text);
    if (platform) return handleDownloadRequest(ctx, text);

    ctx.reply(
      '\u2753 <b>Need Help?</b>\n\n' +
      'Send a video link to start downloading.\n' +
      'Use /start to see the main menu.\n\n' +
      'Supported: YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo',
      { parse_mode: 'HTML' }
    );
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
