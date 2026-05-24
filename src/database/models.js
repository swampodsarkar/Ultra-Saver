const { ref } = require('./firebase');
const { v4: uuidv4 } = require('uuid');

const UserModel = {
  async create(telegramId, username, firstName) {
    const userRef = ref(`users/${telegramId}`);
    const snapshot = await userRef.once('value');
    if (snapshot.exists()) return snapshot.val();

    const user = {
      telegramId,
      username: username || '',
      firstName: firstName || '',
      totalDownloads: 0,
      joinDate: Date.now(),
      lastDailyReset: Date.now(),
      dailyDownloads: 0,
    };

    await userRef.set(user);
    return user;
  },

  async get(telegramId) {
    const snapshot = await ref(`users/${telegramId}`).once('value');
    return snapshot.val();
  },

  async update(telegramId, data) {
    await ref(`users/${telegramId}`).update(data);
    const snapshot = await ref(`users/${telegramId}`).once('value');
    return snapshot.val();
  },

  async incrementDownloads(telegramId) {
    const user = await this.get(telegramId);
    if (!user) return null;
    const now = new Date();
    const lastReset = user.lastDailyReset ? new Date(user.lastDailyReset) : null;
    const needsReset = !lastReset ||
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();
    return this.update(telegramId, {
      totalDownloads: (user.totalDownloads || 0) + 1,
      dailyDownloads: needsReset ? 1 : (user.dailyDownloads || 0) + 1,
      lastDailyReset: needsReset ? Date.now() : user.lastDailyReset,
    });
  },

};

const DownloadModel = {
  async log(telegramId, url, platform, quality, status, size, error) {
    const downloadId = uuidv4();
    const entry = {
      telegramId,
      url,
      platform,
      quality,
      status,
      size: size || 0,
      error: error || null,
      timestamp: Date.now(),
    };
    await ref(`downloads/${downloadId}`).set(entry);
    return downloadId;
  },

};

module.exports = { UserModel, DownloadModel };
