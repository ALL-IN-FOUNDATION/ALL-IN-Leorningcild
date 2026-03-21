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
 *
 * Deploy: wrangler deploy
 * Env vars needed (wrangler.toml or Cloudflare dashboard):
 *   ALLOWED_ORIGIN  = https://leorningcild.all-in-foundation-project.workers.dev/
 */

// ─── Solana RPC endpoints (public, no key needed) ───────────────
const RPC_HTTP  = 'https://api.mainnet-beta.solana.com';
const RPC_WS    = 'wss://api.mainnet-beta.solana.com';
// Backup RPCs
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
  const allowed = self.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin'  : allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
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

    // Preflight
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
      if (path === '/health')          return handleHealth(origin);
      if (path === '/price')           return handlePrice(url, origin);
      if (path === '/quote')           return handleQuote(url, origin);
      if (path === '/swap-tx')         return handleSwapTx(request, origin);
      if (path === '/wallet-txns')     return handleWalletTxns(url, origin);
      if (path === '/token-info')      return handleTokenInfo(url, origin);
      if (path === '/sol-price')       return handleSolPrice(origin);

      return errResp('Not found', 404, origin);
    } catch (e) {
      console.error('Worker error:', e);
      return errResp('Internal error: ' + e.message, 500, origin);
    }
  }
};

// ════════════════════════════════════════════════════════════════
//  WEBSOCKET HANDLER
//  Frontend connects here; worker bridges to Solana RPC WS
//  and forwards logsSubscribe events for target wallet
// ════════════════════════════════════════════════════════════════
async function handleWebSocket(request, env, ctx) {
  const { 0: client, 1: server } = new WebSocketPair();
  server.accept();

  // State per connection
  const state = {
    rpcWs       : null,
    subId       : null,
    targetWallet: null,
    alive       : true
  };

  // ── Connect to Solana RPC WebSocket ──
  function connectRpc() {
    try {
      const rpc = new WebSocket(RPC_WS);

      rpc.addEventListener('open', () => {
        console.log('RPC WS open');
        state.rpcWs = rpc;
        // If we already have a target, subscribe now
        if (state.targetWallet) {
          subscribeWallet(state.targetWallet);
        }
        server.send(JSON.stringify({ type: 'rpc_connected' }));
      });

      rpc.addEventListener('message', (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          // Subscription confirmation
          if (msg.id === 1 && msg.result !== undefined) {
            state.subId = msg.result;
            server.send(JSON.stringify({ type: 'subscribed', subId: state.subId }));
            return;
          }
          // Log notification — a new transaction from/to target wallet
          if (msg.method === 'logsNotification') {
            handleLogNotification(msg.params, server);
          }
        } catch (e) {}
      });

      rpc.addEventListener('close', () => {
        if (state.alive) {
          // Reconnect after 3s
          setTimeout(connectRpc, 3000);
          server.send(JSON.stringify({ type: 'rpc_reconnecting' }));
        }
      });

      rpc.addEventListener('error', (e) => {
        console.error('RPC WS error:', e);
      });

    } catch (e) {
      console.error('connectRpc error:', e);
    }
  }

  // ── Subscribe to wallet logs ──
  function subscribeWallet(wallet) {
    if (!state.rpcWs || state.rpcWs.readyState !== WebSocket.OPEN) return;
    const req = {
      jsonrpc : '2.0',
      id      : 1,
      method  : 'logsSubscribe',
      params  : [
        { mentions: [wallet] },
        { commitment: 'confirmed' }
      ]
    };
    state.rpcWs.send(JSON.stringify(req));
  }

  // ── Handle incoming log from RPC ──
  async function handleLogNotification(params, clientWs) {
    try {
      const result = params?.result;
      const value  = result?.value;
      if (!value) return;

      const sig    = value.signature;
      const logs   = value.logs || [];

      // Quick filter: look for swap-related logs
      const isSwap = logs.some(l =>
        l.includes('Instruction: Swap') ||
        l.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') ||
        l.includes('JUP') ||
        l.includes('swap') ||
        l.includes('Program log: Swap')
      );

      if (!isSwap) return;

      // Fetch full transaction details
      const txInfo = await fetchTxDetails(sig);
      if (!txInfo) return;

      // Parse swap: find token in/out
      const swapData = parseSwapFromTx(txInfo, state.targetWallet);
      if (!swapData) return;

      // Send to frontend
      clientWs.send(JSON.stringify({
        type      : 'swap_detected',
        signature : sig,
        wallet    : state.targetWallet,
        ...swapData
      }));

    } catch (e) {
      console.error('handleLogNotification error:', e);
    }
  }

  // ── Messages FROM frontend ──
  server.addEventListener('message', (evt) => {
    try {
      const msg = JSON.parse(evt.data);

      if (msg.type === 'watch') {
        // Start watching a wallet
        state.targetWallet = msg.wallet;
        if (state.rpcWs && state.rpcWs.readyState === WebSocket.OPEN) {
          // Unsubscribe old if exists
          if (state.subId !== null) {
            state.rpcWs.send(JSON.stringify({
              jsonrpc: '2.0', id: 2,
              method: 'logsUnsubscribe',
              params: [state.subId]
            }));
          }
          subscribeWallet(state.targetWallet);
        }
        server.send(JSON.stringify({ type: 'watching', wallet: msg.wallet }));
      }

      if (msg.type === 'unwatch') {
        if (state.rpcWs && state.subId !== null) {
          state.rpcWs.send(JSON.stringify({
            jsonrpc: '2.0', id: 2,
            method: 'logsUnsubscribe',
            params: [state.subId]
          }));
          state.subId = null;
          state.targetWallet = null;
        }
        server.send(JSON.stringify({ type: 'unwatched' }));
      }

      if (msg.type === 'ping') {
        server.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }

    } catch (e) {
      console.error('message parse error:', e);
    }
  });

  server.addEventListener('close', () => {
    state.alive = false;
    if (state.rpcWs) state.rpcWs.close();
  });

  // Start RPC connection
  connectRpc();

  return new Response(null, { status: 101, webSocket: client });
}

// ════════════════════════════════════════════════════════════════
//  FETCH TX DETAILS from RPC
// ════════════════════════════════════════════════════════════════
async function fetchTxDetails(sig) {
  const body = {
    jsonrpc : '2.0', id: 1,
    method  : 'getTransaction',
    params  : [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
  };
  for (const rpc of [RPC_HTTP, ...RPC_BACKUP]) {
    try {
      const r = await fetch(rpc, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(body),
        signal  : AbortSignal.timeout(8000)
      });
      const d = await r.json();
      if (d.result) return d.result;
    } catch (e) {}
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
//  PARSE SWAP from parsed transaction
//  Returns { action, tokenMint, tokenSymbol, amountIn, amountOut }
// ════════════════════════════════════════════════════════════════
function parseSwapFromTx(tx, wallet) {
  try {
    const meta    = tx.meta;
    const pre     = meta?.preTokenBalances  || [];
    const post    = meta?.postTokenBalances || [];
    const accKeys = tx.transaction?.message?.accountKeys || [];

    // Find wallet index in accountKeys
    const walletIdx = accKeys.findIndex(k => {
      const pk = typeof k === 'string' ? k : k?.pubkey;
      return pk === wallet;
    });
    if (walletIdx === -1) return null;

    // Detect SOL change
    const preSol  = meta?.preBalances?.[walletIdx]  || 0;
    const postSol = meta?.postBalances?.[walletIdx] || 0;
    const solDiff = (postSol - preSol) / 1e9; // lamports → SOL

    // Detect token balance changes for this wallet
    const tokenChanges = [];
    const allMints = new Set([
      ...pre.map(b => b.mint),
      ...post.map(b => b.mint)
    ]);

    for (const mint of allMints) {
      if (mint === SOL_MINT || mint === USDC_MINT) continue;
      const preB  = pre.find(b  => b.mint === mint && b.owner === wallet);
      const postB = post.find(b => b.mint === mint && b.owner === wallet);
      const preAmt  = preB  ? parseFloat(preB.uiTokenAmount.uiAmountString  || 0) : 0;
      const postAmt = postB ? parseFloat(postB.uiTokenAmount.uiAmountString || 0) : 0;
      const diff = postAmt - preAmt;
      if (Math.abs(diff) > 0) {
        tokenChanges.push({ mint, diff, decimals: postB?.uiTokenAmount?.decimals || preB?.uiTokenAmount?.decimals || 6 });
      }
    }

    if (!tokenChanges.length) return null;

    // Largest change = the swapped token
    tokenChanges.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    const main = tokenChanges[0];

    return {
      action    : main.diff > 0 ? 'buy' : 'sell',
      tokenMint : main.mint,
      amount    : Math.abs(main.diff),
      solChange : solDiff,
      allChanges: tokenChanges
    };
  } catch (e) {
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
//  /health
// ════════════════════════════════════════════════════════════════
async function handleHealth(origin) {
  return jsonResp({ ok: true, service: '#ALL-IN Leorningcild Copy Trade Worker', ts: Date.now() }, 200, origin);
}

// ════════════════════════════════════════════════════════════════
//  /sol-price  — fetch SOL/USD from CoinGecko
// ════════════════════════════════════════════════════════════════
async function handleSolPrice(origin) {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      signal: AbortSignal.timeout(6000)
    });
    const d = await r.json();
    const price = d?.solana?.usd || 0;
    return jsonResp({ ok: true, price }, 200, origin);
  } catch (e) {
    return jsonResp({ ok: false, price: 155 }, 200, origin); // fallback
  }
}

// ════════════════════════════════════════════════════════════════
//  /price?mints=MINT1,MINT2,...
//  Uses Jupiter Price API V2
// ════════════════════════════════════════════════════════════════
async function handlePrice(url, origin) {
  const mints = url.searchParams.get('mints');
  if (!mints) return errResp('mints param required', 400, origin);

  try {
    const r = await fetch(`${JUP_PRICE}?ids=${mints}`, {
      signal: AbortSignal.timeout(8000)
    });
    const d = await r.json();
    return jsonResp({ ok: true, data: d.data || {} }, 200, origin);
  } catch (e) {
    return errResp('Price fetch failed: ' + e.message, 500, origin);
  }
}

// ════════════════════════════════════════════════════════════════
//  /quote?inputMint=&outputMint=&amount=&slippage=
//  Get Jupiter swap quote
// ════════════════════════════════════════════════════════════════
async function handleQuote(url, origin) {
  const input    = url.searchParams.get('inputMint')  || SOL_MINT;
  const output   = url.searchParams.get('outputMint');
  const amount   = url.searchParams.get('amount');   // in lamports/base units
  const slippage = url.searchParams.get('slippage')  || '100'; // 1% = 100 bps

  if (!output) return errResp('outputMint required', 400, origin);
  if (!amount) return errResp('amount required', 400, origin);

  try {
    const params = new URLSearchParams({
      inputMint           : input,
      outputMint          : output,
      amount              : amount,
      slippageBps         : slippage,
      onlyDirectRoutes    : 'false',
      asLegacyTransaction : 'false'
    });
    const r = await fetch(`${JUP_QUOTE}?${params}`, {
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) {
      const err = await r.text();
      return errResp('Jupiter quote error: ' + err, r.status, origin);
    }
    const d = await r.json();
    return jsonResp({ ok: true, quote: d }, 200, origin);
  } catch (e) {
    return errResp('Quote failed: ' + e.message, 500, origin);
  }
}

// ════════════════════════════════════════════════════════════════
//  /swap-tx  POST { quoteResponse, userPublicKey, wrapUnwrapSOL }
//  Build swap transaction (to be signed by frontend Phantom)
// ════════════════════════════════════════════════════════════════
async function handleSwapTx(request, origin) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return errResp('Invalid JSON body', 400, origin);
  }

  const { quoteResponse, userPublicKey, wrapUnwrapSOL = true } = body;
  if (!quoteResponse)   return errResp('quoteResponse required', 400, origin);
  if (!userPublicKey)   return errResp('userPublicKey required', 400, origin);

  try {
    const r = await fetch(JUP_SWAP, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol          : wrapUnwrapSOL,
        useSharedAccounts         : true,
        prioritizationFeeLamports : 'auto',
        dynamicComputeUnitLimit   : true,
        skipUserAccountsRpcCalls  : false
      }),
      signal  : AbortSignal.timeout(15000)
    });

    if (!r.ok) {
      const err = await r.text();
      return errResp('Jupiter swap error: ' + err, r.status, origin);
    }
    const d = await r.json();
    // swapTransaction is a base64-encoded versioned transaction
    return jsonResp({ ok: true, swapTransaction: d.swapTransaction, lastValidBlockHeight: d.lastValidBlockHeight }, 200, origin);
  } catch (e) {
    return errResp('Swap TX build failed: ' + e.message, 500, origin);
  }
}

// ════════════════════════════════════════════════════════════════
//  /wallet-txns?wallet=ADDRESS&limit=20
//  Fetch recent transactions for a wallet (for initial scan)
// ════════════════════════════════════════════════════════════════
async function handleWalletTxns(url, origin) {
  const wallet = url.searchParams.get('wallet');
  const limit  = parseInt(url.searchParams.get('limit') || '20');
  if (!wallet) return errResp('wallet param required', 400, origin);

  try {
    const body = {
      jsonrpc : '2.0', id: 1,
      method  : 'getSignaturesForAddress',
      params  : [wallet, { limit, commitment: 'confirmed' }]
    };
    const r = await fetch(RPC_HTTP, {
      method  : 'POST',
      headers : { 'Content-Type': 'application/json' },
      body    : JSON.stringify(body),
      signal  : AbortSignal.timeout(8000)
    });
    const d = await r.json();
    return jsonResp({ ok: true, signatures: d.result || [] }, 200, origin);
  } catch (e) {
    return errResp('Wallet txns failed: ' + e.message, 500, origin);
  }
}

// ════════════════════════════════════════════════════════════════
//  /token-info?mint=MINT
//  Get token metadata via Jupiter token list
// ════════════════════════════════════════════════════════════════
async function handleTokenInfo(url, origin) {
  const mint = url.searchParams.get('mint');
  if (!mint) return errResp('mint param required', 400, origin);

  try {
    const r = await fetch(`https://tokens.jup.ag/token/${mint}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return jsonResp({ ok: true, symbol: mint.slice(0,6), name: 'Unknown', decimals: 6, mint }, 200, origin);
    const d = await r.json();
    return jsonResp({ ok: true, symbol: d.symbol, name: d.name, decimals: d.decimals, logoURI: d.logoURI, mint }, 200, origin);
  } catch (e) {
    return jsonResp({ ok: true, symbol: mint.slice(0,6), name: 'Unknown', decimals: 6, mint }, 200, origin);
  }
}
