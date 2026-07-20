import { getStore, listStores } from '@netlify/blobs';

const PRIMARY_STORE_NAME = process.env.NETLIFY_STATE_STORE || 'salesnilpak-state';
const PRIMARY_STATE_KEY = process.env.NETLIFY_STATE_KEY || 'state';

const APP_DATA_KEYS = [
  'customers',
  'products',
  'sales',
  'cashEntries',
  'openingBalances',
  'openingSummary',
  'customerRetroBonuses',
  'customerRetroBonusEntries',
  'marginWithdrawals',
  'pricePresets',
  'accounts',
  'orderSequence'
];

const LEGACY_LOCATIONS = [
  { store: PRIMARY_STORE_NAME, key: PRIMARY_STATE_KEY },
  { store: 'salesnilpak', key: 'state' },
  { store: 'salesnilpak-state', key: 'state' },
  { store: 'sales-doctor', key: 'state' },
  { store: 'muzaffar1-sales-doctor', key: 'state' },
  { store: 'app-state', key: 'state' },
  { store: 'state', key: 'state' },
  { store: 'salesnilpak', key: 'app-state' },
  { store: 'salesnilpak-state', key: 'app-state' },
  { store: 'app-state', key: 'salesnilpak' },
  { store: 'app-state', key: 'shared-data' }
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function looksLikeAppData(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && !Array.isArray(value)
      && APP_DATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function normalizeStoredState(value) {
  const parsed = parseMaybeJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const data = looksLikeAppData(parsed.data) ? parsed.data : parsed;
  if (!looksLikeAppData(data)) return null;

  return {
    data,
    updatedAt: parsed.updatedAt || data.updatedAt || ''
  };
}

async function readStateFrom(storeName, key) {
  try {
    const store = getStore({ name: storeName, consistency: 'strong' });
    const value = await store.get(key, { type: 'json', consistency: 'strong' });
    return normalizeStoredState(value);
  } catch {
    return null;
  }
}

async function findExistingState() {
  const seen = new Set();

  for (const location of LEGACY_LOCATIONS) {
    const id = `${location.store}:${location.key}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const state = await readStateFrom(location.store, location.key);
    if (state) return state;
  }

  try {
    const stores = await listStores();
    for (const item of stores || []) {
      const storeName = typeof item === 'string' ? item : item?.name;
      if (!storeName || !/sales|nilpak|doctor|state|app/i.test(storeName)) continue;

      for (const key of ['state', 'app-state', 'shared-data', 'data']) {
        const id = `${storeName}:${key}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const state = await readStateFrom(storeName, key);
        if (state) return state;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function saveState(data) {
  const existing = await readStateFrom(PRIMARY_STORE_NAME, PRIMARY_STATE_KEY);
  const incomingUpdatedAt = data.updatedAt || new Date().toISOString();
  const existingUpdatedAt = existing?.updatedAt || '';

  if (existingUpdatedAt && incomingUpdatedAt && incomingUpdatedAt < existingUpdatedAt) {
    return {
      ignored: true,
      updatedAt: existingUpdatedAt
    };
  }

  const store = getStore({ name: PRIMARY_STORE_NAME, consistency: 'strong' });
  const payload = {
    data: {
      ...data,
      updatedAt: incomingUpdatedAt
    },
    updatedAt: incomingUpdatedAt
  };

  await store.setJSON(PRIMARY_STATE_KEY, payload);
  return {
    ignored: false,
    updatedAt: incomingUpdatedAt
  };
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (request.method === 'GET') {
    const state = await findExistingState();
    return jsonResponse(state || { data: null, updatedAt: '' });
  }

  if (request.method === 'POST') {
    let data;
    try {
      data = await request.json();
    } catch {
      return jsonResponse({ error: 'JSON notogri yuborildi.' }, 400);
    }

    if (!looksLikeAppData(data)) {
      return jsonResponse({ error: 'Saqlanadigan malumot topilmadi.' }, 400);
    }

    const result = await saveState(data);
    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Bu amal qollab-quvvatlanmaydi.' }, 405);
};
