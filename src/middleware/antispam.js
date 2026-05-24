const { getRemainingCooldown } = require('../utils/helpers');
const config = require('../config');

const userTimestamps = new Map();

function antispamMiddleware() {
  return (ctx, next) => {
    if (!ctx.from) return next();

    const userId = ctx.from.id;
    const now = Date.now();
    const lastTime = userTimestamps.get(userId) || 0;
    const remaining = getRemainingCooldown(lastTime, config.cooldownTime);

    if (remaining > 0) {
      const seconds = Math.ceil(remaining);
      return ctx
        .reply(`\u26A0\uFE0F Please wait ${seconds}s before sending another request.`)
        .catch(() => {});
    }

    userTimestamps.set(userId, now);
    return next();
  };
}

function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = config.cooldownTime * 1000 * 10;
  for (const [key, value] of userTimestamps.entries()) {
    if (now - value > maxAge) userTimestamps.delete(key);
  }
}

setInterval(cleanupOldEntries, 60000);

module.exports = { antispamMiddleware };
