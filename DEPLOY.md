# Deploying BioSOP to Cloudflare at **taylorflaat-biosop.org**

Everything below is done once. After that, every push to your GitHub repo redeploys automatically.

What you end up with:

- The app served at `https://taylorflaat-biosop.org` (and `www.`) on Cloudflare Workers
- Each user's protocols stay in their own browser by default (optional shared D1 storage for teams)
- Your Gemini key stored as a Worker secret — never in the repo
- Free tier: 100k requests/day — far more than a lab needs

Prerequisites: a GitHub account, a Cloudflare account with `taylorflaat-biosop.org` added as a zone (its nameservers pointed at Cloudflare), and a Gemini API key from Google AI Studio → *Get API key*.

---

## 1. Put the code on GitHub

1. Unzip `biosop-v3.zip`.
2. On GitHub: **New repository** → name it `biosop` → *Create*.
3. On the empty-repo page choose **uploading an existing file**, then drag the *contents* of the unzipped folder (not the folder itself) into the browser window — GitHub accepts whole folder trees by drag-and-drop. `node_modules` is not in the zip; don't add it.
4. **Commit changes**.

(GitHub Desktop or `git push` work too.)

## 2. Connect the repo (Cloudflare dashboard)

Dashboard → **Compute (Workers) → Workers & Pages → Create → Import a repository** → authorise GitHub → pick `biosop`.
Build settings:
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

Click **Deploy**. The first build takes ~2 minutes and gives you a `*.workers.dev` URL.

**No database is needed.** By default every user's protocols, versions, signatures and audit log are stored only in *their own browser* (see "Data & privacy" in the app). The Worker is stateless: it proxies the AI calls and does reference verification, nothing else is retained.

<details><summary>Optional: shared team storage (D1)</summary>

If several people should see the same protocols on this deployment: Dashboard → **Storage & Databases → D1 → Create database** → name `biosop` → copy its **Database ID** → in `wrangler.jsonc` uncomment the `d1_databases` block and paste the ID → commit. Users then choose *Shared team storage* in the app's Data & privacy panel. Apply the schema with `npm run cf:migrate` or let the Worker create it on first use.
</details>

## 3. Add the secret

Worker → **Settings → Variables and Secrets → Add** → type *Secret* → name `GEMINI_API_KEY` → paste your key → **Deploy**.

Optional, same place: `NCBI_API_KEY` (raises the PubMed rate limit).

> **Do not set `BIOSOP_API_TOKEN` on a deployment you use from a browser.** If it is set, every AI
> endpoint demands an `Authorization: Bearer <token>` header, and the web UI does not send one — the
> whole app returns *Unauthorized.* The token exists for scripted/CLI callers only. To protect a
> public site, use a Cloudflare WAF rate-limiting rule or Cloudflare Access instead (see Notes below).

## 4. Attach the domain

`wrangler.jsonc` already lists `taylorflaat-biosop.org` and `www.taylorflaat-biosop.org` as **custom domains**, so the deploy attaches them automatically *if the zone is on the same Cloudflare account*: Cloudflare creates the DNS records and TLS certificate for you. Check **Worker → Settings → Domains & Routes** — both should show *Active* within minutes.

If they don't appear, add them there with **Add → Custom domain**. No A/CNAME records to type, no certificate to request.

## 5. Try it

Open `https://taylorflaat-biosop.org`. `https://taylorflaat-biosop.org/api/health` should return `"runtime":"cloudflare-workers"`.

Generate a protocol — it's saved in your browser automatically. Save versions, sign, export Excel/Word, build worklists: all live.

---

## Day-to-day

- **Deploy a change:** push to GitHub. Cloudflare rebuilds and deploys.
- **Logs:** Worker → **Observability** (enabled in `wrangler.jsonc`).
- **Inspect data (team storage only):** D1 → `biosop` → **Explore data**.
- **Change the model:** `wrangler.jsonc → vars.GEMINI_MODEL`, commit.

## From your own computer instead (optional)

```bash
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy                        # vite build + wrangler deploy
```

Local Worker preview: `cp .dev.vars.example .dev.vars` (add your key), then `npm run cf:dev` → http://localhost:8787.
Local Node server (SQLite file, Vite HMR): `npm run dev` → http://localhost:3000.

## Notes and limits

- **Rate limiting** in the Worker is per-isolate and best-effort. For a public site add a Cloudflare
  **WAF rate-limiting rule** on `/api/generate-sop*` (one rule is free). To restrict the site to named
  people, put **Cloudflare Access** in front of the domain — it gates the browser before requests reach
  the Worker, which `BIOSOP_API_TOKEN` cannot do. A bearer token shipped in a browser bundle is readable
  by anyone viewing source, so it protects nothing there; set it only for API/CLI consumers.
- **Long generations** stream over SSE, which Workers support. If a generation fails the stream returns an `error` event and the UI reports it.
- **Outbound calls** from the Worker: Gemini, Crossref, NCBI E-utilities — all reachable from Workers.
