const admin = require('firebase-admin');
const config = require('../config');
const localdb = require('./localdb');

let db;
let useLocal = false;

function isFirebaseConfigured() {
  const c = config.firebase?.credential;
  return (
    c?.project_id &&
    c?.project_id !== 'your-project-id' &&
    c?.private_key &&
    !c?.private_key?.includes('YOUR_KEY_HERE')
  );
}

function initFirebase() {
  if (useLocal) return null;

  if (!isFirebaseConfigured()) {
    console.log('Firebase not configured, using local JSON database');
    useLocal = true;
    return null;
  }

  try {
    if (admin.apps.length) return admin.app();

    const app = admin.initializeApp({
      credential: admin.credential.cert(config.firebase.credential),
      databaseURL: config.firebase.databaseURL,
    });

    db = admin.database();
    console.log('Firebase connected');
    return app;
  } catch (error) {
    console.warn('Firebase init failed:', error.message);
    console.log('Falling back to local JSON database');
    useLocal = true;
    return null;
  }
}

function getDB() {
  if (useLocal) return null;
  if (!db) initFirebase();
  return db;
}

function ref(path) {
  if (useLocal) return localdb.ref(path);
  if (!db) initFirebase();
  if (!db) return localdb.ref(path);
  return db.ref(path);
}

module.exports = { initFirebase, getDB, ref, admin };
