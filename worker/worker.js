/**
 * Cloudflare Worker starter for ApiRat.
 *
 * Configure ROUTE_CONFIG as JSON string in env vars or KV.
 * Example:
 * {"routes":[{"method":"POST","path":"/slack/events","status":200,"headers":{"Content-Type":"application/json"},"body":{"ok":true}}]}
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/healthz') {
      return new Response(JSON.stringify({ ok: true, service: 'apirat-worker' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const config = readConfig(env);

    // Slack URL verification convenience
    if (url.pathname === '/slack/events' && request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await request.clone().json().catch(() => null);
        if (body?.type === 'url_verification' && body?.challenge) {
          return new Response(body.challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
        }
      }
    }

    const route = config.routes.find((r) => r.method === request.method && r.path === url.pathname);

    if (route) {
      return new Response(JSON.stringify(route.body ?? {}), {
        status: Number(route.status || 200),
        headers: route.headers || { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'No route matched',
        method: request.method,
        path: url.pathname,
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  },
};

function readConfig(env) {
  try {
    if (env.ROUTE_CONFIG) {
      const parsed = JSON.parse(env.ROUTE_CONFIG);
      if (Array.isArray(parsed.routes)) return parsed;
    }
  } catch {
    // ignore invalid config, fallback below
  }

  return {
    routes: [
      {
        method: 'POST',
        path: '/slack/events',
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { ok: true, source: 'default-route' },
      },
    ],
  };
}
