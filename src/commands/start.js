const { MainMenu } = require('../utils/keyboards');
const { UserModel, ReferralModel } = require('../database/models');

const WELCOME_IMAGE = 'https://i.imgur.com/placeholder.png';

const WELCOME_TEXT = `
\uD83C\uDF89 <b>Welcome to DownloaderPro Bot!</b>

Your ultimate video downloader from:
\u25B6 YouTube | \u266A TikTok | \uD83D\uDCF7 Instagram
\u25B6 Facebook | \uD83D\uDC26 Twitter/X | \u25B6 Vimeo

<b>What you can do:</b>
\u2728 Download videos in HD quality
\u2728 Extract audio as MP3
\u2728 Unlimited downloads with Premium
\u2728 Earn coins and rewards

<b>How to use:</b>
Just send me any video link and I'll download it for you!

\uD83D\uDC47 <b>Choose an option below to get started</b>
`;

function setupStartCommand(bot) {
  bot.start(async (ctx) => {
    const { id, username, first_name: firstName } = ctx.from;
    const refParam = ctx.payload;

    let referredBy = null;
    if (refParam && refParam.startsWith('ref_')) {
      referredBy = refParam.replace('ref_', '');
      if (referredBy == id) referredBy = null;
    }

    await UserModel.create(id, username, firstName);

    if (referredBy) {
      const referrer = await UserModel.get(parseInt(referredBy));
      if (referrer && !referrer.isBanned) {
        await ReferralModel.create(parseInt(referredBy), id);
        await UserModel.incrementReferralCount(parseInt(referredBy));
        await UserModel.addCoins(parseInt(referredBy), 25);
        await UserModel.update(id, { referredBy: parseInt(referredBy) });

        try {
          await ctx.telegram.sendMessage(
            parseInt(referredBy),
            `\uD83C\uDF89 <b>New Referral!</b>\n\n${firstName} joined using your link!\nYou earned <b>25 coins</b>!`,
            { parse_mode: 'HTML' }
          );
        } catch {}
      }
    }

    try {
      await ctx.replyWithPhoto(WELCOME_IMAGE, {
        caption: WELCOME_TEXT,
        parse_mode: 'HTML',
        reply_markup: MainMenu.reply_markup,
      });
    } catch {
      await ctx.reply(WELCOME_TEXT, {
        parse_mode: 'HTML',
        reply_markup: MainMenu.reply_markup,
      });
    }
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
