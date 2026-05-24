const config = require('../config');

function detectPlatform(url) {
  for (const platform of config.supportedPlatforms) {
    if (platform.match.test(url)) return platform.name;
  }
  return null;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatSize(bytes) {
  if (!bytes || isNaN(bytes)) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRemainingCooldown(lastTime, cooldownSeconds) {
  if (!lastTime) return 0;
  const elapsed = (Date.now() - lastTime) / 1000;
  return Math.max(0, cooldownSeconds - elapsed);
}

function getDailyReset(user) {
  if (!user || !user.lastDailyReset) return true;
  const lastReset = new Date(user.lastDailyReset);
  const now = new Date();
  return (
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  );
}

function getRemainingDownloads(user) {
  if (!user) return config.dailyLimitFree;
  if (getDailyReset(user)) return config.dailyLimitFree;
  const limit = user.premiumStatus ? config.dailyLimitPremium : config.dailyLimitFree;
  return Math.max(0, limit - (user.dailyDownloads || 0));
}

function canDownload(user) {
  if (!user || user.isBanned) return false;
  if (user.premiumStatus) return true;
  return getRemainingDownloads(user) > 0;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function getPlatformEmoji(platform) {
  const map = {
    'YouTube': '\u25B6',
    'TikTok': '\u266A',
    'Facebook': '\u25B6',
    'Instagram': '\uD83D\uDCF7',
    'Twitter/X': '\ud83d\udc26',
    'Vimeo': '\u25B6',
  };
  return map[platform] || '\uD83D\uDCCE';
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  detectPlatform,
  formatDuration,
  formatSize,
  formatDate,
  getRemainingCooldown,
  getDailyReset,
  getRemainingDownloads,
  canDownload,
  escapeHtml,
  escapeMarkdown,
  truncate,
  getPlatformEmoji,
  sleep,
};
