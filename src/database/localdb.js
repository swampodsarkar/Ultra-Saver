const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const DB_PATH = path.resolve('./data/db.json');

let cache = null;
let saveTimeout = null;
let pendingSave = false;

async function load() {
  if (cache) return cache;
  try {
    await fsp.access(DB_PATH, fs.constants.F_OK);
    const raw = await fsp.readFile(DB_PATH, 'utf8');
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache;
}

function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  pendingSave = true;
  saveTimeout = setTimeout(async () => {
    pendingSave = false;
    const dir = path.dirname(DB_PATH);
    try {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(DB_PATH, JSON.stringify(cache, null, 2));
    } catch {}
  }, 200);
}

async function flushSave() {
  if (pendingSave) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = null;
    pendingSave = false;
    const dir = path.dirname(DB_PATH);
    try {
      await fsp.mkdir(dir, { recursive: true });
      await fsp.writeFile(DB_PATH, JSON.stringify(cache, null, 2));
    } catch {}
  }
}

function getNested(obj, keyPath) {
  const keys = keyPath.split('/');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function setNested(obj, keyPath, value) {
  const keys = keyPath.split('/');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function updateNested(obj, keyPath, data) {
  const keys = keyPath.split('/');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    if (i === keys.length - 1) {
      Object.assign(current[keys[i]], data);
    } else {
      current = current[keys[i]];
    }
  }
}

function deleteNested(obj, keyPath) {
  const keys = keyPath.split('/');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current == null || typeof current !== 'object') return;
    current = current[keys[i]];
  }
  if (current) delete current[keys[keys.length - 1]];
}

function queryFiltered(data, field, value) {
  if (!data || typeof data !== 'object') return {};
  return Object.fromEntries(
    Object.entries(data).filter(([, v]) => v && v[field] === value)
  );
}

function queryLimitToLast(data, limit) {
  const entries = Object.entries(data || {});
  return Object.fromEntries(entries.slice(-limit));
}

class LocalSnapshot {
  constructor(data) {
    this._data = data;
  }
  exists() {
    return this._data != null;
  }
  val() {
    return this._data;
  }
}

class LocalRef {
  constructor(keyPath) {
    this._keyPath = keyPath;
    this._filters = [];
    this._limit = null;
    this._orderByField = null;
  }

  orderByChild(field) {
    this._orderByField = field;
    return this;
  }

  equalTo(value) {
    this._equalValue = value;
    return this;
  }

  limitToLast(limit) {
    this._limit = limit;
    return this;
  }

  async once(eventType) {
    const data = await load();
    let result = getNested(data, this._keyPath);

    if (this._orderByField && this._equalValue !== undefined) {
      result = queryFiltered(result, this._orderByField, this._equalValue);
    }

    if (this._limit) {
      result = queryLimitToLast(result, this._limit);
    }

    if (eventType === 'value') {
      return new LocalSnapshot(result != null ? result : null);
    }
    return new LocalSnapshot(result);
  }

  async set(value) {
    const data = await load();
    setNested(data, this._keyPath, value);
    scheduleSave();
  }

  async update(data) {
    const db = await load();
    updateNested(db, this._keyPath, data);
    scheduleSave();
  }

  async remove() {
    const data = await load();
    deleteNested(data, this._keyPath);
    scheduleSave();
  }
}

function ref(keyPath) {
  return new LocalRef(keyPath);
}

module.exports = { ref, flushSave };
