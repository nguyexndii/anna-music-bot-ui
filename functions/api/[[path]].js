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

  // Danh sách các backend endpoint theo thứ tự ưu tiên:
  // 1. IP VPS tĩnh trực tiếp (vĩnh viễn cố định, không sợ đổi URL)
  // 2. Cloudflare Tunnel đang hoạt động hiện tại (dự phòng)
  const deadTunnels = [
    'pockets-morrison-sells-nurse',
    'jvc-labs-farmer-gardens',
    'miniature-supplier-say-qualifying',
    'joseph-desperate-samples-router'
  ];

  const candidateEndpoints = [];
  if (context.env.API_BASE) {
    const custom = context.env.API_BASE.replace(/\/$/, '');
    if (!deadTunnels.some(dead => custom.includes(dead))) {
      candidateEndpoints.push(custom);
    }
  }

  // Ưu tiên IP tĩnh của VPS và Cloudflare Tunnel active
  candidateEndpoints.push('http://160.191.242.184:3000');
  candidateEndpoints.push('https://asking-grain-result-knew.trycloudflare.com');

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

  let lastError = null;
  let lastTargetUrl = '';

  for (const base of candidateEndpoints) {
    const cleanBase = base.replace(/\/$/, '');
    const targetUrl = `${cleanBase}${url.pathname}${url.search}`;
    lastTargetUrl = targetUrl;

    try {
      // Giới hạn timeout 6 giây cho mỗi endpoint để chuyển fallback nhanh chóng nếu endpoint không phản hồi
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(targetUrl, {
        method: context.request.method,
        headers: requestHeaders,
        body: body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Nếu tunnel trả về lỗi 530 / 502 (tunnel chết của Cloudflare), thử tiếp endpoint khác
      if ((response.status === 530 || response.status === 502) && candidateEndpoints.indexOf(base) < candidateEndpoints.length - 1) {
        continue;
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
      lastError = err;
      // Thử endpoint tiếp theo trong danh sách candidateEndpoints
    }
  }

  return new Response(JSON.stringify({
    success: false,
    error: `Không thể kết nối đến máy chủ bot: ${lastError ? lastError.message : 'Tất cả endpoint đều không phản hồi'}`,
    targetUrl: lastTargetUrl
  }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
