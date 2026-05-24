const { UserModel } = require('../database/models');
const { MainMenu } = require('../utils/keyboards');
const { formatDate } = require('../utils/helpers');

function setupProfileCommand(bot) {
  bot.action('menu_profile', async (ctx) => {
    await ctx.answerCbQuery();
    const user = await UserModel.get(ctx.from.id);

    if (!user) {
      return ctx.editMessageText(
        '\u26A0\uFE0F Profile not found. Use /start to register.',
        { parse_mode: 'HTML', reply_markup: MainMenu.reply_markup }
      ).catch(() => {});
    }

    const premiumStatus = user.premiumStatus && user.premiumUntil > Date.now()
      ? '\u2705 Active'
      : '\u274C Inactive';
    const premiumUntil = user.premiumUntil
      ? formatDate(user.premiumUntil)
      : 'N/A';

    const text =
      '\u2699\uFE0F <b>Your Profile</b>\n\n' +
      `\uD83D\uDC64 <b>ID:</b> <code>${user.telegramId}</code>\n` +
      `\uD83D\uDCDB <b>Username:</b> ${user.username ? '@' + user.username : 'Not set'}\n` +
      `\uD83D\uDCAC <b>Name:</b> ${user.firstName || 'N/A'}\n` +
      `\uD83D\uDCC5 <b>Joined:</b> ${formatDate(user.joinDate)}\n\n` +
      `\uD83D\uDCC8 <b>Downloads:</b> ${user.totalDownloads || 0}\n` +
      `\uD83D\uDC51 <b>Premium:</b> ${premiumStatus}\n` +
      `\uD83D\uDCC5 <b>Premium Until:</b> ${premiumUntil}\n` +
      `\uD83D\uDCB0 <b>Coins:</b> ${user.coins || 0}\n` +
      `\uD83D\uDC65 <b>Referrals:</b> ${user.referralCount || 0}\n\n` +
      '<i>Use the menu below to navigate</i>';

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: MainMenu.reply_markup,
    }).catch(() => {});
  });
}

module.exports = { setupProfileCommand };
