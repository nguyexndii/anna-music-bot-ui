export async function onRequest(context) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  const url = new URL(context.request.url);

  // Ưu tiên API_BASE từ biến môi trường Cloudflare Pages, fallback về tunnel đang chạy
  const apiBase = (context.env.API_BASE || 'https://these-roses-bingo-franchise.trycloudflare.com').replace(/\/$/, '');
  const targetUrl = `${apiBase}${url.pathname}${url.search}`;

  const requestHeaders = new Headers();
  for (const [key, value] of context.request.headers.entries()) {
    const k = key.toLowerCase();
    if (['host', 'connection', 'cf-ray', 'cf-connecting-ip', 'cf-visitor', 'cf-ipcountry'].includes(k)) continue;
    requestHeaders.set(key, value);
  }

  let body = undefined;
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    try {
      body = await context.request.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: context.request.method,
      headers: requestHeaders,
      body: body,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const resBody = await response.text();
    return new Response(resBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: `Không thể kết nối đến máy chủ bot: ${err.message}`,
      targetUrl
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
