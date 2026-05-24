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
      premiumStatus: false,
      premiumUntil: null,
      coins: 0,
      referralCount: 0,
      referredBy: null,
      joinDate: Date.now(),
      lastDailyReset: Date.now(),
      dailyDownloads: 0,
      isBanned: false,
      banReason: null,
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

  async incrementReferralCount(telegramId) {
    const user = await this.get(telegramId);
    if (!user) return null;
    return this.update(telegramId, {
      referralCount: (user.referralCount || 0) + 1,
    });
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

  async resetDailyLimits() {
    const snapshot = await ref('users').once('value');
    const users = snapshot.val();
    if (!users) return;
    const now = Date.now();
    const updates = {};
    for (const id of Object.keys(users)) {
      updates[`${id}/dailyDownloads`] = 0;
      updates[`${id}/lastDailyReset`] = now;
    }
    await ref('users').update(updates);
  },

  async setPremium(telegramId, days) {
    const user = await this.get(telegramId);
    if (!user) return null;
    const until = Date.now() + days * 86400000;
    return this.update(telegramId, {
      premiumStatus: true,
      premiumUntil: until,
    });
  },

  async removePremium(telegramId) {
    return this.update(telegramId, {
      premiumStatus: false,
      premiumUntil: null,
    });
  },

  async addCoins(telegramId, amount) {
    const user = await this.get(telegramId);
    if (!user) return null;
    return this.update(telegramId, {
      coins: (user.coins || 0) + amount,
    });
  },

  async deductCoins(telegramId, amount) {
    const user = await this.get(telegramId);
    if (!user) return null;
    if ((user.coins || 0) < amount) return null;
    return this.update(telegramId, {
      coins: (user.coins || 0) - amount,
    });
  },

  async ban(telegramId, reason) {
    return this.update(telegramId, {
      isBanned: true,
      banReason: reason || 'Violated terms of service',
    });
  },

  async unban(telegramId) {
    return this.update(telegramId, {
      isBanned: false,
      banReason: null,
    });
  },

  async getAll() {
    const snapshot = await ref('users').once('value');
    return snapshot.val() || {};
  },

  async getStats() {
    const users = await this.getAll();
    const ids = Object.keys(users);
    const total = ids.length;
    const premium = ids.filter((id) => users[id].premiumStatus).length;
    const banned = ids.filter((id) => users[id].isBanned).length;
    const totalDownloads = ids.reduce((sum, id) => sum + (users[id].totalDownloads || 0), 0);
    return { total, premium, banned, totalDownloads };
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

  async getUserDownloads(telegramId, limit = 20) {
    const snapshot = await ref('downloads')
      .orderByChild('telegramId')
      .equalTo(telegramId)
      .limitToLast(limit)
      .once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.values(data).reverse();
  },

  async getAllStats() {
    const snapshot = await ref('downloads').once('value');
    const data = snapshot.val();
    if (!data) return { total: 0, totalSize: 0 };
    const ids = Object.keys(data);
    return {
      total: ids.length,
      totalSize: ids.reduce((sum, id) => sum + (data[id].size || 0), 0),
    };
  },
};

const ReferralModel = {
  async create(telegramId, referredId) {
    await ref(`referrals/${referredId}`).set({
      referrerId: telegramId,
      referredId,
      timestamp: Date.now(),
    });
  },

  async getReferrals(telegramId) {
    const snapshot = await ref('referrals')
      .orderByChild('referrerId')
      .equalTo(telegramId)
      .once('value');
    const data = snapshot.val();
    if (!data) return [];
    return Object.values(data);
  },

  async getReferralCount(telegramId) {
    const referrals = await this.getReferrals(telegramId);
    return referrals.length;
  },
};

const SettingModel = {
  async get(key) {
    const snapshot = await ref(`settings/${key}`).once('value');
    return snapshot.val();
  },

  async set(key, value) {
    await ref(`settings/${key}`).set(value);
  },

  async getAll() {
    const snapshot = await ref('settings').once('value');
    return snapshot.val() || {};
  },
};

module.exports = { UserModel, DownloadModel, ReferralModel, SettingModel };
