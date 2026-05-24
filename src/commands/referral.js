const { UserModel, ReferralModel } = require('../database/models');
const { ReferralMenu } = require('../utils/keyboards');

function setupReferralCommand(bot) {
  bot.action('menu_referral', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const user = await UserModel.get(userId);
    const referralCount = await ReferralModel.getReferralCount(userId);

    const botUsername = ctx.botInfo?.username || 'YourBot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;

    const coins = user?.coins || 0;

    await ctx.editMessageText(
      '\uD83D\uDC65 <b>Referral Program</b>\n\n' +
      'Invite your friends and earn rewards!\n\n' +
      '<b>Your Referral Link:</b>\n' +
      `<code>${referralLink}</code>\n\n` +
      '<b>Your Stats:</b>\n' +
      `\uD83D\uDC65 Friends invited: ${referralCount}\n` +
      `\uD83D\uDCB0 Coins earned: ${referralCount * 25}\n` +
      `\uD83D\uDCB8 Balance: ${coins} coins\n\n` +
      '<b>Rewards:</b>\n' +
      '\u2022 1 referral = 25 coins\n' +
      '\u2022 5 referrals = 1 Day Premium\n' +
      '\u2022 10 referrals = 3 Days Premium\n' +
      '\u2022 20 referrals = 1 Week Premium\n\n' +
      '<i>Share the link with your friends!</i>',
      { parse_mode: 'HTML', reply_markup: ReferralMenu.reply_markup }
    ).catch(() => {});
  });
}

module.exports = { setupReferralCommand };
