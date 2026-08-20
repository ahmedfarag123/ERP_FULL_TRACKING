import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export function requireEnv(name) {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
export function requireNumberEnv(name) {
  const value = Number(requireEnv(name));
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return value;
}
function optionalNumberEnv(name) {
  const raw = Deno.env.get(name)?.trim();
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return value;
}
export const ODOO_BASE_URL = requireEnv('ODOO_BASE_URL');
export const ODOO_DB = requireEnv('ODOO_DB');
export const ODOO_PASSWORD = Deno.env.get('ODOO_PASSWORD')?.trim() ?? '';
export const ODOO_UID = optionalNumberEnv('ODOO_UID');
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
function syncAllowedRoles() {
  const configuredRoles = (Deno.env.get('ODOO_SYNC_ALLOWED_ROLES') ?? '').split(',').map((role)=>role.trim().toLowerCase()).filter(Boolean);
  return new Set(configuredRoles.length > 0 ? configuredRoles : [
    'admin',
    'manager',
    'spv',
    'dispatcher',
    'supervisor',
    'telesales',
    'sales_agent'
  ]);
}
const encoder = new TextEncoder();
function constantTimeEqual(left, right) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;
  for(let index = 0; index < length; index += 1){
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return diff === 0;
}
function bearerToken(req) {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}
function hasValidSyncSecret(req) {
  const expectedSecret = (Deno.env.get('ODOO_SYNC_SECRET') ?? Deno.env.get('SYNC_SECRET') ?? '').trim();
  const providedSecret = (req.headers.get('x-sync-secret') ?? '').trim();
  if (!expectedSecret || !providedSecret) {
    return false;
  }
  return constantTimeEqual(providedSecret, expectedSecret);
}
async function hasManagementToken(req) {
  const token = bearerToken(req);
  if (!token) {
    return false;
  }
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  const userId = authData.user?.id;
  if (authError || !userId) {
    return false;
  }
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role, status').eq('id', userId).maybeSingle();
  if (profileError || !profile) {
    return false;
  }
  const role = String(profile.role ?? '').trim().toLowerCase();
  const status = String(profile.status ?? '').trim().toLowerCase();
  if (status && status !== 'active') {
    return false;
  }
  return syncAllowedRoles().has(role);
}
export async function requireOdooSyncAccess(req) {
  if (req.method !== 'POST') {
    return jsonResponse({
      success: false,
      error: 'Method not allowed.'
    }, 405);
  }
  if (hasValidSyncSecret(req)) {
    return null;
  }
  if (await hasManagementToken(req)) {
    return null;
  }
  return jsonResponse({
    success: false,
    error: 'Unauthorized sync request.'
  }, 401);
}
async function sleep(ms) {
  return new Promise((resolve)=>setTimeout(resolve, ms));
}
export async function callOdoo(payload, retries = 3) {
  let lastError;
  for(let attempt = 0; attempt < retries; attempt++){
    try {
      const response = await fetch(ODOO_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok && response.status >= 500 && attempt < retries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
        continue;
      }
      const data = await response.json();
      if (data?.error) {
        throw new Error(JSON.stringify(data.error));
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  throw lastError;
}
export async function authenticateOdooUser(username, password) {
  const login = username.trim();
  if (!login || !password) {
    throw new Error('Odoo email and password are required.');
  }
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'common',
      method: 'authenticate',
      args: [
        ODOO_DB,
        login,
        password,
        {}
      ]
    },
    id: `odoo-auth-${Date.now()}`
  };
  const result = await callOdoo(payload);
  const uid = Number(result?.result);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new Error('Odoo authentication failed.');
  }
  return uid;
}
export async function executeOdooKwWithCredentials({ uid, password, model, methodName, args = [], kwargs = {} }) {
  if (!Number.isFinite(uid) || uid <= 0 || !password) {
    throw new Error('Valid Odoo uid and password are required.');
  }
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        ODOO_DB,
        uid,
        password,
        model,
        methodName,
        args,
        {
          ...kwargs,
          context: odooContext(kwargs.context ?? {})
        }
      ]
    },
    id: `${model}-${methodName}-${Date.now()}`
  };
  const result = await callOdoo(payload);
  return result.result;
}
export function requireServiceOdooUid() {
  if (!Number.isFinite(ODOO_UID) || !ODOO_UID || ODOO_UID <= 0) {
    throw new Error('Missing required environment variable: ODOO_UID');
  }
  return ODOO_UID;
}
export function requireServiceOdooPassword() {
  if (!ODOO_PASSWORD) {
    throw new Error('Missing required environment variable: ODOO_PASSWORD');
  }
  return ODOO_PASSWORD;
}
export async function fetchOdooBatches({ model, fields, domain, batchSize = 500, order, maxRows }) {
  const serviceUid = requireServiceOdooUid();
  const servicePassword = requireServiceOdooPassword();
  const rows = [];
  let offset = 0;
  while(true){
    const remainingRows = typeof maxRows === 'number' ? maxRows - rows.length : batchSize;
    if (remainingRows <= 0) {
      break;
    }
    const limit = Math.min(batchSize, remainingRows);
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          ODOO_DB,
          serviceUid,
          servicePassword,
          model,
          'search_read',
          [
            domain
          ],
          {
            fields,
            limit,
            offset,
            ...order ? {
              order
            } : {}
          }
        ]
      },
      id: `${model}-${offset}`
    };
    const result = await callOdoo(payload);
    const batch = Array.isArray(result.result) ? result.result : [];
    if (batch.length === 0) {
      break;
    }
    rows.push(...batch);
    if (batch.length < limit) {
      break;
    }
    offset += limit;
  }
  return rows;
}
export async function fetchOdooByIds({ model, ids, fields }) {
  if (ids.length === 0) {
    return [];
  }
  const serviceUid = requireServiceOdooUid();
  const servicePassword = requireServiceOdooPassword();
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        ODOO_DB,
        serviceUid,
        servicePassword,
        model,
        'search_read',
        [
          [
            [
              'id',
              'in',
              ids
            ]
          ]
        ],
        {
          fields,
          limit: Math.max(ids.length, 1)
        }
      ]
    },
    id: `${model}-by-ids`
  };
  const result = await callOdoo(payload);
  return Array.isArray(result.result) ? result.result : [];
}
export async function fetchOdooFieldNames(model) {
  const serviceUid = requireServiceOdooUid();
  const servicePassword = requireServiceOdooPassword();
  const payload = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        ODOO_DB,
        serviceUid,
        servicePassword,
        model,
        'fields_get',
        [],
        {
          attributes: [
            'string'
          ]
        }
      ]
    },
    id: `${model}-fields`
  };
  const result = await callOdoo(payload);
  if (!result?.result || typeof result.result !== 'object') {
    return new Set();
  }
  return new Set(Object.keys(result.result));
}
export function flattenReference(value) {
  if (Array.isArray(value)) {
    const parts = value.map((part)=>String(part ?? '').trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : null;
  }
  const raw = String(value ?? '').trim();
  return raw || null;
}
export function referenceId(value) {
  if (Array.isArray(value) && value.length > 0) {
    const raw = String(value[0] ?? '').trim();
    return raw || null;
  }
  return null;
}
export function referenceName(value) {
  if (Array.isArray(value) && value.length > 1) {
    const raw = String(value[1] ?? '').trim();
    return raw || null;
  }
  return null;
}
export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}
export function toNullableIso(value) {
  if (value === null || value === undefined || value === false || value === '') {
    return null;
  }
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
export function toNullableNumber(value) {
  if (value == null || value === '' || value === false) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export function formatUnknownError(error) {
  if (error instanceof Error) {
    if (error.message && error.message !== '[object Object]') {
      return error.message;
    }
    try {
      return JSON.stringify(Object.fromEntries(Object.getOwnPropertyNames(error).map((key)=>[
          key,
          error[key]
        ])));
    } catch  {
      return error.message || String(error);
    }
  }
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== '{}' ? serialized : String(error);
  } catch  {
    return String(error);
  }
}
export function toRecordStatus(activeValue) {
  return activeValue === false ? 'inactive' : 'active';
}
export function buildLastSyncDate(value) {
  if (!value) {
    return '2000-01-01 00:00:00';
  }
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - 5);
  return date.toISOString().replace('T', ' ').split('.')[0];
}
export function odooContext(extra = {}) {
  const lang = Deno.env.get('ODOO_LANG')?.trim() || 'ar_001';
  return {
    lang,
    ...extra
  };
}
export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
