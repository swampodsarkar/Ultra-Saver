require('dotenv').config();

module.exports = {
  botToken: process.env.BOT_TOKEN,

  firebase: {
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    credential: {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    },
  },

  ytdlpPath: process.env.YTPL_PATH || 'yt-dlp',

  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800,
  tempDir: process.env.TEMP_DIR || './temp',
  dailyLimit: 5,
  cooldownTime: parseInt(process.env.COOLDOWN_TIME) || 10,

  supportedPlatforms: [
    { name: 'YouTube', match: /(youtube\.com|youtu\.be)/i },
    { name: 'TikTok', match: /(tiktok\.com)/i },
    { name: 'Facebook', match: /(facebook\.com|fb\.watch|fb\.com)/i },
    { name: 'Instagram', match: /(instagram\.com)/i },
    { name: 'Twitter/X', match: /(twitter\.com|x\.com)/i },
    { name: 'Vimeo', match: /(vimeo\.com)/i },
  ],

  qualityLabels: {
    '360p': { height: 360, ext: 'mp4' },
    '720p': { height: 720, ext: 'mp4' },
    '1080p': { height: 1080, ext: 'mp4' },
    'mp3': { ext: 'mp3' },
    'best': {},
  },
};
