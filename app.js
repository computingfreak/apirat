const STORAGE = {
  bins: 'apirat_bins_v1',
  routes: 'apirat_routes_v1',
};

const state = {
  bins: loadJson(STORAGE.bins, {}),
  routes: loadJson(STORAGE.routes, []),
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function el(id) {
  return document.getElementById(id);
}

function safeParseJson(text, fallback = {}) {
  if (!text || !text.trim()) return fallback;
  return JSON.parse(text);
}

async function sendRequest() {
  const method = el('method').value;
  const url = el('url').value.trim();
  const headersText = el('headers').value;
  const body = el('body').value;
  const output = el('response');

  if (!url) {
    output.textContent = 'Please provide a URL.';
    return;
  }

  let headers = {};
  try {
    headers = safeParseJson(headersText, {});
  } catch (err) {
    output.textContent = `Invalid headers JSON: ${err.message}`;
    return;
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'DELETE' ? undefined : body,
    });

    const resHeaders = {};
    res.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });

    const text = await res.text();
    let parsed = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep text
    }

    output.textContent = JSON.stringify(
      {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: parsed,
      },
      null,
      2,
    );
  } catch (err) {
    output.textContent = `Request failed: ${err.message}`;
  }
}

function renderBins() {
  const list = el('binList');
  list.innerHTML = '';

  Object.keys(state.bins)
    .sort()
    .forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      list.appendChild(option);
    });
}

function bindBins() {
  el('newBinBtn').onclick = () => {
    el('binName').value = `bin-${Date.now()}`;
    el('binPayload').value = '{\n  "hello": "world"\n}';
  };

  el('saveBinBtn').onclick = () => {
    const name = el('binName').value.trim();
    if (!name) return alert('Bin name is required.');

    try {
      const payload = safeParseJson(el('binPayload').value, {});
      state.bins[name] = payload;
      saveJson(STORAGE.bins, state.bins);
      renderBins();
    } catch (err) {
      alert(`Invalid JSON payload: ${err.message}`);
    }
  };

  el('deleteBinBtn').onclick = () => {
    const selected = el('binList').value;
    if (!selected) return;
    delete state.bins[selected];
    saveJson(STORAGE.bins, state.bins);
    renderBins();
    el('binPayload').value = '';
  };

  el('binList').onchange = () => {
    const selected = el('binList').value;
    el('binName').value = selected;
    el('binPayload').value = JSON.stringify(state.bins[selected], null, 2);
  };

  el('exportBinsBtn').onclick = async () => {
    await navigator.clipboard.writeText(JSON.stringify(state.bins, null, 2));
    alert('Bins JSON copied to clipboard.');
  };

  el('importBinsBtn').onclick = async () => {
    const raw = prompt('Paste bins JSON');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      state.bins = parsed;
      saveJson(STORAGE.bins, state.bins);
      renderBins();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };
}

function routeKey(route) {
  return `${route.method} ${route.path}`;
}

function renderRoutes() {
  const list = el('routeList');
  list.innerHTML = '';

  state.routes.forEach((route) => {
    const option = document.createElement('option');
    option.value = routeKey(route);
    option.textContent = `${route.method} ${route.path} → ${route.status}`;
    list.appendChild(option);
  });

  el('configPreview').textContent = JSON.stringify({ routes: state.routes }, null, 2);
}

function bindRoutes() {
  el('addRouteBtn').onclick = () => {
    try {
      const route = {
        method: el('routeMethod').value,
        path: el('routePath').value.trim(),
        status: Number(el('routeStatus').value || 200),
        headers: safeParseJson(el('routeHeaders').value, { 'Content-Type': 'application/json' }),
        body: safeParseJson(el('routeBody').value, { ok: true }),
      };

      if (!route.path.startsWith('/')) {
        alert('Route path must start with /.');
        return;
      }

      const idx = state.routes.findIndex((r) => routeKey(r) === routeKey(route));
      if (idx >= 0) state.routes[idx] = route;
      else state.routes.push(route);

      saveJson(STORAGE.routes, state.routes);
      renderRoutes();
    } catch (err) {
      alert(`Invalid route input: ${err.message}`);
    }
  };

  el('removeRouteBtn').onclick = () => {
    const key = el('routeList').value;
    if (!key) return;
    state.routes = state.routes.filter((r) => routeKey(r) !== key);
    saveJson(STORAGE.routes, state.routes);
    renderRoutes();
  };

  el('routeList').onchange = () => {
    const key = el('routeList').value;
    const route = state.routes.find((r) => routeKey(r) === key);
    if (!route) return;

    el('routePath').value = route.path;
    el('routeMethod').value = route.method;
    el('routeStatus').value = String(route.status);
    el('routeHeaders').value = JSON.stringify(route.headers || {}, null, 2);
    el('routeBody').value = JSON.stringify(route.body ?? {}, null, 2);
  };

  el('exportConfigBtn').onclick = async () => {
    const blob = {
      version: 1,
      routes: state.routes,
      exportedAt: new Date().toISOString(),
    };
    await navigator.clipboard.writeText(JSON.stringify(blob, null, 2));
    alert('Worker config copied to clipboard.');
  };
}

function bindSlackTools() {
  el('verifySlackBtn').onclick = async () => {
    const secret = el('slackSigningSecret').value;
    const ts = el('slackTimestamp').value;
    const rawBody = el('slackRawBody').value;
    const givenSig = el('slackSignature').value.trim();

    if (!secret || !ts || !rawBody || !givenSig) {
      el('slackResult').textContent = 'Missing required fields.';
      return;
    }

    const base = `v0:${ts}:${rawBody}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(base));
    const hex = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const computed = `v0=${hex}`;

    const same = computed === givenSig;
    const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(ts));

    el('slackResult').textContent = JSON.stringify(
      {
        validSignature: same,
        computed,
        provided: givenSig,
        timestampAgeSec: ageSec,
        withinFiveMinutes: ageSec <= 60 * 5,
      },
      null,
      2,
    );
  };
}

function initPresets() {
  if (!el('url').value) {
    el('url').value = 'https://httpbin.org/anything';
  }
  if (!el('headers').value) {
    el('headers').value = JSON.stringify({ 'Content-Type': 'application/json' }, null, 2);
  }
  if (!el('body').value) {
    el('body').value = JSON.stringify({ ping: 'pong' }, null, 2);
  }
}

function init() {
  initPresets();
  bindBins();
  bindRoutes();
  bindSlackTools();
  renderBins();
  renderRoutes();
  el('sendBtn').onclick = sendRequest;
}

init();
