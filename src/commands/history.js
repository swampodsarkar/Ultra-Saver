const { UserModel, DownloadModel } = require('../database/models');
const { MainMenu } = require('../utils/keyboards');
const { formatDate, formatSize } = require('../utils/helpers');

function setupHistoryCommand(bot) {
  bot.action('menu_history', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const downloads = await DownloadModel.getUserDownloads(userId, 10);

    if (!downloads || downloads.length === 0) {
      return ctx.editMessageText(
        '\uD83D\uDCCB <b>Download History</b>\n\n' +
        'No downloads yet.\n' +
        'Send a video link to get started!',
        { parse_mode: 'HTML', reply_markup: MainMenu.reply_markup }
      ).catch(() => {});
    }

    let text = '\uD83D\uDCCB <b>Download History</b>\n\n';
    downloads.forEach((dl, i) => {
      const statusEmoji = dl.status === 'completed' ? '\u2705' : '\u274C';
      text += `${i + 1}. ${statusEmoji} <b>${dl.platform || 'Unknown'}</b>\n`;
      text += `   ${dl.quality || 'N/A'} | ${formatSize(dl.size)}\n`;
      text += `   ${formatDate(dl.timestamp)}\n\n`;
    });

    text += '<i>Showing last 10 downloads</i>';

    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: MainMenu.reply_markup,
    }).catch(() => {});
  });
}

module.exports = { setupHistoryCommand };
