/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  #ALL-IN Leorningcild — Copy Trade Worker                   ║
 * ║  Cloudflare Worker — handles:                               ║
 * ║    • WebSocket bridge (frontend ↔ Solana RPC)               ║
 * ║    • Wallet activity monitor (logsSubscribe)                ║
 * ║    • Jupiter V6 swap quote + transaction build              ║
 * ║    • Token price feed (Jupiter Price API)                   ║
 * ║    • CORS proxy for Solana RPC calls                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Solana RPC endpoints ───────────────────────────────────────
const RPC_HTTP  = 'https://api.mainnet-beta.solana.com';
const RPC_WS    = 'wss://api.mainnet-beta.solana.com';
const RPC_BACKUP = [
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.g.alchemy.com/v2/demo'
];

// ─── Jupiter API ─────────────────────────────────────────────────
const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote';
const JUP_SWAP  = 'https://quote-api.jup.ag/v6/swap';
const JUP_PRICE = 'https://api.jup.ag/price/v2';

// ─── Well-known token mints ───────────────────────────────────────
const SOL_MINT  = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ─── CORS headers ────────────────────────────────────────────────
function corsHeaders(origin) {
  const allowed = '*'; // Menggunakan wildcard sesuai preferensi pengembangan
  return {
    'Access-Control-Allow-Origin'  : allowed,
    'Access-Control-Allow-Methods' : 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers' : 'Content-Type, Authorization',
    'Access-Control-Max-Age'       : '86400',
  };
}

function jsonResp(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

function errResp(msg, status = 400, origin = '*') {
  return jsonResp({ ok: false, error: msg }, status, origin);
}

// ════════════════════════════════════════════════════════════════
//  MAIN FETCH HANDLER
// ════════════════════════════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const path   = url.pathname;

    // Preflight handling untuk CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ── WebSocket upgrade ──────────────────────────────────────
    if (path === '/ws') {
      const upgrade = request.headers.get('Upgrade');
      if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      return handleWebSocket(request, env, ctx);
    }

    // ── REST routes ────────────────────────────────────────────
    try {
      // PERBAIKAN: Menambahkan handler untuk rute utama (/)
      if (path === '/' || path === '') {
        return jsonResp({
          ok: true,
          project: "#ALL-IN Foundation",
          service: "Copy Trade Worker",
          status: "Active",
          endpoints: ["/health", "/sol-price", "/price", "/ws (WebSocket)"]
        }, 200, origin);
      }

      if (path === '/health')          return handleHealth(origin);
      if (path === '/price')           return handlePrice(url, origin);
      if (path === '/quote')           return handleQuote(url, origin);
      if (path === '/swap-tx')         return handleSwapTx(request, origin);
      if (path === '/wallet-txns')     return handleWalletTxns(url, origin);
      if (path === '/token-info')      return handleTokenInfo(url, origin);
      if (path === '/sol-price')       return handleSolPrice(origin);

      // Jika path tidak ditemukan
      return errResp(`Path ${path} not found`, 404, origin);
    } catch (e) {
      console.error('Worker error:', e);
      return errResp('Internal error: ' + e.message, 500, origin);
    }
  }
};

// ════════════════════════════════════════════════════════════════
//  WEBSOCKET HANDLER (Bridges to Solana RPC WS)
// ════════════════════════════════════════════════════════════════
async function handleWebSocket(request, env, ctx) {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();

  const state = {
    rpcWs       : null,
    subId       : null,
    targetWallet: null,
    alive       : true
  };

  function connectRpc() {
    try {
      const rpc = new WebSocket(RPC_WS);
      rpc.addEventListener('open', () => {
        state.rpcWs = rpc;
        if (state.targetWallet) subscribeWallet(state.targetWallet);
        server.send(JSON.stringify({ type: 'rpc_connected' }));
      });

      rpc.addEventListener('message', (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.id === 1 && msg.result !== undefined) {
            state.subId = msg.result;
            server.send(JSON.stringify({ type: 'subscribed', subId: state.subId }));
            return;
          }
          if (msg.method === 'logsNotification') {
            handleLogNotification(msg.params, server);
          }
        } catch (e) {}
      });

      rpc.addEventListener('close', () => {
        if (state.alive) setTimeout(connectRpc, 3000);
      });
    } catch (e) { console.error(e); }
  }

  function subscribeWallet(wallet) {
    if (!state.rpcWs || state.rpcWs.readyState !== WebSocket.OPEN) return;
    state.rpcWs.send(JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'logsSubscribe',
      params: [{ mentions: [wallet] }, { commitment: 'confirmed' }]
    }));
  }

  async function handleLogNotification(params, clientWs) {
    const value = params?.result?.value;
    if (!value) return;
    const sig = value.signature;
    const isSwap = (value.logs || []).some(l => l.includes('Swap') || l.includes('JUP'));
    if (!isSwap) return;

    const txInfo = await fetchTxDetails(sig);
    const swapData = parseSwapFromTx(txInfo, state.targetWallet);
    if (swapData) {
      clientWs.send(JSON.stringify({ type: 'swap_detected', signature: sig, ...swapData }));
    }
  }

  server.addEventListener('message', (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'watch') {
        state.targetWallet = msg.wallet;
        subscribeWallet(state.targetWallet);
        server.send(JSON.stringify({ type: 'watching', wallet: msg.wallet }));
      }
      if (msg.type === 'ping') server.send(JSON.stringify({ type: 'pong' }));
    } catch (e) {}
  });

  server.addEventListener('close', () => {
    state.alive = false;
    if (state.rpcWs) state.rpcWs.close();
  });

  connectRpc();
  return new Response(null, { status: 101, webSocket: client });
}

// ── Helper: Fetch Tx Details ──
async function fetchTxDetails(sig) {
  const body = { jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }] };
  for (const rpc of [RPC_HTTP, ...RPC_BACKUP]) {
    try {
      const r = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.result) return d.result;
    } catch (e) {}
  }
  return null;
}

// ── Helper: Parse Swap ──
function parseSwapFromTx(tx, wallet) {
  try {
    const meta = tx.meta;
    const accKeys = tx.transaction?.message?.accountKeys || [];
    const walletIdx = accKeys.findIndex(k => (typeof k === 'string' ? k : k?.pubkey) === wallet);
    if (walletIdx === -1) return null;

    const pre = meta?.preTokenBalances || [];
    const post = meta?.postTokenBalances || [];
    let mainChange = null;

    for (const mint of new Set([...pre.map(b => b.mint), ...post.map(b => b.mint)])) {
      if (mint === SOL_MINT || mint === USDC_MINT) continue;
      const preAmt = parseFloat(pre.find(b => b.mint === mint && b.owner === wallet)?.uiTokenAmount.uiAmountString || 0);
      const postAmt = parseFloat(post.find(b => b.mint === mint && b.owner === wallet)?.uiTokenAmount.uiAmountString || 0);
      const diff = postAmt - preAmt;
      if (Math.abs(diff) > 0) {
        mainChange = { tokenMint: mint, action: diff > 0 ? 'buy' : 'sell', amount: Math.abs(diff) };
        break;
      }
    }
    return mainChange;
  } catch (e) { return null; }
}

// ── Route Handlers ──
async function handleHealth(origin) {
  return jsonResp({ ok: true, ts: Date.now() }, 200, origin);
}

async function handleSolPrice(origin) {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const d = await r.json();
    return jsonResp({ ok: true, price: d.solana.usd }, 200, origin);
  } catch (e) { return jsonResp({ ok: false, price: 0 }, 200, origin); }
}

async function handlePrice(url, origin) {
  const mints = url.searchParams.get('mints');
  if (!mints) return errResp('mints required', 400, origin);
  const r = await fetch(`${JUP_PRICE}?ids=${mints}`);
  const d = await r.json();
  return jsonResp({ ok: true, data: d.data }, 200, origin);
}

async function handleQuote(url, origin) {
  const params = new URLSearchParams(url.search);
  const r = await fetch(`${JUP_QUOTE}?${params.toString()}`);
  const d = await r.json();
  return jsonResp({ ok: true, quote: d }, 200, origin);
}

async function handleSwapTx(request, origin) {
  const body = await request.json();
  const r = await fetch(JUP_SWAP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  return jsonResp({ ok: true, ...d }, 200, origin);
}

async function handleWalletTxns(url, origin) {
  const wallet = url.searchParams.get('wallet');
  const body = { jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [wallet, { limit: 10 }] };
  const r = await fetch(RPC_HTTP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  return jsonResp({ ok: true, signatures: d.result }, 200, origin);
}

async function handleTokenInfo(url, origin) {
  const mint = url.searchParams.get('mint');
  const r = await fetch(`https://tokens.jup.ag/token/${mint}`);
  const d = await r.json();
  return jsonResp({ ok: true, ...d }, 200, origin);
}
