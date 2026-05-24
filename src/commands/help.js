const { HelpMenu } = require('../utils/keyboards');

function setupHelpCommand(bot) {
  bot.action('menu_help', async (ctx) => {
    await ctx.answerCbQuery();

    const helpText =
      '\u2753 <b>Help Center</b>\n\n' +
      '<b>How to download?</b>\n' +
      '1. Click \u201cDownload\u201d button\n' +
      '2. Send any supported video link\n' +
      '3. Choose quality\n' +
      '4. Wait for download\n\n' +
      '<b>Supported Platforms:</b>\n' +
      '\u25B6 YouTube (videos, shorts)\n' +
      '\u266A TikTok (videos, no watermark)\n' +
      '\uD83D\uDCF7 Instagram (reels, posts)\n' +
      '\u25B6 Facebook (videos, reels)\n' +
      '\uD83D\uDC26 Twitter/X (videos)\n' +
      '\u25B6 Vimeo (videos)\n\n' +
      '<b>Limits:</b>\n' +
      '\u2022 Free: 10 downloads/day\n' +
      '\u2022 Premium: Unlimited\n\n' +
      '<b>Earn Coins:</b>\n' +
      '\u2022 Daily check-in: 10 coins\n' +
      '\u2022 Refer friends: 25 coins each\n' +
      '\u2022 Watch ads: 5 coins\n\n' +
      '<b>Need more help?</b>\n' +
      'Contact @YourAdminUsername';

    await ctx.editMessageText(helpText, {
      parse_mode: 'HTML',
      reply_markup: HelpMenu.reply_markup,
    }).catch(() => {});
  });
}

module.exports = { setupHelpCommand };
