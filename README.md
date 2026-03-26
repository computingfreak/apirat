# ApiRat — Unified API Bin + Mock + Inspector Toolkit

ApiRat is a **GitHub Pages-friendly** app that combines the most useful ideas from tools like **httpbin, reqbin, jsonbin, postbin, beeceptor, and apidog** into one place:

- API request runner (ReqBin/Apidog-style)
- HTTP echo playground links (httpbin-style)
- Local JSON bins and mock routes (jsonbin/postbin-style)
- Slack request URL helper and signature verifier
- One-click export/import for sharing bins and routes

> ⚠️ Important: GitHub Pages is static hosting. It cannot directly receive inbound POST webhooks from Slack by itself. For a production Slack Request URL, use an actual backend endpoint (e.g. Cloudflare Worker, Vercel Function, Netlify Function, or your own server). This repo includes a Worker starter you can deploy and manage from this Pages UI.

## Quick start

1. Push this repo to GitHub.
2. Enable **GitHub Pages** for the default branch (`/root`).
3. Open the published URL.

Optional for Slack webhook handling:

4. Deploy `worker/worker.js` to Cloudflare Workers.
5. Set that Worker URL in your Slack app as the Request URL.
6. Use this GitHub Pages app as a dashboard for mocks/rules/bin payloads and copy the generated config JSON to your Worker KV.

## Features

### 1) Request Runner
- Enter URL, method, headers, body.
- Send request and inspect response status/headers/body.

### 2) Local JSON Bins
- Create/edit/delete bins.
- Save arbitrary JSON payloads in browser local storage.
- Export/import all bins as one JSON blob.

### 3) Mock Route Builder
- Create route rules with path, method, status, headers, and JSON body.
- Save/export/import mock rules.
- Generate configuration payload for Worker runtime.

### 4) Slack Utilities
- Verify Slack signature locally (for debugging)
- Generate sample `url_verification` response payload
- Show endpoint checklist for Slack Request URL readiness

## GitHub Pages deploy

- Settings → Pages
- Source: Deploy from a branch
- Branch: `main` (or your default), folder `/ (root)`

## Worker integration flow (recommended)

1. Build mock routes in this app.
2. Click **Export Config** and copy JSON.
3. Put JSON in Worker KV / environment variable.
4. Worker serves as live webhook endpoint for Slack.
5. GitHub Pages app remains your management UI.

## Files

- `index.html` — app shell
- `styles.css` — UI styling
- `app.js` — all app logic
- `worker/worker.js` — optional serverless endpoint example

## License

MIT
