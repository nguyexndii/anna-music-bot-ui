export async function onRequest(context) {
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

  const ACTIVE_VPS_TUNNEL = 'https://asking-grain-result-knew.trycloudflare.com';
  let rawEnvBase = (context.env.API_BASE || '').trim().replace(/\/$/, '');

  // Nếu biến môi trường là URL tunnel trycloudflare cũ đã chết hoặc không có, ưu tiên active tunnel đang chạy trên VPS
  let apiBase = rawEnvBase;
  if (!apiBase || apiBase.includes('pockets-morrison-sells-nurse') || (apiBase.includes('trycloudflare.com') && apiBase !== ACTIVE_VPS_TUNNEL)) {
    apiBase = ACTIVE_VPS_TUNNEL;
  }

  const pathname = url.pathname === '/api/health' ? '/health' : url.pathname;
  let targetUrl = `${apiBase}${pathname}${url.search}`;

  const requestHeaders = new Headers();
  for (const [key, value] of context.request.headers.entries()) {
    const k = key.toLowerCase();
    if (['host', 'connection', 'cf-ray', 'cf-visitor', 'cf-ipcountry'].includes(k)) continue;
    requestHeaders.set(key, value);
  }

  const realClientIp = context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for');
  if (realClientIp) {
    const cleanIp = realClientIp.split(',')[0].trim();
    requestHeaders.set('x-real-client-ip', cleanIp);
    requestHeaders.set('cf-connecting-ip', cleanIp);
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
    let response;
    try {
      response = await fetch(targetUrl, {
        method: context.request.method,
        headers: requestHeaders,
        body: body,
      });
    } catch (fetchErr) {
      // Tự động failover sang active VPS tunnel nếu URL chính gặp lỗi DNS / Timeout
      if (apiBase !== ACTIVE_VPS_TUNNEL) {
        targetUrl = `${ACTIVE_VPS_TUNNEL}${pathname}${url.search}`;
        response = await fetch(targetUrl, {
          method: context.request.method,
          headers: requestHeaders,
          body: body,
        });
      } else {
        throw fetchErr;
      }
    }

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
      error: 'Không thể kết nối đến máy chủ bot. Vui lòng thử lại sau giây lát!'
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
