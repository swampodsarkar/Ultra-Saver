const {
  detectPlatform,
  formatDuration,
  formatSize,
  canDownload,
  getRemainingDownloads,
  getPlatformEmoji,
  escapeHtml,
} = require('../utils/helpers');
const { UserModel, DownloadModel } = require('../database/models');
const { QualityButtons, goBackKeyboard } = require('../utils/keyboards');
const downloader = require('../services/downloader');
const ffmpeg = require('../services/ffmpeg');
const config = require('../config');

const processingUsers = new Set();

async function handleDownloadRequest(ctx, url) {
  const userId = ctx.from.id;

  if (processingUsers.has(userId)) {
    return ctx.reply('\u23F3 Already processing a download. Please wait.');
  }

  const user = await UserModel.get(userId);
  if (!user || user.isBanned) {
    return ctx.reply('\u26D4 Your account has been restricted. Contact support.');
  }

  if (!canDownload(user)) {
    const remaining = getRemainingDownloads(user);
    if (remaining <= 0) {
      return ctx.reply(
        '\u26A0\uFE0F <b>Daily limit reached!</b>\n\n' +
        'You have used all your free downloads today.\n' +
        '\uD83D\uDC51 Upgrade to Premium for unlimited downloads!\n' +
        '\uD83D\uDCB0 Or earn more coins for extra downloads.',
        { parse_mode: 'HTML' }
      );
    }
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return ctx.reply(
      '\u274C <b>Unsupported Link</b>\n\n' +
      'Sorry, this platform is not supported yet.\n' +
      'Supported: YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo\n\n' +
      'Please try a different link.',
      { parse_mode: 'HTML' }
    );
  }

  await ctx.sendChatAction('typing');

  let statusMsg;
  try {
    processingUsers.add(userId);

    statusMsg = await ctx.reply(
      `${getPlatformEmoji(platform)} <b>Processing ${platform} link...</b>\n\n` +
      '\u23F3 Fetching video information...\n<i>This may take a few seconds...</i>',
      { parse_mode: 'HTML' }
    );

    const info = await downloader.fetchVideoInfo(url);

    const caption =
      `${getPlatformEmoji(platform)} <b>${platform} Video</b>\n\n` +
      `\uD83C\uDFAC <b>${escapeHtml(info.title)}</b>\n` +
      `\u23F1 Duration: ${formatDuration(info.duration)}\n` +
      `\uD83D\uDCF9 ${escapeHtml(info.uploader)}\n\n` +
      `<i>Select quality below:</i>`;

    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});

    const msg = await ctx.replyWithPhoto(
      info.thumbnail || 'https://i.imgur.com/placeholder.png',
      {
        caption,
        parse_mode: 'HTML',
        reply_markup: QualityButtons.reply_markup,
      }
    );

    ctx.session.currentUrl = url;
    ctx.session.platform = platform;
    ctx.session.videoInfo = info;
    ctx.session.infoMessageId = msg.message_id;
  } catch (error) {
    await ctx.telegram.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
    await ctx.reply(
      `\u274C <b>Error fetching video</b>\n\n${error.message}\n\nPlease check the link and try again.`,
      { parse_mode: 'HTML' }
    );
  } finally {
    processingUsers.delete(userId);
  }
}

async function processDownload(ctx, quality) {
  const userId = ctx.from.id;
  const url = ctx.session.currentUrl;
  const platform = ctx.session.platform;
  const info = ctx.session.videoInfo;

  if (!url || !platform) {
    return ctx.reply('Session expired. Please send the link again.');
  }

  if (processingUsers.has(userId)) {
    return ctx.reply('\u23F3 Already processing. Please wait.');
  }

  const user = await UserModel.get(userId);
  if (!canDownload(user)) {
    return ctx.reply('\u26A0\uFE0F You have reached your download limit.');
  }

  const qualityLabel = { '360p': '360p', '720p': '720p', '1080p': '1080p', 'mp3': 'MP3 Audio', 'best': 'Best Quality' }[quality] || quality;

  await ctx.sendChatAction('upload_video');

  let progressMsg;
  let downloadResult;
  const updateInterval = setInterval(() => {
    ctx.sendChatAction('upload_video').catch(() => {});
  }, 4000);

  try {
    processingUsers.add(userId);

    progressMsg = await ctx.reply(
      `\u23F3 <b>Downloading ${qualityLabel}...</b>\n\n` +
      `\uD83C\uDFAC ${escapeHtml(info?.title || '')}\n` +
      `\uD83D\uDCE6 Processing your file...`,
      { parse_mode: 'HTML' }
    ).catch(() => {});

    if (quality === 'mp3') {
      downloadResult = await downloader.downloadAudio(url);
    } else {
      downloadResult = await downloader.downloadVideo(url, quality);
    }
    clearInterval(updateInterval);

    await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg?.message_id).catch(() => {});

    const safeTitle = escapeHtml(info?.title || '');
    const caption =
      `\u2705 <b>Download Complete</b>\n\n` +
      `\uD83C\uDFAC ${safeTitle}\n` +
      `\uD83C\uDFA5 ${platform} | ${qualityLabel}\n` +
      `\uD83D\uDCC2 ${formatSize(downloadResult.size)}\n\n` +
      `\uD83E\uDD1D Powered by DownloaderPro Bot`;

    if (downloadResult.size > config.maxFileSize) {
      await ctx.reply(
        `\u26A0\uFE0F <b>File too large for Telegram</b>\n\n` +
        `Size: ${formatSize(downloadResult.size)}\n` +
        `Max allowed: ${formatSize(config.maxFileSize)}\n\n` +
        `Try a lower quality or download MP3 audio.`,
        { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
      );
      await downloader.cleanupFile(downloadResult.filePath);
      await DownloadModel.log(userId, url, platform, qualityLabel, 'too_large', downloadResult.size);
      return;
    }

    const sendResult = await downloader.sendWithProgress(ctx, ctx.chat.id, downloadResult.filePath, caption);

    if (sendResult.error) {
      if (sendResult.error === 'file_too_large') {
        const compressed = await ffmpeg.compressVideo(downloadResult.filePath);
        if (compressed !== downloadResult.filePath) {
          const retry = await downloader.sendWithProgress(ctx, ctx.chat.id, compressed, caption);
          if (retry.error) {
            await ctx.reply(
              `\u26A0\uFE0F File too large (${formatSize(sendResult.size)}). Try lower quality.`,
              { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
            );
          }
          await downloader.cleanupFile(compressed);
        } else {
          await ctx.reply(
            `\u26A0\uFE0F File too large (${formatSize(sendResult.size)}). Try lower quality.`,
            { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
          );
        }
      } else {
        await ctx.reply(
          `\u274C <b>Upload failed</b>\n\n${sendResult.error}`,
          { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
        );
      }
    }

    await downloader.cleanupFile(downloadResult.filePath);
    await UserModel.incrementDownloads(userId);

    if (!user.premiumStatus) {
      const remaining = getRemainingDownloads(await UserModel.get(userId));
      const dailyTotal = user.premiumStatus ? config.dailyLimitPremium : config.dailyLimitFree;
      const used = (user.dailyDownloads || 0) + 1;
      await ctx.reply(
        `\uD83D\uDCE6 <b>Download ${used}/${dailyTotal}</b>\n\n` +
        `\uD83D\uDC51 Upgrade to Premium for unlimited HD downloads!\n` +
        `\uD83D\uDCB0 Earn coins for extra downloads.`,
        { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
      ).catch(() => {});
    } else {
      await ctx.reply(
        `\u2705 <b>Download Complete!</b>\n\nSend another link or choose an option:`,
        { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
      ).catch(() => {});
    }

    await DownloadModel.log(userId, url, platform, qualityLabel, 'completed', downloadResult.size);
  } catch (error) {
    clearInterval(updateInterval);
    await ctx.telegram.deleteMessage(ctx.chat.id, progressMsg?.message_id).catch(() => {});
    await ctx.reply(
      `\u274C <b>Download Failed</b>\n\n${error.message}\n\nPlease try again or try a different quality.`,
      { parse_mode: 'HTML', reply_markup: goBackKeyboard().reply_markup }
    );
    await DownloadModel.log(userId, url, platform, qualityLabel, 'failed', 0, error.message);
  } finally {
    clearInterval(updateInterval);
    processingUsers.delete(userId);
    if (downloadResult?.filePath) {
      await downloader.cleanupFile(downloadResult.filePath);
    }
    ctx.session.currentUrl = null;
    ctx.session.platform = null;
    ctx.session.videoInfo = null;
  }
}

function setupDownloadCommand(bot) {
  ['360p', '720p', '1080p', 'mp3', 'best'].forEach((quality) => {
    bot.action(`dl_${quality}`, async (ctx) => {
      await ctx.answerCbQuery();
      try {
        await ctx.deleteMessage();
      } catch {}
      await processDownload(ctx, quality);
    });
  });
}

module.exports = { setupDownloadCommand, handleDownloadRequest };
