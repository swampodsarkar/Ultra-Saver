const { MainMenu } = require('../utils/keyboards');
const { UserModel } = require('../database/models');

function setupStartCommand(bot) {
  bot.start(async (ctx) => {
    const { id, username, first_name: firstName } = ctx.from;
    await UserModel.create(id, username, firstName);

    const text =
      '\uD83D\uDC4B <b>Welcome to Ultra Saver!</b>\n\n' +
      'Send me any video link and I\'ll download it for you.\n\n' +
      '\u25B6 YouTube | \u266A TikTok | \uD83D\uDCF7 Instagram\n' +
      '\u25B6 Facebook | \uD83D\uDC26 Twitter/X | \u25B6 Vimeo\n\n' +
      '\u2728 <b>Daily Limit:</b> 5 downloads per day\n' +
      '\u2728 Choose quality: 360p, 720p, 1080p\n' +
      '\u2728 Extract MP3 audio\n\n' +
      '\uD83D\uDC47 <b>Choose an option:</b>';

    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: MainMenu.reply_markup,
    });
  });

  bot.action('back_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '\uD83D\uDC4B <b>Main Menu</b>\n\nChoose an option below:',
      {
        parse_mode: 'HTML',
        reply_markup: MainMenu.reply_markup,
      }
    ).catch(() => {});
  });

  bot.action('menu_download', async (ctx) => {
    await ctx.answerCbQuery();
    const msg = await ctx.reply(
      '\uD83D\uDCE5 <b>Send me a video link!</b>\n\nSupported platforms:\n\u25B6 YouTube | \u266A TikTok | \uD83D\uDCF7 Instagram\n\u25B6 Facebook | \uD83D\uDC26 Twitter/X | \u25B6 Vimeo\n\n<i>Just paste the URL here...</i>',
      { parse_mode: 'HTML' }
    );
    ctx.session.awaitingUrl = true;
    ctx.session.urlMessageId = msg.message_id;
  });
}

module.exports = { setupStartCommand };
