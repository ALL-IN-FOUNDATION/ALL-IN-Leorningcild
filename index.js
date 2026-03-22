

const CFG = {
  RPC_HTTP  : 'https://api.mainnet-beta.solana.com',
  RPC_WS    : 'wss://api.mainnet-beta.solana.com',
  JUP_QUOTE : 'https://quote-api.jup.ag/v6/quote',
  JUP_SWAP  : 'https://quote-api.jup.ag/v6/swap',
  JUP_PRICE : 'https://api.jup.ag/price/v2',
  JUP_TOKEN : 'https://tokens.jup.ag/token/',
  SOL_MINT  : 'So11111111111111111111111111111111111111112',
  FEE_ACCT  : '',    // Fill in after registering at https://referral.jup.ag
  FEE_BPS   : 50,    // 0.5% platform fee
  ORIGINS   : [],    // Empty = allow all origins (dev). Set for production.
};

function cors(origin) {
  let ao = '*';
  if (CFG.ORIGINS.length && origin) {
    const ok = CFG.ORIGINS.includes(origin)
      || origin.startsWith('http://localhost')
      || origin.startsWith('http://127.0.0.1');
    ao = ok ? origin : CFG.ORIGINS[0];
  }
  return {
    'Access-Control-Allow-Origin' : ao,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Vary': 'Origin',
  };
}

const jR = (data, status = 200, origin = null) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });

async function safeJson(r) {
  try { return await r.json(); }
  catch (_) { throw new Error('Non-JSON response from upstream'); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// HTML served as static asset from /public/index.html via wrangler.toml assets config
// Worker only handles API routes



export default {
  async fetch(req, env, ctx) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const origin = req.headers.get('Origin') || null;

    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors(origin) });

    // WebSocket upgrade — pass ctx so ctx.waitUntil is available inside the handler
    if (path === '/ws') return handleWS(req, env, ctx);

    try {
      // Serve embedded HTML frontend
      // '/' is served by Cloudflare static assets (public/index.html via wrangler.toml)

      if (path === '/health')       return jR({ ok: true, v: '3.0' },           200, origin);
      if (path === '/sol-price')    return apiSolPrice(origin);
      if (path === '/price')        return apiPrice(url, origin);
      if (path === '/quote')        return apiQuote(url, origin);
      if (path === '/swap-tx')      return apiSwapTx(req, origin);
      if (path === '/token-info')   return apiTokenInfo(url, env, origin);
      if (path === '/priority-fee') return apiPriorityFee(origin);

      return jR({ ok: false, error: 'Not Found' }, 404, origin);
    } catch (e) {
      return jR({ ok: false, error: e.message }, 500, origin);
    }
  },
};

/**
 * Logika:
 *  1. Client kirim { type:"watch", wallet:"<addr>" }
 *  2. Worker buka logsSubscribe ke Solana RPC WebSocket
 *  3. Setiap logsNotification → parseTx → deteksi buy/sell token
 *  4. Kirim swap_detected ke client
 *
 * BUG FIX v2→v3:
 *  - ctx.waitUntil diteruskan dari fetch handler (bukan dari closure lokal)
 *  - Unwatch per-wallet, bukan unwatch_all
 *  - sigSeen Set mencegah double-parse signature yang sama
 *  - parseTx mendeteksi SELL (balance token turun) sekaligus BUY
 */
async function handleWS(req, env, ctx) {
  if (req.headers.get('Upgrade') !== 'websocket')
    return new Response('Expected WebSocket upgrade', { status: 426 });

  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();

  // Use Helius if HELIUS_KEY is available in env
  const rpcHttp  = env.HELIUS_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_KEY}`
    : CFG.RPC_HTTP;
  const rpcWsUrl = env.HELIUS_KEY
    ? `wss://mainnet.helius-rpc.com/?api-key=${env.HELIUS_KEY}`
    : CFG.RPC_WS;

  let rpcWs     = null;
  let alive     = true;
  let watchSet  = new Set();   // set of wallet addresses currently being watched
  let sigSeen   = new Set();   // deduplicate signatures
  let reconTimer = null;

  const send = obj => { try { server.send(JSON.stringify(obj)); } catch (_) {} };

  // Parse getTransaction, find tokens whose balance changed
  async function parseTx(sig, attempt = 0) {
    try {
      const r = await fetch(rpcHttp, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method : 'getTransaction',
          params : [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
      const d = await r.json();

      // Transaction not yet processed by validator — retry up to 5x
      if (!d.result) {
        if (attempt < 5) { await sleep(2500); return parseTx(sig, attempt + 1); }
        return [];
      }

      const tx   = d.result;
      const meta = tx.meta;
      if (!meta || meta.err) return [];

      // Map preTokenBalances by accountIndex
      const preMap = {};
      (meta.preTokenBalances || []).forEach(b => {
        preMap[b.accountIndex] = {
          amt : parseFloat(b.uiTokenAmount?.uiAmount || 0),
          mint: b.mint,
        };
      });

      const accts  = tx.transaction?.message?.accountKeys || [];
      const events = [];

      for (const wallet of watchSet) {
        // Calculate SOL spent by the target wallet
        let amountInSol = 0;
        accts.forEach((acct, i) => {
          const addr = typeof acct === 'string' ? acct : acct.pubkey;
          if (addr === wallet) {
            const pre  = (meta.preBalances[i]  || 0) / 1e9;
            const post = (meta.postBalances[i] || 0) / 1e9;
            if (pre > post) amountInSol = parseFloat((pre - post).toFixed(6));
          }
        });

        for (const post of (meta.postTokenBalances || [])) {
          if (post.owner !== wallet || post.mint === CFG.SOL_MINT) continue;
          const pre   = preMap[post.accountIndex]?.amt || 0;
          const after = parseFloat(post.uiTokenAmount?.uiAmount || 0);

          if (after > pre + 0.000001) {
            // Token balance increased = BUY
            events.push({ wallet, mint: post.mint, action: 'buy', amountInSol, sig });
          } else if (after < pre - 0.000001 && pre > 0) {
            // Token balance decreased = SELL
            const pct = Math.round(((pre - after) / pre) * 100);
            events.push({ wallet, mint: post.mint, action: 'sell', sellPct: pct, amountInSol: 0, sig });
          }
        }
      }
      return events;
    } catch (_) { return []; }
  }

  // Subscribe wallet to logsSubscribe
  function subscribeWallet(wallet) {
    if (!rpcWs || rpcWs.readyState !== WebSocket.OPEN) return;
    rpcWs.send(JSON.stringify({
      jsonrpc: '2.0', id: Date.now(),
      method : 'logsSubscribe',
      params : [{ mentions: [wallet] }, { commitment: 'confirmed' }],
    }));
  }

  // Connect to Solana RPC WebSocket
  function connectRpc() {
    if (!alive) return;
    try { rpcWs = new WebSocket(rpcWsUrl); }
    catch (_) {
      send({ type: 'rpc_reconnecting' });
      reconTimer = setTimeout(connectRpc, 5000);
      return;
    }

    rpcWs.addEventListener('open', () => {
      send({ type: 'rpc_connected' });
      for (const w of watchSet) subscribeWallet(w);
    });

    rpcWs.addEventListener('message', async evt => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch (_) { return; }

      // Subscription confirmation
      if (typeof msg.result === 'number' && msg.id) {
        send({ type: 'subscribed', subId: msg.result });
        return;
      }
      if (msg.method !== 'logsNotification') return;

      const val  = msg.params?.result?.value;
      if (!val) return;
      const sig  = val.signature;
      const logs = val.logs || [];

      // Dedup — skip already-processed signatures
      if (sigSeen.has(sig)) return;
      sigSeen.add(sig);
      if (sigSeen.size > 500) sigSeen.clear(); // prevent memory leak

      // Filter: only process logs that look like a swap or token transfer
      const isRelevant = logs.some(l =>
        l.includes('Program JUP') ||
        l.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') ||
        l.includes('swap') || l.includes('Swap') ||
        l.includes('Transfer')
      );
      if (!isRelevant) return;

      // ctx is passed from the main fetch handler via closure
      ctx.waitUntil((async () => {
        const events = await parseTx(sig);
        for (const ev of events) {
          send({
            type       : 'swap_detected',
            action     : ev.action,
            wallet     : ev.wallet,
            tokenMint  : ev.mint,
            amountInSol: ev.amountInSol,
            sellPct    : ev.sellPct || 100,
            signature  : sig,
          });
        }
      })());
    });

    rpcWs.addEventListener('close', () => {
      if (!alive) return;
      send({ type: 'rpc_reconnecting' });
      reconTimer = setTimeout(connectRpc, 4000);
    });
    rpcWs.addEventListener('error', () => {});
  }

  // Handle messages from the frontend client
  server.addEventListener('message', evt => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch (_) { return; }

    if (msg.type === 'ping') {
      try { server.send(JSON.stringify({ type: 'pong' })); } catch (_) {}
      return;
    }

    if (msg.type === 'watch' && msg.wallet) {
      const isNew = !watchSet.has(msg.wallet);
      watchSet.add(msg.wallet);
      send({ type: 'watching', wallet: msg.wallet, count: watchSet.size });
      if (isNew) {
        if (!rpcWs || rpcWs.readyState > WebSocket.OPEN) {
          clearTimeout(reconTimer);
          connectRpc();
        } else {
          subscribeWallet(msg.wallet);
        }
      }
    }

    // Unwatch per-wallet — only close RPC if no wallets remain
    if (msg.type === 'unwatch' && msg.wallet) {
      watchSet.delete(msg.wallet);
      send({ type: 'unwatched', wallet: msg.wallet, count: watchSet.size });
      if (watchSet.size === 0 && rpcWs) {
        try { rpcWs.close(); } catch (_) {}
      }
    }

    if (msg.type === 'unwatch_all') {
      watchSet.clear();
      if (rpcWs) { try { rpcWs.close(); } catch (_) {} }
      send({ type: 'unwatched_all' });
    }
  });

  server.addEventListener('close', () => {
    alive = false;
    clearTimeout(reconTimer);
    try { if (rpcWs) rpcWs.close(); } catch (_) {}
  });

  return new Response(null, { status: 101, webSocket: client });
}

async function apiSolPrice(orig) {
  // Fallback chain: Binance (faster) → CoinGecko
  try {
    const r = await fetch(
      'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
      { signal: AbortSignal.timeout(4000) }
    );
    if (r.ok) {
      const d = await r.json();
      return jR({ ok: true, price: parseFloat(d.price) }, 200, orig);
    }
  } catch (_) {}
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const d = await r.json();
      return jR({ ok: true, price: d.solana.usd }, 200, orig);
    }
  } catch (_) {}
  return jR({ ok: false, price: 0 }, 200, orig);
}

async function apiPrice(url, orig) {
  const mints = url.searchParams.get('mints');
  if (!mints) return jR({ ok: false, error: 'mints required' }, 400, orig);
  try {
    const r = await fetch(`${CFG.JUP_PRICE}?ids=${mints}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`JUP Price ${r.status}`);
    const d = await safeJson(r);
    return jR({ ok: true, data: d.data }, 200, orig);
  } catch (e) { return jR({ ok: false, error: e.message }, 500, orig); }
}

async function apiQuote(url, orig) {
  // Forward all params including slippageBps, platformFeeBps, feeAccount
  const params = new URLSearchParams(url.search);
  try {
    const r = await fetch(`${CFG.JUP_QUOTE}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(`Jupiter Quote ${r.status}`);
    const d = await safeJson(r);
    return jR({ ok: true, quote: d }, 200, orig);
  } catch (e) { return jR({ ok: false, error: e.message }, 500, orig); }
}

async function apiSwapTx(req, orig) {
  let body;
  try { body = await req.json(); }
  catch (_) { return jR({ ok: false, error: 'Invalid JSON body' }, 400, orig); }
  try {
    const r = await fetch(CFG.JUP_SWAP, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body),
      signal : AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`Jupiter Swap ${r.status}`);
    const d = await safeJson(r);
    return jR({ ok: true, ...d }, 200, orig);
  } catch (e) { return jR({ ok: false, error: e.message }, 500, orig); }
}

async function apiTokenInfo(url, env, orig) {
  const mint = url.searchParams.get('mint');
  if (!mint) return jR({ ok: false, error: 'mint required' }, 400, orig);

  // Check KV cache first
  if (env.TOKEN_CACHE) {
    try {
      const cached = await env.TOKEN_CACHE.get(mint, 'json');
      if (cached) return jR({ ok: true, ...cached }, 200, orig);
    } catch (_) {}
  }

  try {
    const r = await fetch(`${CFG.JUP_TOKEN}${mint}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`Token API ${r.status}`);
    const d    = await safeJson(r);
    const info = {
      symbol  : d.symbol   || mint.slice(0, 6),
      decimals: d.decimals ?? 6,
      mint,
      logoURI : d.logoURI  || null,
    };
    // Store in KV with 24h TTL
    if (env.TOKEN_CACHE) {
      try { await env.TOKEN_CACHE.put(mint, JSON.stringify(info), { expirationTtl: 86400 }); }
      catch (_) {}
    }
    return jR({ ok: true, ...info }, 200, orig);
  } catch (_) {
    return jR({ ok: false, symbol: mint.slice(0, 6), decimals: 6, mint, logoURI: null }, 200, orig);
  }
}

async function apiPriorityFee(orig) {
  try {
    const r = await fetch(CFG.RPC_HTTP, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method : 'getRecentPrioritizationFees',
        params : [],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) throw new Error(`RPC ${r.status}`);
    const d    = await safeJson(r);
    const fees = (d.result || [])
      .map(f => f.prioritizationFee)
      .filter(f => f > 0)
      .sort((a, b) => a - b);
    const p50  = fees.length ? fees[Math.floor(fees.length * 0.50)] : 1000;
    const p85  = fees.length ? fees[Math.floor(fees.length * 0.85)] : 5000;
    const p95  = fees.length ? fees[Math.floor(fees.length * 0.95)] : 20000;
    return jR({ ok: true, slow: Math.max(p50, 1000), fast: Math.max(p85, 5000), turbo: Math.max(p95, 20000) }, 200, orig);
  } catch (_) {
    return jR({ ok: true, slow: 1000, fast: 5000, turbo: 20000 }, 200, orig);
  }
}
