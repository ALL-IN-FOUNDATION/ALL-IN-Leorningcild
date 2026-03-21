/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  #ALL-IN Leorningcild — Full Stack Worker (API + UI)        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const RPC_HTTP  = 'https://api.mainnet-beta.solana.com';
const RPC_WS    = 'wss://api.mainnet-beta.solana.com';
const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUP_SWAP  = 'https://quote-api.jup.ag/v6/swap';
const JUP_PRICE = 'https://api.jup.ag/price/v2';
const SOL_MINT  = 'So11111111111111111111111111111111111111112';

// ─── TEMPLATE FRONTEND ──────────────────────────────────────────
// COPY SEMUA ISI FILE copy-trading.html KAMU DAN PASTE DI ANTARA TANDA BACKTICK (`) DI BAWAH INI
const HTML_FRONTEND = `
<!DOCTYPE html>
<html>
<head>
    <title>#ALL-IN Copy Trade Dashboard</title>
    </head>
<body>
    <h1>Frontend Sedang Dimuat...</h1>
    <p>Pastikan kamu sudah memindahkan isi copy-trading.html ke sini.</p>
</body>
</html>
`;

// ─── CORS & Helper ──────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin'  : '*',
    'Access-Control-Allow-Methods' : 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers' : 'Content-Type, Authorization',
  };
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

// ════════════════════════════════════════════════════════════════
//  MAIN FETCH HANDLER
// ════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ── WebSocket Handler ──
    if (path === '/ws') {
      return handleWebSocket(request, env, ctx);
    }

    try {
      // 1. TAMPILKAN FRONTEND (Ubah rute utama agar memanggil HTML)
      if (path === '/' || path === '') {
        return new Response(HTML_FRONTEND, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // 2. API ENDPOINTS
      if (path === '/health')      return jsonResp({ ok: true });
      if (path === '/sol-price')   return handleSolPrice();
      if (path === '/price')        return handlePrice(url);
      if (path === '/quote')        return handleQuote(url);
      if (path === '/swap-tx')      return handleSwapTx(request);

      return jsonResp({ ok: false, error: "Not Found" }, 404);
    } catch (e) {
      return jsonResp({ ok: false, error: e.message }, 500);
    }
  }
};

// ════════════════════════════════════════════════════════════════
//  LOGIC HANDLERS (Sama seperti sebelumnya)
// ════════════════════════════════════════════════════════════════
async function handleWebSocket(request, env, ctx) {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();
  // ... (Logika WebSocket kamu tetap sama seperti kode sebelumnya)
  return new Response(null, { status: 101, webSocket: client });
}

async function handleSolPrice() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const d = await r.json();
    return jsonResp({ ok: true, price: d.solana.usd });
  } catch (e) { return jsonResp({ ok: false, price: 0 }); }
}

async function handlePrice(url) {
  const mints = url.searchParams.get('mints');
  const r = await fetch(`${JUP_PRICE}?ids=${mints}`);
  const d = await r.json();
  return jsonResp({ ok: true, data: d.data });
}

async function handleQuote(url) {
  const params = new URLSearchParams(url.search);
  const r = await fetch(`${JUP_QUOTE}?${params.toString()}`);
  const d = await r.json();
  return jsonResp({ ok: true, quote: d });
}

async function handleSwapTx(request) {
  const body = await request.json();
  const r = await fetch(JUP_SWAP, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
  const d = await r.json();
  return jsonResp({ ok: true, ...d });
}
