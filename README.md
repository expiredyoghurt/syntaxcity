# PSLE City Builder — Fresh Deployment Guide

No trouble at all! This package has everything you need in one place:

```
citybuilder.html            <- the game itself (open this / host this)
cloudflare-worker/
  worker.js                 <- the backend (accounts, saves, leaderboard)
  wrangler.toml              <- config for deploying the backend
```

There are actually **two separate Cloudflare things** involved, which is the
most common source of confusion:

1. **The Worker** — a small backend program that stores accounts, city
   saves, and the leaderboard in Cloudflare KV (a database). This is what
   `cloudflare-worker/` deploys.
2. **The page itself** — just the `citybuilder.html` file, hosted somewhere
   people can open it (Cloudflare Pages, or any other static host, or even
   just downloaded and opened directly in a browser).

These are independent — the Worker doesn't know or care where the HTML page
is hosted. The HTML page just needs to know the Worker's URL. That link
(one line in the HTML file) is almost always where things break, so we'll
be extra careful with it below.

If something's not connecting, the cleanest fix is to tear down whatever's
there and start over — that's what this guide does.

---

## Part 1 — Remove the old Worker setup

If you're not sure whether anything deployed correctly before, it's safe to
just delete it and start clean.

**Option A — via the Cloudflare dashboard:**
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**.
2. Find your old Worker (something like `psle-city-builder`) → open it →
   **Settings** → **Delete**.
3. Go to **Workers & Pages** → **KV** (in the left sidebar). Find the old
   `CITY_DATA` namespace → delete it too, so you get a truly fresh database.

**Option B — via the command line (if you have Wrangler installed):**
```
wrangler delete psle-city-builder
wrangler kv namespace list
wrangler kv namespace delete --namespace-id <the-old-CITY_DATA-id>
```

Don't worry about getting this perfectly right — worst case, you just end
up with an extra unused Worker/namespace sitting in your account, which
costs nothing on the free tier.

---

## Part 2 — Deploy the Worker (fresh)

### 1. Install Wrangler (Cloudflare's CLI tool)
```
npm install -g wrangler
```

### 2. Log in
```
wrangler login
```
This opens a browser tab to connect Wrangler to your Cloudflare account.

### 3. Create a brand-new KV namespace
From inside the `cloudflare-worker/` folder:
```
cd cloudflare-worker
wrangler kv namespace create CITY_DATA
```
This prints something like:
```
{ binding = "CITY_DATA", id = "abcd1234efgh5678..." }
```
**Copy that `id` value** — you'll need it in the next step.

### 4. Update `wrangler.toml`
Open `cloudflare-worker/wrangler.toml` and replace
`REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with the id you just copied. It should
look like:
```toml
kv_namespaces = [
  { binding = "CITY_DATA", id = "abcd1234efgh5678..." }
]
```

### 5. Deploy
```
wrangler deploy
```
Wrangler will print your live Worker URL, something like:
```
https://psle-city-builder.<your-subdomain>.workers.dev
```
**Copy this URL exactly.** This is the one piece of information the whole
setup hinges on.

### 6. Verify the Worker is actually live (do this before touching the HTML file)
Open this URL in your browser (paste your real Worker URL, add `/leaderboard`):
```
https://psle-city-builder.<your-subdomain>.workers.dev/leaderboard
```
You should see `[]` (an empty array) in the browser. If you see that, the
Worker is live and working. If you see an error page or nothing loads, the
Worker itself isn't deployed correctly yet — recheck steps 3–5 before
moving on.

---

## Part 3 — Connect the game to the Worker

1. Open `citybuilder.html` in a plain text editor (Notepad, VS Code, etc. —
   not Word).
2. Find this line near the top of the `<script>` section:
   ```js
   var API_BASE = 'REPLACE_WITH_YOUR_WORKER_URL';
   ```
3. Replace the placeholder with your real Worker URL from Part 2 step 5,
   **with no trailing slash**:
   ```js
   var API_BASE = 'https://psle-city-builder.your-subdomain.workers.dev';
   ```
4. Save the file.

Common mistakes to double-check here, since this line is the #1 cause of
"doesn't connect":
- Missing `https://` at the start
- A trailing `/` at the end (should NOT be there)
- Copy-pasted extra spaces or quote characters
- Using the Cloudflare *dashboard URL* instead of the actual `*.workers.dev`
  URL Wrangler printed

---

## Part 4 — Host the page

Pick whichever is easiest for you:

**Option A — Cloudflare Pages (dashboard, no CLI needed):**
1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Upload assets**.
2. Give it a project name, then upload just `citybuilder.html`.
3. Cloudflare gives you a URL like `https://your-project.pages.dev` — share that with your class.
4. If you ever update `citybuilder.html` again, re-upload it to the same Pages project to replace it.

**Option B — just distribute the file directly:**
Share `citybuilder.html` itself (email, Google Drive, USB stick, whatever).
Anyone can open it directly in a browser and it'll talk to your Worker the
same way, since the Worker connection doesn't depend on how the page itself
is hosted.

---

## Part 5 — Test it actually works end-to-end

1. Open your hosted page (or the local file).
2. Try **Found My City** with a test name/City Key.
3. Open your browser's Developer Tools (F12) → **Network** tab, and check
   for any request to `/api/register` — it should come back with a green
   200 status, not red/failed.
4. If it works, you should see a message like "City founded! Saved to the
   class server." If instead you see "Server unreachable — founding your
   city locally for now," the connection isn't working — recheck Part 3.
5. As a final check, open your Worker's `/leaderboard` URL again in a new
   tab — after submitting a city from the dashboard's leaderboard panel,
   you should see it appear in that JSON list.

---

## Troubleshooting

- **"Server unreachable" messages in the game** → almost always the
  `API_BASE` line (Part 3) is wrong, missing, or still the placeholder text.
- **Browser console shows a CORS error** → the Worker already sends the
  right CORS headers for every route, so this usually means the request
  never actually reached the Worker at all (wrong URL) rather than a real
  CORS problem. Recheck the URL.
- **`wrangler deploy` fails mentioning KV** → the `id` in `wrangler.toml`
  doesn't match a real namespace in your account. Redo Part 2 step 3–4.
- **Everything looks right but it still won't connect** → open the
  `/leaderboard` URL directly in a browser tab (Part 2 step 6). If that
  doesn't return `[]`, the problem is entirely on the Worker side, not the
  HTML file — focus troubleshooting there.
- **The admin panel (`simcity`/`simcity`) can't find a mayor** → that's
  expected if that mayor only ever played in guest mode or before the
  Worker was connected — their city only exists in that one browser's local
  storage, not on the server.

If you get stuck on a specific error message or behavior, sharing exactly
what you see (a screenshot of the Network tab request, or the exact text of
an error) will make it much faster to pin down than "doesn't connect."
