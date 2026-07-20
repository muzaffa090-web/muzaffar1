import { getStore } from '@netlify/blobs';

const STORE_NAME = 'salesnilpak-state';
const STATE_KEY = 'shared-app-state';
const MAX_BODY_BYTES = 6 * 1024 * 1024;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeState(input) {
  if (!isObject(input)) return {};

  return {
    customers: Array.isArray(input.customers) ? input.customers : [],
    products: Array.isArray(input.products) ? input.products : [],
    sales: Array.isArray(input.sales) ? input.sales : [],
    cashEntries: Array.isArray(input.cashEntries) ? input.cashEntries : [],
    openingBalances: Array.isArray(input.openingBalances) ? input.openingBalances : [],
    openingSummary: isObject(input.openingSummary) ? input.openingSummary : {},
    customerRetroBonuses: isObject(input.customerRetroBonuses) ? input.customerRetroBonuses : {},
    customerRetroBonusEntries: Array.isArray(input.customerRetroBonusEntries) ? input.customerRetroBonusEntries : [],
    marginWithdrawals: Array.isArray(input.marginWithdrawals) ? input.marginWithdrawals : [],
    pricePresets: Array.isArray(input.pricePresets) ? input.pricePresets : [],
    accounts: Array.isArray(input.accounts) ? input.accounts : [],
    orderSequence: Number.isFinite(Number(input.orderSequence)) ? Number(input.orderSequence) : 0,
    customerDefaultsSeeded: input.customerDefaultsSeeded === undefined ? '' : String(input.customerDefaultsSeeded),
    updatedAt: typeof input.updatedAt === 'string' && input.updatedAt ? input.updatedAt : new Date().toISOString()
  };
}

async function readState(store) {
  const saved = await store.get(STATE_KEY, { type: 'json', consistency: 'strong' });
  return isObject(saved) ? saved : {};
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const store = getStore({ name: STORE_NAME, consistency: 'strong' });

  if (request.method === 'GET') {
    const data = await readState(store);
    return jsonResponse(200, {
      ok: true,
      updatedAt: data.updatedAt || '',
      data
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return jsonResponse(413, { ok: false, error: 'State payload is too large' });
  }

  let parsed;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON body' });
  }

  const data = sanitizeState(parsed);
  data.updatedAt = new Date().toISOString();
  await store.setJSON(STATE_KEY, data);

  return jsonResponse(200, {
    ok: true,
    updatedAt: data.updatedAt,
    data
  });
};
