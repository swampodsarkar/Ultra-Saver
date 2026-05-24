const { Markup } = require('telegraf');

const MainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('\uD83D\uDCE5 Download', 'menu_download')],
  [
    Markup.button.callback('\uD83D\uDC51 Premium', 'menu_premium'),
    Markup.button.callback('\uD83D\uDCB0 Earn Coins', 'menu_coins'),
  ],
  [
    Markup.button.callback('\uD83D\uDC65 Referral', 'menu_referral'),
    Markup.button.callback('\uD83D\uDCCB History', 'menu_history'),
  ],
  [
    Markup.button.callback('\u2699\uFE0F Profile', 'menu_profile'),
    Markup.button.callback('\u2753 Help', 'menu_help'),
  ],
]);

const QualityButtons = Markup.inlineKeyboard([
  [
    Markup.button.callback('360p \uD83D\uDCBB', 'dl_360p'),
    Markup.button.callback('720p \uD83D\uDCF1', 'dl_720p'),
    Markup.button.callback('1080p \uD83D\uDCFA', 'dl_1080p'),
  ],
  [
    Markup.button.callback('\uD83C\uDFB5 MP3 Audio', 'dl_mp3'),
    Markup.button.callback('\uD83C\uDFC6 Best Quality', 'dl_best'),
  ],
  [Markup.button.callback('\uD83D\uDD19 Back to Menu', 'back_menu')],
]);

function getPremiumButtons(isPremium) {
  if (isPremium) {
    return Markup.inlineKeyboard([
      [Markup.button.url('\u2728 Premium Active', 'https://t.me/YOUR_BOT')],
      [Markup.button.callback('\uD83D\uDD19 Back', 'back_menu')],
    ]);
  }
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('\uD83D\uDCB3 Buy Premium', 'buy_premium'),
      Markup.button.callback('\uD83C\uDF81 Redeem Code', 'redeem_premium'),
    ],
    [Markup.button.callback('\uD83D\uDD19 Back to Menu', 'back_menu')],
  ]);
}

const CoinMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('\uD83D\uDCC5 Daily Check-in', 'coin_checkin'),
    Markup.button.callback('\uD83D\uDC65 Invite Friends', 'coin_invite'),
  ],
  [
    Markup.button.callback('\uD83D\uDCFA Watch Ad', 'coin_ad'),
    Markup.button.callback('\uD83D\uDD14 Join Channel', 'coin_channel'),
  ],
  [Markup.button.callback('\uD83D\uDD19 Back to Menu', 'back_menu')],
]);

const ReferralMenu = Markup.inlineKeyboard([
  [Markup.button.switchToChat('\uD83D\uDCE4 Share Bot', `Join me on this awesome downloader bot!`)],
  [Markup.button.callback('\uD83D\uDD19 Back to Menu', 'back_menu')],
]);

const HelpMenu = Markup.inlineKeyboard([
  [Markup.button.url('\uD83D\uDCF1 Our Channel', 'https://t.me/YOUR_CHANNEL')],
  [Markup.button.callback('\uD83D\uDD19 Back to Menu', 'back_menu')],
]);

function goBackKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('\u2705 Send Another Link', 'menu_download')],
    [Markup.button.callback('\uD83D\uDD19 Main Menu', 'back_menu')],
  ]);
}

const AdminMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('\uD83D\uDCCA Stats', 'admin_stats'),
    Markup.button.callback('\uD83D\uDCE3 Broadcast', 'admin_broadcast'),
  ],
  [
    Markup.button.callback('\uD83D\uDC51 Add Premium', 'admin_addprem'),
    Markup.button.callback('\u274C Remove Premium', 'admin_rmprem'),
  ],
  [
    Markup.button.callback('\uD83E\uDE99 Add Coins', 'admin_addcoins'),
    Markup.button.callback('\uD83D\uDEAB Ban User', 'admin_ban'),
  ],
  [Markup.button.callback('\uD83D\uDD19 Close', 'admin_close')],
]);

module.exports = {
  MainMenu,
  QualityButtons,
  getPremiumButtons,
  CoinMenu,
  ReferralMenu,
  HelpMenu,
  goBackKeyboard,
  AdminMenu,
};
