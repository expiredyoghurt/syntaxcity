/**
 * PSLE City Builder — Backend Worker
 * -----------------------------------
 * Deploy this to Cloudflare Workers (with a KV namespace bound as CITY_DATA)
 * Set secret environment variable ADMIN_PASSCODE in Cloudflare Dashboard.
 */

const GRID_SIZE = 20;
const MAX_LEADERBOARD_ENTRIES = 200;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Passcode',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// Secure SHA-256 password hashing via Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function defaultGameState() {
  return {
    money: 500, wood: 200, stone: 100, gold: 0,
    population: 0, maxPopulation: 50, era: 1,
    publicUtilitiesBuilt: false,
    industrialBonuses: { wood: 0, stone: 0, gold: 0, all: 0 },
    gridSize: GRID_SIZE,
    layout: Array(GRID_SIZE * GRID_SIZE).fill(null),
    stats: { shiftsCompleted: 0, correct: 0, wrong: 0, byCategory: {} },
  };
}

function accountKey(username) {
  return 'account:' + String(username || '').trim().toLowerCase();
}

async function readJsonBody(request) {
  try { return await request.json(); } catch (e) { return null; }
}

async function readAccount(env, username) {
  const raw = await env.CITY_DATA.get(accountKey(username));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function writeAccount(env, account) {
  await env.CITY_DATA.put(accountKey(account.username), JSON.stringify(account));
}

async function readLeaderboard(env) {
  const raw = await env.CITY_DATA.get('leaderboard');
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; }
  catch (e) { return []; }
}

async function writeLeaderboard(env, entries) {
  await env.CITY_DATA.put('leaderboard', JSON.stringify(entries));
}

function checkAdminPasscode(request, env) {
  const expectedPasscode = env.ADMIN_PASSCODE || 'simcity';
  return request.headers.get('X-Admin-Passcode') === expectedPasscode;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // ---------------- Accounts ----------------
    if (path === '/api/register' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (!body || !body.username || !body.password) {
        return jsonResponse({ error: 'A username and password are required.' }, 400);
      }
      const existing = await readAccount(env, body.username);
      if (existing) return jsonResponse({ error: 'That mayor name is already taken.' }, 409);

      const hashedPassword = await hashPassword(body.password);
      const account = { username: body.username, password: hashedPassword, game: defaultGameState() };
      await writeAccount(env, account);
      return jsonResponse({ game: account.game });
    }

    if (path === '/api/login' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (!body || !body.username || !body.password) {
        return jsonResponse({ error: 'A username and password are required.' }, 400);
      }
      const account = await readAccount(env, body.username);
      const inputHash = await hashPassword(body.password);
      if (!account || account.password !== inputHash) {
        return jsonResponse({ error: 'Mayor name and City Key do not match.' }, 401);
      }
      return jsonResponse({ game: account.game });
    }

    if (path === '/api/save' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (!body || !body.username || !body.password || !body.game) {
        return jsonResponse({ error: 'Missing username, password, or game data.' }, 400);
      }
      const account = await readAccount(env, body.username);
      const inputHash = await hashPassword(body.password);
      if (!account || account.password !== inputHash) {
        return jsonResponse({ error: 'Mayor name and City Key do not match.' }, 401);
      }
      account.game = body.game;
      await writeAccount(env, account);
      return jsonResponse({ ok: true });
    }

    // ---------------- Admin (teacher tools) ----------------
    if (path === '/api/admin/player' && request.method === 'GET') {
      if (!checkAdminPasscode(request, env)) return jsonResponse({ error: 'Incorrect admin passcode.' }, 403);
      const name = url.searchParams.get('name');
      if (!name) return jsonResponse({ error: 'A mayor name is required.' }, 400);
      const account = await readAccount(env, name);
      if (!account) return jsonResponse({ error: 'No account found for that mayor.' }, 404);
      return jsonResponse({ username: account.username, game: account.game });
    }

    if (path === '/api/admin/player' && request.method === 'POST') {
      if (!checkAdminPasscode(request, env)) return jsonResponse({ error: 'Incorrect admin passcode.' }, 403);
      const body = await readJsonBody(request);
      if (!body || !body.name || !body.game) return jsonResponse({ error: 'A mayor name and game data are required.' }, 400);
      const account = await readAccount(env, body.name);
      if (!account) return jsonResponse({ error: 'No account found for that mayor.' }, 404);
      account.game = body.game;
      await writeAccount(env, account);
      return jsonResponse({ ok: true });
    }

    // ---------------- Leaderboard ----------------
    if (path === '/leaderboard' && request.method === 'GET') {
      const entries = await readLeaderboard(env);
      entries.sort((a, b) => (b.population || 0) - (a.population || 0));
      return jsonResponse(entries.slice(0, MAX_LEADERBOARD_ENTRIES));
    }

    if (path === '/leaderboard' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (!body || !body.name || !body.password) {
        return jsonResponse({ error: 'Mayor name and password are required.' }, 400);
      }
      
      // Verify credentials before writing to leaderboard
      const account = await readAccount(env, body.name);
      const inputHash = await hashPassword(body.password);
      if (!account || account.password !== inputHash) {
        return jsonResponse({ error: 'Unauthorized submission.' }, 401);
      }

      const entry = {
        name: String(body.name).trim().slice(0, 40),
        population: Math.max(0, Math.min(100000, Number(body.population) || 0)),
        era: Math.max(1, Math.min(10, Number(body.era) || 1)),
        money: Math.max(0, Math.min(10000000, Number(body.money) || 0)),
        buildings: Math.max(0, Math.min(1000, Number(body.buildings) || 0)),
        correct: Math.max(0, Math.min(1000000, Number(body.correct) || 0)),
        attempted: Math.max(0, Math.min(1000000, Number(body.attempted) || 0)),
        ts: Date.now(),
      };

      let entries = await readLeaderboard(env);
      entries = entries.filter((e) => e.name.toLowerCase() !== entry.name.toLowerCase());
      entries.push(entry);
      entries.sort((a, b) => b.population - a.population);
      entries = entries.slice(0, MAX_LEADERBOARD_ENTRIES);
      await writeLeaderboard(env, entries);
      return jsonResponse(entries);
    }

    if (path === '/leaderboard/reset' && request.method === 'POST') {
      if (!checkAdminPasscode(request, env)) return jsonResponse({ error: 'Incorrect admin passcode.' }, 403);
      await writeLeaderboard(env, []);
      return jsonResponse({ ok: true, message: 'Leaderboard cleared.' });
    }

    return jsonResponse({ error: 'Not found.' }, 404);
  },
};
