const { getPremiumButtons } = require('../utils/keyboards');
const { UserModel } = require('../database/models');

function formatExpiry(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function setupPremiumCommand(bot) {
  bot.action('menu_premium', async (ctx) => {
    await ctx.answerCbQuery();
    const user = await UserModel.get(ctx.from.id);

    if (user?.premiumStatus && user?.premiumUntil > Date.now()) {
      return ctx.editMessageText(
        '\uD83D\uDC51 <b>Premium Active</b>\n\n' +
        '\u2705 <b>Benefits:</b>\n' +
        '\u2728 Unlimited downloads\n' +
        '\u2728 HD quality (1080p)\n' +
        '\u2728 No ads\n' +
        '\u2728 Faster processing\n\n' +
        `\uD83D\uDCC5 Expires: ${formatExpiry(user.premiumUntil)}\n\n` +
        'Thank you for being a Premium member!',
        { parse_mode: 'HTML', reply_markup: getPremiumButtons(true).reply_markup }
      ).catch(() => {});
    }

    return ctx.editMessageText(
      '\uD83D\uDC51 <b>DownloaderPro Premium</b>\n\n' +
      '<b>Premium Features:</b>\n' +
      '\u2728 <b>Unlimited Downloads</b> - No daily limits\n' +
      '\u2728 <b>HD Quality</b> - 1080p & Best Quality\n' +
      '\u2728 <b>No Ads</b> - Clean experience\n' +
      '\u2728 <b>Priority Speed</b> - Faster processing\n' +
      '\u2728 <b>Exclusive Support</b> - Priority help\n\n' +
      '<b>Pricing:</b>\n' +
      '\uD83D\uDFE2 Weekly - $2.99\n' +
      '\uD83D\uDFE2 Monthly - $7.99\n' +
      '\uD83D\uDFE2 Lifetime - $19.99\n\n' +
      '<i>Contact admin to purchase premium.</i>',
      { parse_mode: 'HTML', reply_markup: getPremiumButtons(false).reply_markup }
    ).catch(() => {});
  });

  bot.action('buy_premium', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '\uD83D\uDCB3 <b>Purchase Premium</b>\n\n' +
      'To purchase premium, please contact the admin:\n' +
      '\uD83D\uDCAC @YourAdminUsername\n\n' +
      'Include your User ID in the message:\n' +
      `<code>${ctx.from.id}</code>\n\n` +
      '<b>Available Plans:</b>\n' +
      '\uD83D\uDFE2 Weekly - $2.99\n' +
      '\uD83D\uDFE2 Monthly - $7.99\n' +
      '\uD83D\uDFE2 Lifetime - $19.99\n\n' +
      '<i>Payments accepted: UPI, Crypto, PayPal</i>',
      { parse_mode: 'HTML', reply_markup: getPremiumButtons(false).reply_markup }
    ).catch(() => {});
  });

  bot.action('redeem_premium', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '\uD83C\uDF81 <b>Redeem Premium Code</b>\n\n' +
      'Enter your premium code:\n' +
      '<i>Type your code as a message (e.g., PREM-XXXX-XXXX)</i>',
      { parse_mode: 'HTML', reply_markup: getPremiumButtons(false).reply_markup }
    ).catch(() => {});

    ctx.session.awaitingRedeem = true;
  });
}

module.exports = { setupPremiumCommand };
