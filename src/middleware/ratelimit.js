const rateLimitMap = new Map();

function rateLimitMiddleware(limit, windowMs) {
  return (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(userId)) {
      rateLimitMap.set(userId, []);
    }

    const timestamps = rateLimitMap.get(userId).filter((t) => t > windowStart);
    timestamps.push(now);
    rateLimitMap.set(userId, timestamps);

    if (timestamps.length > limit) {
      return ctx.reply('\u26A0\uFE0F Too many requests. Please slow down.').catch(() => {});
    }

    return next();
  };
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < 60000);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  }
}

setInterval(cleanupRateLimits, 30000);

module.exports = { rateLimitMiddleware };
