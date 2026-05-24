const { goBackKeyboard } = require('../utils/keyboards');

function setupHelpCommand(bot) {
  bot.action('menu_help', async (ctx) => {
    await ctx.answerCbQuery();

    const text =
      '\u2753 <b>How to Use Ultra Saver</b>\n\n' +
      '1. Send a video link (YouTube, TikTok, etc.)\n' +
      '2. Choose your quality (360p / 720p / 1080p)\n' +
      '3. Or pick MP3 for audio only\n' +
      '4. Wait for the download\n\n' +
      '<b>Supported Platforms:</b>\n' +
      '\u25B6 YouTube\n' +
      '\u266A TikTok\n' +
      '\uD83D\uDCF7 Instagram\n' +
      '\u25B6 Facebook\n' +
      '\uD83D\uDC26 Twitter/X\n' +
      '\u25B6 Vimeo\n\n' +
      '<b>Daily Limit:</b> 5 downloads per day';

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: goBackKeyboard().reply_markup,
    }).catch(() => {});
  });
}

module.exports = { setupHelpCommand };
