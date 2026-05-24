const { UserModel } = require('../database/models');
const { CoinMenu } = require('../utils/keyboards');

const dailyCheckins = new Map();

function setupCoinsCommand(bot) {
  bot.action('menu_coins', async (ctx) => {
    await ctx.answerCbQuery();
    const user = await UserModel.get(ctx.from.id);
    const coins = user?.coins || 0;

    await ctx.editMessageText(
      '\uD83D\uDCB0 <b>Earn Coins</b>\n\n' +
      `<b>Your Balance: ${coins} coins</b>\n\n` +
      '<b>Ways to earn:</b>\n' +
      '\uD83D\uDCC5 <b>Daily Check-in</b> - +10 coins (daily)\n' +
      '\uD83D\uDC65 <b>Invite Friends</b> - +25 coins per referral\n' +
      '\uD83D\uDCFA <b>Watch Ads</b> - +5 coins per ad\n' +
      '\uD83D\uDD14 <b>Join Channel</b> - +15 coins\n\n' +
      '<b>Spend coins:</b>\n' +
      '\u2022 100 coins = Extra 5 downloads\n' +
      '\u2022 500 coins = 1 Day Premium\n\n' +
      '<i>Choose an option below:</i>',
      { parse_mode: 'HTML', reply_markup: CoinMenu.reply_markup }
    ).catch(() => {});
  });

  bot.action('coin_checkin', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const today = new Date().toDateString();

    if (dailyCheckins.get(userId) === today) {
      return ctx.answerCbQuery('\u26A0\uFE0F You already checked in today!', { show_alert: true });
    }

    dailyCheckins.set(userId, today);
    await UserModel.addCoins(userId, 10);

    await ctx.editMessageText(
      '\u2705 <b>Daily Check-in Complete!</b>\n\n' +
      '\uD83D\uDCB0 You earned <b>10 coins</b>!\n\n' +
      'Come back tomorrow for more coins!',
      { parse_mode: 'HTML', reply_markup: CoinMenu.reply_markup }
    ).catch(() => {});
  });

  bot.action('coin_invite', async (ctx) => {
    await ctx.answerCbQuery();
    const botUsername = ctx.botInfo?.username || 'YourBot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${ctx.from.id}`;

    await ctx.editMessageText(
      '\uD83D\uDC65 <b>Invite Friends</b>\n\n' +
      'Share your referral link and earn <b>25 coins</b> for each friend who joins!\n\n' +
      `<code>${referralLink}</code>\n\n` +
      'Tap the button below to share:',
      { parse_mode: 'HTML', reply_markup: CoinMenu.reply_markup }
    ).catch(() => {});
  });

  bot.action('coin_ad', async (ctx) => {
    await ctx.answerCbQuery('\uD83D\uDCFA Watch a sponsored post to earn coins!', { show_alert: false });
    const user = await UserModel.get(ctx.from.id);

    await UserModel.addCoins(ctx.from.id, 5);
    await ctx.editMessageText(
      '\u2705 <b>Ad Watched!</b>\n\n' +
      '\uD83D\uDCB0 You earned <b>5 coins</b>!\n' +
      `<b>Total balance: ${(user?.coins || 0) + 5} coins</b>\n\n` +
      'Watch another ad to earn more!',
      { parse_mode: 'HTML', reply_markup: CoinMenu.reply_markup }
    ).catch(() => {});
  });

  bot.action('coin_channel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '\uD83D\uDD14 <b>Join Our Channel</b>\n\n' +
      'Join our official channel to earn <b>15 coins</b>!\n\n' +
      '\uD83D\uDCF1 <a href="https://t.me/YOUR_CHANNEL">Join Channel</a>\n\n' +
      'After joining, click the verify button below.',
      { parse_mode: 'HTML', reply_markup: CoinMenu.reply_markup }
    ).catch(() => {});
  });
}

module.exports = { setupCoinsCommand };
