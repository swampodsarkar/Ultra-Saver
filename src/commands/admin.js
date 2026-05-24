const { UserModel, DownloadModel, ReferralModel } = require('../database/models');
const { AdminMenu } = require('../utils/keyboards');
const config = require('../config');
const { formatSize } = require('../utils/helpers');

function isAdmin(ctx) {
  return config.adminIds.includes(ctx.from.id);
}

function requireAdmin(bot) {
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type === 'private' && ctx.message?.text?.startsWith('/')) {
      const adminCommands = ['/admin', '/broadcast', '/stats', '/addpremium', '/removepremium', '/addcoins', '/ban', '/unban'];
      if (adminCommands.includes(ctx.message.text.split(' ')[0]) && !isAdmin(ctx)) {
        return ctx.reply('\u26D4 Unauthorized. This command is for admins only.');
      }
    }
    return next();
  });
}

async function handleAdminCommand(ctx) {
  if (!isAdmin(ctx)) return;

  const stats = await UserModel.getStats();
  const dlStats = await DownloadModel.getAllStats();

  const text =
    '\uD83D\uDEE1\uFE0F <b>Admin Panel</b>\n\n' +
    '<b>System Stats:</b>\n' +
    `\uD83D\uDC64 Total Users: ${stats.total}\n` +
    `\uD83D\uDC51 Premium: ${stats.premium}\n` +
    `\uD83D\uDEAB Banned: ${stats.banned}\n` +
    `\uD83D\uDCC8 Downloads: ${stats.totalDownloads}\n` +
    `\uD83D\uDCC2 Total Size: ${formatSize(dlStats.totalSize)}\n\n` +
    '<b>Quick Actions:</b>';

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: AdminMenu.reply_markup,
  });
}

async function handleBroadcast(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  if (!args) return ctx.reply('Usage: /broadcast <message>');

  const users = await UserModel.getAll();
  const userIds = Object.keys(users);
  let sent = 0;
  let failed = 0;

  const statusMsg = await ctx.reply(`\uD83D\uDCE3 Broadcasting to ${userIds.length} users...`);

  for (const id of userIds) {
    try {
      await ctx.telegram.sendMessage(parseInt(id), args, { parse_mode: 'HTML' });
      sent++;
    } catch {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    statusMsg.message_id,
    null,
    `\u2705 Broadcast complete!\n\n\u2705 Sent: ${sent}\n\u274C Failed: ${failed}`
  );
}

async function handleStats(ctx) {
  if (!isAdmin(ctx)) return;
  const stats = await UserModel.getStats();
  const dlStats = await DownloadModel.getAllStats();

  await ctx.reply(
    '\uD83D\uDCCA <b>Bot Statistics</b>\n\n' +
    `\uD83D\uDC64 <b>Users:</b> ${stats.total}\n` +
    `\uD83D\uDC51 <b>Premium:</b> ${stats.premium}\n` +
    `\uD83D\uDEAB <b>Banned:</b> ${stats.banned}\n` +
    `\uD83D\uDCC8 <b>Total Downloads:</b> ${stats.totalDownloads}\n` +
    `\uD83D\uDCC2 <b>Total Size:</b> ${formatSize(dlStats.totalSize)}\n` +
    `\uD83D\uDCC5 <b>Downloads Count:</b> ${dlStats.total}`,
    { parse_mode: 'HTML' }
  );
}

async function handleAddPremium(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ');
  if (args.length < 3) return ctx.reply('Usage: /addpremium <user_id> <days>');

  const userId = parseInt(args[1]);
  const days = parseInt(args[2]);
  if (isNaN(userId) || isNaN(days)) return ctx.reply('Invalid arguments.');

  const user = await UserModel.get(userId);
  if (!user) return ctx.reply('\u274C User not found.');

  await UserModel.setPremium(userId, days);
  await ctx.reply(`\u2705 Premium added for user ${userId} for ${days} days.`);

  try {
    await ctx.telegram.sendMessage(
      userId,
      `\uD83C\uDF89 <b>Premium Activated!</b>\n\nYou have been granted Premium for <b>${days} days</b>!\nEnjoy unlimited downloads!`,
      { parse_mode: 'HTML' }
    );
  } catch {}
}

async function handleRemovePremium(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply('Usage: /removepremium <user_id>');

  const userId = parseInt(args[1]);
  if (isNaN(userId)) return ctx.reply('Invalid user ID.');

  const user = await UserModel.get(userId);
  if (!user) return ctx.reply('\u274C User not found.');

  await UserModel.removePremium(userId);
  await ctx.reply(`\u2705 Premium removed for user ${userId}.`);

  try {
    await ctx.telegram.sendMessage(
      userId,
      `\uD83D\uDC51 Your Premium membership has ended.\nThanks for being with us!`,
      { parse_mode: 'HTML' }
    );
  } catch {}
}

async function handleAddCoins(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ');
  if (args.length < 3) return ctx.reply('Usage: /addcoins <user_id> <amount>');

  const userId = parseInt(args[1]);
  const amount = parseInt(args[2]);
  if (isNaN(userId) || isNaN(amount)) return ctx.reply('Invalid arguments.');

  const user = await UserModel.get(userId);
  if (!user) return ctx.reply('\u274C User not found.');

  await UserModel.addCoins(userId, amount);
  await ctx.reply(`\u2705 Added ${amount} coins to user ${userId}.`);
}

async function handleBan(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply('Usage: /ban <user_id> [reason]');

  const userId = parseInt(args[1]);
  const reason = args.slice(2).join(' ') || 'Violated terms of service';
  if (isNaN(userId)) return ctx.reply('Invalid user ID.');

  const user = await UserModel.get(userId);
  if (!user) return ctx.reply('\u274C User not found.');

  await UserModel.ban(userId, reason);
  await ctx.reply(`\u2705 User ${userId} has been banned.\nReason: ${reason}`);
}

async function handleUnban(ctx) {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply('Usage: /unban <user_id>');

  const userId = parseInt(args[1]);
  if (isNaN(userId)) return ctx.reply('Invalid user ID.');

  const user = await UserModel.get(userId);
  if (!user) return ctx.reply('\u274C User not found.');

  await UserModel.unban(userId);
  await ctx.reply(`\u2705 User ${userId} has been unbanned.`);
}

function setupAdminCommand(bot) {
  requireAdmin(bot);

  bot.command('admin', handleAdminCommand);
  bot.command('broadcast', handleBroadcast);
  bot.command('stats', handleStats);
  bot.command('addpremium', handleAddPremium);
  bot.command('removepremium', handleRemovePremium);
  bot.command('addcoins', handleAddCoins);
  bot.command('ban', handleBan);
  bot.command('unban', handleUnban);

  bot.action('admin_stats', async (ctx) => {
    await ctx.answerCbQuery();
    const stats = await UserModel.getStats();
    const dlStats = await DownloadModel.getAllStats();
    await ctx.editMessageText(
      '\uD83D\uDCCA <b>Bot Statistics</b>\n\n' +
      `\uD83D\uDC64 <b>Users:</b> ${stats.total}\n` +
      `\uD83D\uDC51 <b>Premium:</b> ${stats.premium}\n` +
      `\uD83D\uDEAB <b>Banned:</b> ${stats.banned}\n` +
      `\uD83D\uDCC8 <b>Total Downloads:</b> ${stats.totalDownloads}\n` +
      `\uD83D\uDCC2 <b>Total Size:</b> ${formatSize(dlStats.totalSize)}\n` +
      `\uD83D\uDCC5 <b>Downloads Count:</b> ${dlStats.total}`,
      { parse_mode: 'HTML', reply_markup: AdminMenu.reply_markup }
    ).catch(() => {});
  });

  bot.action('admin_broadcast', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '\uD83D\uDCE3 Send your broadcast message:\n\n<i>Type the message you want to send to all users.</i>',
      { parse_mode: 'HTML' }
    ).catch(() => {});
    ctx.session.awaitingBroadcast = true;
  });

  bot.action('admin_addprem', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Usage: /addpremium <user_id> <days>');
  });

  bot.action('admin_rmprem', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Usage: /removepremium <user_id>');
  });

  bot.action('admin_addcoins', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Usage: /addcoins <user_id> <amount>');
  });

  bot.action('admin_ban', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Usage: /ban <user_id> [reason]');
  });

  bot.action('admin_close', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.deleteMessage();
    } catch {}
  });
}

module.exports = { setupAdminCommand };
