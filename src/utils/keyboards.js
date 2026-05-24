const { Markup } = require('telegraf');

const MainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('\uD83D\uDCE5 Download Video', 'menu_download')],
  [Markup.button.callback('\u2753 Help', 'menu_help')],
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
  [Markup.button.callback('\uD83D\uDD19 Main Menu', 'back_menu')],
]);

function goBackKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('\u2705 Download Another', 'menu_download')],
    [Markup.button.callback('\uD83D\uDD19 Main Menu', 'back_menu')],
  ]);
}

module.exports = {
  MainMenu,
  QualityButtons,
  goBackKeyboard,
};
