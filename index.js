/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  #ALL-IN Leorningcild — Cloudflare Worker v3.0                       ║
 * ═══════════════════════════════════════════════════════════════════════

// ─── CONFIG ──────────────────────────────────────────────────────────────
const CFG = {
  RPC_HTTP  : 'https://api.mainnet-beta.solana.com',
  RPC_WS    : 'wss://api.mainnet-beta.solana.com',
  JUP_QUOTE : 'https://quote-api.jup.ag/v6/quote',
  JUP_SWAP  : 'https://quote-api.jup.ag/v6/swap',
  JUP_PRICE : 'https://api.jup.ag/price/v2',
  JUP_TOKEN : 'https://tokens.jup.ag/token/',
  SOL_MINT  : 'So11111111111111111111111111111111111111112',
  FEE_ACCT  : '',    // Isi setelah daftar di https://referral.jup.ag
  FEE_BPS   : 50,    // 0.5% platform fee
  ORIGINS   : [],    // Kosong = izinkan semua (dev). Isi untuk produksi.
};

// ─── CORS ────────────────────────────────────────────────────────────────
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

// ─── MAIN FETCH HANDLER ──────────────────────────────────────────────────
export default {
  async fetch(req, env, ctx) {
    const url    = new URL(req.url);
    const path   = url.pathname;
    const origin = req.headers.get('Origin') || null;

    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors(origin) });

    // WebSocket upgrade — ctx diteruskan agar ctx.waitUntil bisa dipakai di dalam
    if (path === '/ws') return handleWS(req, env, ctx);

    try {
      // Serve embedded HTML frontend
      if (path === '/' || path === '') {
        return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>#ALL-IN Leorningcild — Copy Trading v3</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,700;1,400;1,700&family=Barlow+Condensed:wght@300;400;600;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<script src="https://unpkg.com/@solana/web3.js@1.91.8/lib/index.iife.min.js"></script>
<style>
:root{
  --void:#02040a;--deep:#060d14;
  --gold:#d4a853;--gold-bright:#f5c842;
  --red:#b31b1b;--red-glow:rgba(179,27,27,.4);
  --green:#1a5e2a;--green2:#27a045;
  --cream:#ede8dc;--dim:rgba(237,232,220,.45);--muted:rgba(237,232,220,.22);
  --teal:#63cab7;--phantom:#ab9ff2;
}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body{background:var(--void);color:var(--cream);font-family:'Barlow Condensed',sans-serif;overflow-x:hidden;min-height:100vh}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");opacity:.028;mix-blend-mode:overlay}
/* TICKER */
.ticker{position:fixed;top:0;left:0;right:0;z-index:600;height:28px;background:var(--red);overflow:hidden;display:flex;align-items:center;border-bottom:1px solid rgba(212,168,83,.2)}
.t-inner{display:flex;animation:tickrun 60s linear infinite;white-space:nowrap;flex-shrink:0}
.ti{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.08em;color:rgba(237,232,220,.85);padding:0 1.4rem;display:inline-flex;align-items:center;gap:.35rem}
.ti b{color:var(--gold-bright)}.tsep{color:rgba(212,168,83,.4)}
@keyframes tickrun{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
/* NAV */
nav{position:fixed;top:28px;left:0;right:0;z-index:599;display:flex;align-items:center;justify-content:space-between;padding:.65rem 1.5rem;background:rgba(2,4,10,.97);border-bottom:1px solid rgba(212,168,83,.1);backdrop-filter:blur(20px)}
.nav-logo{font-family:'Libre Baskerville',serif;font-style:italic;font-weight:700;font-size:1rem;letter-spacing:.04em;color:var(--gold);display:flex;align-items:center;gap:.45rem;text-decoration:none}
.nav-badge{font-family:'Barlow Condensed',sans-serif;font-style:normal;font-weight:700;font-size:.44rem;letter-spacing:.22em;text-transform:uppercase;padding:.16rem .52rem;border:1px solid rgba(212,168,83,.22);color:var(--gold);background:rgba(212,168,83,.05)}
.ph-btn{display:inline-flex;align-items:center;gap:.45rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;padding:.44rem .95rem;background:transparent;color:var(--cream);border:1px solid rgba(171,159,242,.35);cursor:pointer;transition:all .22s}
.ph-btn:hover{border-color:var(--phantom);background:rgba(171,159,242,.08)}.ph-btn.connected{border-color:rgba(61,220,106,.35);background:rgba(26,94,42,.1);color:#3ddc6a}.ph-btn.connecting{opacity:.55;cursor:wait;pointer-events:none}
/* STATUS BAR */
.worker-bar{background:rgba(6,13,20,.95);border-bottom:1px solid rgba(212,168,83,.05);padding:.25rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;position:fixed;top:calc(28px + 48px);left:0;right:0;z-index:598}
.wb-item{display:flex;align-items:center;gap:.32rem;font-family:'Share Tech Mono',monospace;font-size:.43rem;letter-spacing:.07em;color:rgba(237,232,220,.26)}
.dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}.dot-ok{background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite}.dot-err{background:#ff6b6b}.dot-wait{background:rgba(237,232,220,.22);animation:blink 1.2s ease-in-out infinite}
@keyframes pdot{0%,100%{box-shadow:0 0 0 0 rgba(61,220,106,.5)}60%{box-shadow:0 0 0 4px transparent}}@keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}
.fee-badge{font-family:'Share Tech Mono',monospace;font-size:.42rem;padding:.1rem .4rem;border:1px solid rgba(99,202,183,.18);color:var(--teal);background:rgba(99,202,183,.04);cursor:pointer;transition:all .18s}
.fee-badge:hover{border-color:rgba(99,202,183,.38)}.fee-badge.fast{border-color:rgba(212,168,83,.28);color:var(--gold-bright)}.fee-badge.turbo{border-color:rgba(255,107,107,.28);color:#ff6b6b}
/* PAGE HEADER */
.page-header{padding:calc(28px + 48px + 24px + 2rem) 1.5rem 1.4rem;max-width:1280px;margin:0 auto}
.eyebrow{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}.eyebrow-line{width:22px;height:1px;background:var(--teal)}.eyebrow-txt{font-size:.48rem;font-weight:700;letter-spacing:.32em;color:var(--teal);text-transform:uppercase}
.page-title{font-family:'Libre Baskerville',serif;font-weight:700;font-style:italic;font-size:clamp(1.8rem,6vw,3rem);color:var(--cream);line-height:.92;margin-bottom:.5rem}.page-title span{color:var(--gold)}
.page-desc{font-size:.64rem;font-weight:300;letter-spacing:.04em;line-height:1.9;color:var(--dim);max-width:520px}
.wallet-notice{margin-top:.9rem;display:inline-flex;align-items:center;gap:.52rem;padding:.44rem .82rem;border:1px dashed rgba(171,159,242,.22);background:rgba(171,159,242,.04);font-size:.52rem;font-weight:600;letter-spacing:.12em;color:rgba(171,159,242,.6);text-transform:uppercase}
.mob-banner{display:none;padding:.52rem 1rem;border:1px solid rgba(171,159,242,.2);background:rgba(171,159,242,.05);font-size:.56rem;font-weight:600;letter-spacing:.06em;color:rgba(171,159,242,.8);line-height:2;margin-bottom:.9rem}.mob-banner a{color:var(--phantom);text-decoration:none}
/* LAYOUT */
.app-wrap{max-width:1280px;margin:0 auto;padding:0 1.5rem 4rem;display:grid;grid-template-columns:1fr;gap:1.4rem}
@media(min-width:900px){.app-wrap{grid-template-columns:370px 1fr}}
/* PANEL */
.panel{border:1px solid rgba(212,168,83,.1);background:rgba(6,13,20,.85);position:relative;overflow:hidden}.panel::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.6}
.c{position:absolute;width:8px;height:8px;border-color:rgba(212,168,83,.2);border-style:solid}.c.tl{top:0;left:0;border-width:1px 0 0 1px}.c.tr{top:0;right:0;border-width:1px 1px 0 0}.c.bl{bottom:0;left:0;border-width:0 0 1px 1px}.c.br{bottom:0;right:0;border-width:0 1px 1px 0}
.panel-head{padding:.8rem 1rem;border-bottom:1px solid rgba(212,168,83,.06);display:flex;align-items:center;justify-content:space-between;background:rgba(212,168,83,.012)}
.panel-title{font-size:.54rem;font-weight:700;letter-spacing:.24em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;gap:.42rem}
.panel-count{font-family:'Share Tech Mono',monospace;font-size:.48rem;padding:.1rem .44rem;border:1px solid rgba(212,168,83,.14);color:var(--gold);background:rgba(212,168,83,.03)}
/* WALLET BAR */
.wbar{border:1px solid rgba(212,168,83,.08);background:rgba(2,4,10,.75);padding:.68rem 1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1.2rem;position:relative}.wbar::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,83,.14),transparent)}
.wbar-info{flex:1;min-width:0}.wbar-addr{font-family:'Share Tech Mono',monospace;font-size:.56rem;color:var(--cream);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wbar-addr.dim{color:rgba(237,232,220,.24)}
.wbar-net{font-family:'Share Tech Mono',monospace;font-size:.4rem;color:rgba(237,232,220,.18);margin-top:.06rem}
.wbar-bal{font-family:'Share Tech Mono',monospace;font-size:.6rem;color:var(--gold-bright);white-space:nowrap}
.wbar-btn{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.62rem;letter-spacing:.13em;text-transform:uppercase;padding:.42rem .9rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.13);cursor:pointer;transition:all .22s;flex-shrink:0}.wbar-btn:hover{box-shadow:0 0 14px var(--red-glow)}
/* FORM */
.pform{padding:.88rem 1rem;border-bottom:1px solid rgba(212,168,83,.05)}
.pform-title{font-size:.48rem;font-weight:700;letter-spacing:.21em;color:var(--teal);text-transform:uppercase;margin-bottom:.78rem;display:flex;align-items:center;gap:.42rem}.pform-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(99,202,183,.14),transparent)}
.flabel{font-size:.45rem;font-weight:700;letter-spacing:.16em;color:var(--gold);text-transform:uppercase;display:block;margin-bottom:.25rem;opacity:.78}
.frow{margin-bottom:.62rem}
.finput{width:100%;font-family:'Share Tech Mono',monospace;font-size:.6rem;padding:.46rem .7rem;background:rgba(2,4,10,.88);color:var(--cream);border:1px solid rgba(212,168,83,.13);outline:none;transition:border-color .18s,box-shadow .18s;letter-spacing:.03em}.finput::placeholder{color:rgba(237,232,220,.15)}.finput:focus{border-color:rgba(212,168,83,.35);box-shadow:0 0 0 2px rgba(212,168,83,.05)}.finput:disabled{opacity:.27;cursor:not-allowed}
.tg-wrap{display:flex;gap:.24rem;margin-bottom:.33rem}.tg{flex:1;font-family:'Barlow Condensed',sans-serif;font-size:.54rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.37rem .33rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.09);cursor:pointer;transition:all .18s;text-align:center}.tg:hover{color:var(--cream)}.tg.on{background:rgba(212,168,83,.09);color:var(--gold-bright);border-color:rgba(212,168,83,.35)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:.38rem;margin-bottom:.62rem}.row2>.frow{margin-bottom:0}
.cl-rel{position:relative}.cl-unit{position:absolute;right:.58rem;top:50%;transform:translateY(-50%);font-family:'Share Tech Mono',monospace;font-size:.48rem;color:rgba(212,168,83,.38);pointer-events:none}
.toggle-btn{font-family:'Barlow Condensed',sans-serif;font-size:.52rem;font-weight:700;letter-spacing:.09em;padding:.36rem .62rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.09);cursor:pointer;transition:all .18s;white-space:nowrap;text-transform:uppercase;margin-top:.24rem;width:100%}.toggle-btn:hover{color:var(--cream)}.toggle-btn.on{background:rgba(212,168,83,.07);color:var(--gold);border-color:rgba(212,168,83,.25)}.toggle-btn.on-green{background:rgba(26,94,42,.1);color:#3ddc6a;border-color:rgba(26,94,42,.2)}
.alloc-box{padding:.5rem .7rem;background:rgba(2,4,10,.65);border:1px solid rgba(212,168,83,.07);margin-bottom:.62rem;display:none;align-items:center;gap:.5rem;font-family:'Share Tech Mono',monospace;font-size:.52rem}.alloc-arrow{color:rgba(212,168,83,.36)}.alloc-val{color:var(--gold-bright);font-size:.64rem}.alloc-sub{color:var(--muted);font-size:.44rem;margin-left:auto}
.slip-btns{display:flex;gap:.16rem;flex-wrap:wrap;margin-bottom:.62rem}.slip-btn{font-family:'Share Tech Mono',monospace;font-size:.5rem;padding:.27rem .5rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.09);cursor:pointer;transition:all .18s}.slip-btn.on{background:rgba(212,168,83,.09);color:var(--gold-bright);border-color:rgba(212,168,83,.35)}
.bl-tag{font-family:'Share Tech Mono',monospace;font-size:.46rem;padding:.18rem .46rem;background:rgba(179,27,27,.09);color:#ff6b6b;border:1px solid rgba(179,27,27,.18);display:inline-flex;align-items:center;gap:.28rem;margin:.1rem}.bl-tag button{background:transparent;border:none;color:rgba(255,107,107,.55);cursor:pointer;font-size:.7rem;line-height:1;padding:0}.bl-tag button:hover{color:#ff6b6b}
.factions{display:flex;gap:.38rem;margin-top:.78rem}.btn-save{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;padding:.58rem .82rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.13);cursor:pointer;transition:all .22s}.btn-save:hover{box-shadow:0 0 16px var(--red-glow)}.btn-cancel{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;padding:.58rem .82rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.08);cursor:pointer;transition:all .18s}.btn-cancel:hover{color:var(--cream)}
/* PRESET LIST */
.plist{max-height:520px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(212,168,83,.12) transparent}.plist::-webkit-scrollbar{width:3px}.plist::-webkit-scrollbar-thumb{background:rgba(212,168,83,.12)}
.pitem{padding:.7rem 1rem;border-bottom:1px solid rgba(212,168,83,.04);transition:background .18s;position:relative;display:flex;flex-direction:column;gap:.28rem}.pitem:last-child{border-bottom:none}.pitem:hover{background:rgba(212,168,83,.015)}.pitem.running{background:rgba(26,94,42,.03)}.pitem.running::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--green2);opacity:.7}
.pi-r1{display:flex;align-items:center;gap:.5rem}.pi-name{font-size:.64rem;font-weight:700;letter-spacing:.09em;color:var(--cream);text-transform:uppercase;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pi-st{font-size:.41rem;font-weight:700;letter-spacing:.13em;padding:.13rem .44rem;border-radius:2px;text-transform:uppercase;white-space:nowrap}.pi-st.idle{color:rgba(237,232,220,.24);border:1px solid rgba(212,168,83,.06)}.pi-st.running{color:#3ddc6a;background:rgba(26,94,42,.13);border:1px solid rgba(26,94,42,.2);animation:rblink 2s ease-in-out infinite}.pi-st.stopped{color:#ff6b6b;background:rgba(179,27,27,.08);border:1px solid rgba(179,27,27,.16)}
@keyframes rblink{0%,100%{opacity:1}50%{opacity:.45}}
.pi-r2{display:flex;gap:.62rem;flex-wrap:wrap}.pi-m{font-family:'Share Tech Mono',monospace;font-size:.43rem;color:var(--muted)}.pi-m b{color:rgba(212,168,83,.58)}.pi-m.g{color:rgba(61,220,106,.6)}.pi-m.t{color:rgba(99,202,183,.6)}.pi-m.gold{color:rgba(212,168,83,.7)}
.pi-wallet{font-family:'Share Tech Mono',monospace;font-size:.41rem;color:rgba(237,232,220,.15)}
.pi-acts{display:flex;gap:.24rem;margin-top:.15rem;flex-wrap:wrap}
.btn-run{font-family:'Barlow Condensed',sans-serif;font-size:.54rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.28rem .68rem;background:rgba(26,94,42,.12);color:#3ddc6a;border:1px solid rgba(26,94,42,.18);cursor:pointer;transition:all .18s}.btn-run:hover{background:rgba(26,94,42,.24)}.btn-run:disabled{opacity:.26;cursor:not-allowed}
.btn-stop{font-family:'Barlow Condensed',sans-serif;font-size:.54rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.28rem .68rem;background:rgba(179,27,27,.08);color:#ff6b6b;border:1px solid rgba(179,27,27,.16);cursor:pointer;transition:all .18s}.btn-stop:hover{background:rgba(179,27,27,.18)}
.btn-edit{font-family:'Barlow Condensed',sans-serif;font-size:.52rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.28rem .54rem;background:rgba(99,202,183,.05);color:var(--teal);border:1px solid rgba(99,202,183,.14);cursor:pointer;transition:all .18s}.btn-edit:hover{background:rgba(99,202,183,.11)}
.btn-del{font-family:'Share Tech Mono',monospace;font-size:.54rem;padding:.28rem .44rem;background:transparent;color:rgba(237,232,220,.14);border:1px solid rgba(212,168,83,.05);cursor:pointer;transition:all .18s;margin-left:auto}.btn-del:hover{color:#ff6b6b}
.pempty{padding:2.2rem 1rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.48rem;letter-spacing:.1em;color:var(--muted);line-height:2.2}
/* RIGHT COL */
.right-col{display:flex;flex-direction:column;gap:1.4rem}
.pnl-sum{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(212,168,83,.05);border:1px solid rgba(212,168,83,.06)}@media(min-width:580px){.pnl-sum{grid-template-columns:repeat(4,1fr)}}
.pnl-cell{background:var(--deep);padding:.88rem .78rem;text-align:center}.pnl-lbl{font-size:.41rem;font-weight:700;letter-spacing:.19em;color:var(--muted);text-transform:uppercase;margin-bottom:.26rem}.pnl-num{font-family:'Share Tech Mono',monospace;font-size:clamp(.82rem,2.8vw,1.18rem);color:var(--cream);display:block}.pnl-num.pos{color:#3ddc6a}.pnl-num.neg{color:#ff6b6b}.pnl-num.gold{color:var(--gold-bright)}
/* TABS */
.tabs{display:flex;border-bottom:1px solid rgba(212,168,83,.06);background:rgba(212,168,83,.01)}.tab{font-family:'Barlow Condensed',sans-serif;font-size:.54rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;padding:.58rem .95rem;background:transparent;color:var(--muted);border:none;border-bottom:2px solid transparent;cursor:pointer;transition:all .18s}.tab:hover{color:var(--cream)}.tab.on{color:var(--gold);border-bottom-color:var(--gold)}
.tab-panel{display:none}.tab-panel.on{display:block}
/* TRADE TABLE */
.tbl-wrap{overflow-x:auto}
.tbl-hdr,.tbl-row{display:grid;grid-template-columns:1.2fr 74px 74px 74px 88px 72px 98px;gap:.18rem;padding:.46rem .88rem;min-width:570px}
.hist-hdr,.hist-row{display:grid;grid-template-columns:1.2fr 74px 74px 74px 88px 100px;gap:.18rem;padding:.46rem .88rem;min-width:520px}
.tbl-hdr,.hist-hdr{border-bottom:1px solid rgba(212,168,83,.06);background:rgba(212,168,83,.02)}.tbl-hdr span,.hist-hdr span{font-size:.38rem;font-weight:700;letter-spacing:.14em;color:var(--gold);opacity:.58;text-transform:uppercase}
.tbl-row,.hist-row{border-bottom:1px solid rgba(212,168,83,.03);align-items:center;transition:background .16s;animation:fadein .3s ease both}.tbl-row:last-child,.hist-row:last-child{border-bottom:none}.tbl-row:hover,.hist-row:hover{background:rgba(212,168,83,.015)}
@keyframes fadein{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}
.tr-tick{font-size:.64rem;font-weight:700;letter-spacing:.08em;color:var(--cream)}.tr-preset{font-size:.4rem;letter-spacing:.07em;color:var(--muted);margin-top:.06rem}.tr-age{font-family:'Share Tech Mono',monospace;font-size:.38rem;color:rgba(237,232,220,.17)}
.tr-price{font-family:'Share Tech Mono',monospace;font-size:.58rem;color:var(--dim)}.tr-usd{font-family:'Share Tech Mono',monospace;font-size:.66rem;color:var(--gold-bright)}
.pv{font-family:'Share Tech Mono',monospace;font-size:.68rem;font-weight:600}.pv.pos{color:#3ddc6a}.pv.neg{color:#ff6b6b}.pv.zero{color:rgba(237,232,220,.25)}
.btn-sell{font-family:'Barlow Condensed',sans-serif;font-size:.52rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .5rem;background:rgba(179,27,27,.08);color:#ff6b6b;border:1px solid rgba(179,27,27,.15);cursor:pointer;transition:all .18s;white-space:nowrap}.btn-sell:hover{background:rgba(179,27,27,.18)}.btn-sell.pending{opacity:.42;cursor:wait;pointer-events:none}
.tbl-empty{padding:2.2rem 1rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.48rem;letter-spacing:.1em;color:var(--muted);line-height:2.2}
.tx-link{font-family:'Share Tech Mono',monospace;font-size:.38rem;color:rgba(212,168,83,.36);text-decoration:none;display:inline-block;margin-top:.07rem}.tx-link:hover{color:var(--gold)}
.dca-dot{width:4px;height:4px;border-radius:50%;background:var(--teal);display:inline-block;margin-right:.18rem;animation:pdot 1.8s ease-in-out infinite}
.trail-dot{width:4px;height:4px;border-radius:50%;background:var(--gold);display:inline-block;margin-right:.18rem;animation:pdot 2s ease-in-out infinite}
/* LOG */
.log-wrap{max-height:200px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(212,168,83,.08) transparent}.log-wrap::-webkit-scrollbar{width:3px}.log-wrap::-webkit-scrollbar-thumb{background:rgba(212,168,83,.08)}
.lrow{padding:.42rem .88rem;border-bottom:1px solid rgba(212,168,83,.02);display:grid;grid-template-columns:54px 1fr auto;gap:.4rem;align-items:center;font-size:.44rem;letter-spacing:.04em;animation:fadein .25s ease both}.lrow:last-child{border-bottom:none}.ltime{font-family:'Share Tech Mono',monospace;color:rgba(237,232,220,.15)}.lmsg{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbadge{font-family:'Barlow Condensed',sans-serif;font-size:.48rem;font-weight:700;letter-spacing:.06em;padding:.08rem .33rem;border-radius:2px;white-space:nowrap}.lb-buy{background:rgba(26,94,42,.16);color:#3ddc6a;border:1px solid rgba(26,94,42,.26)}.lb-sell{background:rgba(179,27,27,.16);color:#ff6b6b;border:1px solid rgba(179,27,27,.26)}.lb-info{background:rgba(212,168,83,.07);color:var(--gold);border:1px solid rgba(212,168,83,.13)}.lb-warn{background:rgba(179,27,27,.07);color:rgba(237,232,220,.4);border:1px solid rgba(179,27,27,.09)}.lb-dca{background:rgba(99,202,183,.09);color:var(--teal);border:1px solid rgba(99,202,183,.19)}
.log-empty{padding:1.2rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.44rem;letter-spacing:.1em;color:var(--muted)}
/* MODALS */
.overlay{display:none;position:fixed;inset:0;z-index:800;background:rgba(2,4,10,.92);backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:1.2rem}.overlay.show{display:flex}
.modal{width:100%;max-width:440px;border:1px solid rgba(212,168,83,.15);background:var(--deep);position:relative;overflow:hidden;animation:mshow .25s cubic-bezier(.16,1,.3,1) both}.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
@keyframes mshow{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:none}}
.mhead{padding:.82rem 1rem;border-bottom:1px solid rgba(212,168,83,.06);display:flex;align-items:center;justify-content:space-between}.mtitle{font-size:.58rem;font-weight:700;letter-spacing:.22em;color:var(--gold);text-transform:uppercase}.mclose{background:transparent;border:none;color:rgba(237,232,220,.25);cursor:pointer;font-size:1rem;line-height:1;padding:.15rem .35rem;transition:color .18s}.mclose:hover{color:var(--cream)}
.mbody{padding:.95rem}.micon{text-align:center;margin-bottom:.82rem;font-size:2rem}.mtext{font-size:.58rem;font-weight:300;letter-spacing:.04em;color:var(--dim);line-height:1.9;text-align:center;margin-bottom:.82rem}.mdetail{padding:.58rem;background:rgba(212,168,83,.03);border:1px solid rgba(212,168,83,.09);font-family:'Share Tech Mono',monospace;font-size:.5rem;color:rgba(237,232,220,.5);margin-bottom:.82rem;text-align:center;word-break:break-all}
.mbtns{display:flex;gap:.4rem}.mbtn-p{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;padding:.6rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.13);cursor:pointer;transition:all .22s}.mbtn-p:hover{box-shadow:0 0 14px var(--red-glow)}.mbtn-p:disabled{opacity:.36;cursor:wait}.mbtn-s{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;padding:.6rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.08);cursor:pointer;transition:all .18s}.mbtn-s:hover{color:var(--cream)}
.ph-mbody{padding:1.1rem;text-align:center}.ph-opts{display:flex;flex-direction:column;gap:.33rem;margin-top:.78rem}.ph-opt{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.66rem;letter-spacing:.13em;text-transform:uppercase;padding:.62rem 1rem;border:1px solid rgba(171,159,242,.18);background:rgba(171,159,242,.04);color:rgba(171,159,242,.84);cursor:pointer;transition:all .22s;display:flex;align-items:center;justify-content:center;gap:.5rem;text-decoration:none;width:100%}.ph-opt:hover{background:rgba(171,159,242,.1);border-color:rgba(171,159,242,.4)}.ph-opt.primary{background:var(--phantom);border-color:var(--phantom);color:#fff}
.ph-div{display:flex;align-items:center;gap:.5rem;color:rgba(237,232,220,.15);font-size:.42rem;letter-spacing:.13em;margin:.04rem 0}.ph-div::before,.ph-div::after{content:'';flex:1;height:1px;background:rgba(212,168,83,.06)}.ph-note{font-family:'Share Tech Mono',monospace;font-size:.4rem;color:rgba(237,232,220,.14);margin-top:.82rem;line-height:1.9}
/* TOASTS */
.toasts{position:fixed;bottom:1.2rem;right:1.2rem;z-index:900;display:flex;flex-direction:column;gap:.38rem;pointer-events:none}.toast{font-family:'Share Tech Mono',monospace;font-size:.52rem;letter-spacing:.07em;padding:.5rem .85rem;border-left:2px solid;background:rgba(6,13,20,.98);backdrop-filter:blur(10px);display:flex;align-items:center;gap:.4rem;min-width:185px;max-width:310px;animation:tin .25s ease both;pointer-events:auto}.toast.ok{border-color:#3ddc6a;color:#3ddc6a}.toast.err{border-color:#ff6b6b;color:#ff6b6b}.toast.inf{border-color:var(--gold);color:var(--gold)}.toast.dca{border-color:var(--teal);color:var(--teal)}.toast.out{animation:tout .25s ease forwards}
@keyframes tin{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}@keyframes tout{from{opacity:1}to{opacity:0;transform:translateX(12px)}}
footer{border-top:1px solid rgba(212,168,83,.05);padding:.82rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.38rem;background:rgba(2,4,10,.5)}.footer-brand{font-family:'Libre Baskerville',serif;font-style:italic;font-size:.6rem;color:rgba(212,168,83,.36);letter-spacing:.06em}.footer-copy{font-family:'Share Tech Mono',monospace;font-size:.36rem;letter-spacing:.1em;color:rgba(237,232,220,.11)}
/* MISC */
.gdot{width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0}.gdot.green{background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite}.gdot.red{background:#d42020;animation:rdot 1.8s ease-in-out infinite}
.wdot{width:6px;height:6px;border-radius:50%;background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite;flex-shrink:0;display:inline-block}
@keyframes rdot{0%,100%{box-shadow:0 0 0 0 rgba(179,27,27,.6)}60%{box-shadow:0 0 0 4px transparent}}
.spin{display:inline-block;animation:spinit 1s linear infinite}@keyframes spinit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.lock{position:absolute;inset:0;z-index:10;background:rgba(2,4,10,.62);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.65rem;text-align:center;padding:1.2rem}.lock-icon{font-size:1.5rem;opacity:.27}.lock-txt{font-size:.52rem;font-weight:600;letter-spacing:.14em;color:rgba(212,168,83,.4);text-transform:uppercase;line-height:1.9}
.export-btn{font-family:'Share Tech Mono',monospace;font-size:.4rem;letter-spacing:.07em;color:rgba(237,232,220,.18);background:transparent;border:none;cursor:pointer;transition:color .18s;padding:.1rem .2rem}.export-btn:hover{color:var(--gold)}
</style>
</head>
<body>

<div class="ticker"><div class="t-inner">
  <span class="ti"><span class="tsep">♦</span><b>#ALL-IN</b> LEORNINGCILD v3</span>
  <span class="ti"><span class="tsep">♦</span> SOLANA MAINNET</span>
  <span class="ti"><span class="tsep">♦</span> LOGS SUBSCRIBE</span>
  <span class="ti"><span class="tsep">♦</span> TRAILING STOP</span>
  <span class="ti"><span class="tsep">♦</span> DCA MODE</span>
  <span class="ti"><span class="tsep">♦</span> COPY SELL</span>
  <span class="ti"><span class="tsep">♦</span> PRIORITY FEE</span>
  <span class="ti"><span class="tsep">♦</span> TOKEN BLACKLIST</span>
  <span class="ti"><span class="tsep">♦</span> PnL HISTORY + CSV</span>
  <span class="ti"><span class="tsep">♦</span> #ALL-IN FOUNDATION</span>
  <span class="ti"><span class="tsep">♦</span><b>#ALL-IN</b> LEORNINGCILD v3</span>
  <span class="ti"><span class="tsep">♦</span> SOLANA MAINNET</span>
  <span class="ti"><span class="tsep">♦</span> LOGS SUBSCRIBE</span>
  <span class="ti"><span class="tsep">♦</span> TRAILING STOP</span>
  <span class="ti"><span class="tsep">♦</span> DCA MODE</span>
  <span class="ti"><span class="tsep">♦</span> COPY SELL</span>
  <span class="ti"><span class="tsep">♦</span> PRIORITY FEE</span>
  <span class="ti"><span class="tsep">♦</span> TOKEN BLACKLIST</span>
  <span class="ti"><span class="tsep">♦</span> PnL HISTORY + CSV</span>
  <span class="ti"><span class="tsep">♦</span> #ALL-IN FOUNDATION</span>
</div></div>

<nav>
  <a href="#" class="nav-logo">#ALL-IN <span class="nav-badge">Leorningcild</span></a>
  <button class="ph-btn" id="navBtn" onclick="walletClick()"><span id="navLabel">Connect Wallet</span></button>
</nav>

<div class="worker-bar">
  <div class="wb-item"><div class="dot dot-wait" id="wsDot"></div><span id="wsStatus">Worker: connecting...</span></div>
  <div class="wb-item"><div class="dot dot-wait" id="monDot"></div><span id="monStatus">Monitor: idle</span></div>
  <div class="wb-item"><span id="solPriceBar" style="color:rgba(212,168,83,.5)">SOL: —</span></div>
  <div class="wb-item" style="margin-left:auto;gap:.45rem">
    <button class="fee-badge" id="feeBtn" onclick="cycleFee()" title="Click to change priority fee">⚡ AUTO</button>
    <span id="feeEst" style="font-family:'Share Tech Mono',monospace;font-size:.4rem;color:rgba(237,232,220,.17)"></span>
  </div>
</div>

<div class="page-header">
  <div class="eyebrow"><div class="eyebrow-line"></div><div class="eyebrow-txt">Copy Trading Module — v3</div></div>
  <h1 class="page-title"><span>#ALL-IN</span> Leorningcild</h1>
  <p class="page-desc">Solana copy trading v3 — logsSubscribe + getTransaction parse, trailing stop, DCA mode, copy sell, priority fee, token blacklist, PnL history, CSV export.</p>
  <div class="wallet-notice" id="walletNotice">Connect Phantom Wallet to activate copy trading</div>
</div>

<div style="max-width:1280px;margin:0 auto;padding:0 1.5rem">
  <div class="mob-banner" id="mobBanner"></div>
</div>

<div class="app-wrap">
  <!-- LEFT: Presets -->
  <div>
    <div class="wbar">
      <div class="wbar-info">
        <div class="wbar-addr dim" id="wbarAddr">Not connected</div>
        <div class="wbar-net">Solana Mainnet</div>
      </div>
      <div class="wbar-bal" id="wbarBal" style="display:none"></div>
      <button class="wbar-btn" onclick="walletClick()"><span id="wbarBtnLabel">Connect Phantom</span></button>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="panel-head">
        <div class="panel-title"><span class="gdot red"></span> Copy Presets</div>
        <div style="display:flex;align-items:center;gap:.38rem">
          <div class="panel-count" id="pCountBadge">0 / 100</div>
          <button id="addBtn" onclick="openForm()" disabled
            style="font-family:'Barlow Condensed',sans-serif;font-size:.52rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.22rem .58rem;background:rgba(212,168,83,.04);color:var(--gold);border:1px solid rgba(212,168,83,.14);cursor:pointer;transition:all .18s">+ NEW</button>
        </div>
      </div>

      <!-- PRESET FORM -->
      <div class="pform" id="pForm" style="display:none">
        <div class="pform-title" id="pFormTitle">New Preset</div>
        <div class="frow"><label class="flabel">Preset Name</label><input class="finput" id="fName" type="text" placeholder="e.g. DEGEN ALPHA 01" maxlength="32"/></div>
        <div class="frow"><label class="flabel">Target Wallet</label><input class="finput" id="fWallet" type="text" placeholder="Solana address..."/></div>
        <div class="frow">
          <label class="flabel">Fund Amount</label>
          <div class="tg-wrap"><button class="tg on" id="tgSOL" onclick="setCurr('SOL')">SOL</button><button class="tg" id="tgUSD" onclick="setCurr('USD')">USD</button></div>
          <input class="finput" id="fAmt" type="number" placeholder="0.00" min="0.001" max="1000" step="0.001" oninput="updAlloc()"/>
        </div>
        <div class="row2">
          <div class="frow"><label class="flabel">Split into tokens</label><input class="finput" id="fToks" type="number" placeholder="5" min="1" max="50" step="1" oninput="updAlloc()"/></div>
          <div class="frow"><label class="flabel">Min Trade (SOL)</label><input class="finput" id="fMinSOL" type="number" placeholder="0.1" min="0" max="1000" step="0.01"/></div>
        </div>
        <div class="alloc-box" id="allocBox"><span style="font-size:.44rem;letter-spacing:.1em;color:rgba(212,168,83,.44);text-transform:uppercase">Per Token</span><span class="alloc-arrow">→</span><span class="alloc-val" id="allocVal">—</span><span class="alloc-sub" id="allocSub"></span></div>
        <!-- Cutloss + TP -->
        <div class="row2">
          <div class="frow"><label class="flabel">Cutloss %</label><div class="cl-rel"><input class="finput" id="fCL" type="number" placeholder="20" min="1" max="99"/><span class="cl-unit">%</span></div><button class="toggle-btn" id="noCLBtn" onclick="toggleNoCL()">☐ No Cutloss</button></div>
          <div class="frow"><label class="flabel">Take Profit %</label><div class="cl-rel"><input class="finput" id="fTP" type="number" placeholder="100" min="1" max="9999"/><span class="cl-unit">%</span></div><button class="toggle-btn" id="noTPBtn" onclick="toggleNoTP()">☐ No Take Profit</button></div>
        </div>
        <!-- Trailing Stop -->
        <div class="frow"><label class="flabel">Trailing Stop (% drop from peak)</label><div class="cl-rel"><input class="finput" id="fTrail" type="number" placeholder="15" min="1" max="99"/><span class="cl-unit">%</span></div><button class="toggle-btn" id="noTrailBtn" onclick="toggleNoTrail()">☐ No Trailing Stop</button></div>
        <!-- DCA -->
        <div class="frow"><button class="toggle-btn" id="dcaBtn" onclick="toggleDCA()">☐ DCA Mode — buy more on dip</button></div>
        <div id="dcaFields" style="display:none">
          <div class="row2">
            <div class="frow"><label class="flabel">DCA Trigger %</label><div class="cl-rel"><input class="finput" id="fDcaTrig" type="number" placeholder="10" min="1" max="80"/><span class="cl-unit">%</span></div></div>
            <div class="frow"><label class="flabel">DCA Multiplier</label><input class="finput" id="fDcaMult" type="number" placeholder="1.5" min="1" max="5" step="0.1"/></div>
          </div>
          <div class="frow"><label class="flabel">Max DCA Rounds</label><input class="finput" id="fDcaMax" type="number" placeholder="3" min="1" max="10"/></div>
        </div>
        <!-- Copy Sell -->
        <div class="frow"><button class="toggle-btn" id="copySellBtn" onclick="toggleCopySell()">☐ Copy Sell — mirror target sells</button></div>
        <!-- Slippage -->
        <div class="frow"><label class="flabel">Slippage</label>
          <div class="slip-btns">
            <button class="slip-btn on" data-bps="50"   onclick="setSlip(50,this)">0.5%</button>
            <button class="slip-btn"    data-bps="100"  onclick="setSlip(100,this)">1%</button>
            <button class="slip-btn"    data-bps="200"  onclick="setSlip(200,this)">2%</button>
            <button class="slip-btn"    data-bps="500"  onclick="setSlip(500,this)">5%</button>
            <button class="slip-btn"    data-bps="1000" onclick="setSlip(1000,this)">10%</button>
          </div>
        </div>
        <!-- Blacklist -->
        <div class="frow"><label class="flabel">Token Blacklist (skip these mints)</label>
          <div style="display:flex;gap:.28rem;margin-bottom:.28rem">
            <input class="finput" id="fBlInput" type="text" placeholder="Paste mint address..." style="flex:1"/>
            <button onclick="addBlacklist()" style="font-family:'Barlow Condensed',sans-serif;font-size:.54rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.46rem .68rem;background:rgba(179,27,27,.1);color:#ff6b6b;border:1px solid rgba(179,27,27,.18);cursor:pointer">+Add</button>
          </div>
          <div id="blTags"></div>
        </div>
        <div class="factions">
          <button class="btn-save" onclick="savePreset()">Save Preset</button>
          <button class="btn-cancel" onclick="closeForm()">Cancel</button>
        </div>
      </div>

      <div class="plist" id="pList"><div class="pempty">♦ No presets yet<br><span style="font-size:.42rem;opacity:.5">Connect wallet &amp; create a preset</span></div></div>
      <div class="lock" id="pLock"><div class="lock-icon">🔒</div><div class="lock-txt">Connect Phantom Wallet<br>to manage presets</div></div>
    </div>
  </div>

  <!-- RIGHT -->
  <div class="right-col">
    <div class="pnl-sum">
      <div class="pnl-cell"><div class="pnl-lbl">Invested</div><span class="pnl-num gold" id="sInvested">$0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">Value</div><span class="pnl-num" id="sValue">$0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">PnL</div><span class="pnl-num" id="sPnl">+0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">Positions</div><span class="pnl-num" id="sPos">0</span></div>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="tabs">
        <button class="tab on" id="tabBtnPos" onclick="switchTab('Pos',this)">Active Positions</button>
        <button class="tab" id="tabBtnHist" onclick="switchTab('Hist',this)">History</button>
      </div>
      <!-- Positions -->
      <div class="tab-panel on" id="tabPos">
        <div class="panel-head" style="border-top:none">
          <div style="font-family:'Share Tech Mono',monospace;font-size:.42rem;letter-spacing:.07em;color:var(--muted)" id="priceUpd">—</div>
          <button class="export-btn" onclick="exportCSV()">↓ CSV</button>
        </div>
        <div class="tbl-wrap">
          <div class="tbl-hdr"><span>TOKEN</span><span>BUY</span><span>NOW</span><span>INV.</span><span>PnL $</span><span>PnL %</span><span>ACTION</span></div>
          <div id="tblBody"><div class="tbl-empty">♦ No active positions<br><span style="font-size:.43rem;opacity:.5">Run a preset to start</span></div></div>
        </div>
      </div>
      <!-- History -->
      <div class="tab-panel" id="tabHist">
        <div class="panel-head" style="border-top:none">
          <div style="font-family:'Share Tech Mono',monospace;font-size:.42rem;color:var(--muted)">Closed Positions</div>
          <button class="export-btn" onclick="exportHistCSV()">↓ CSV</button>
        </div>
        <div class="tbl-wrap">
          <div class="hist-hdr"><span>TOKEN</span><span>BUY</span><span>SELL</span><span>INV.</span><span>PnL $</span><span>REASON</span></div>
          <div id="histBody"><div class="tbl-empty">♦ No closed positions yet</div></div>
        </div>
      </div>
      <div class="lock" id="tLock"><div class="lock-icon">🔒</div><div class="lock-txt">Connect wallet<br>to view positions</div></div>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="panel-head">
        <div class="panel-title">Activity Log</div>
        <button onclick="clearLog()" style="font-family:'Share Tech Mono',monospace;font-size:.42rem;letter-spacing:.07em;color:rgba(237,232,220,.14);background:transparent;border:none;cursor:pointer" onmouseover="this.style.color='rgba(237,232,220,.38)'" onmouseout="this.style.color='rgba(237,232,220,.14)'">CLEAR</button>
      </div>
      <div class="log-wrap" id="logWrap"><div class="log-empty">Waiting for activity...</div></div>
    </div>
  </div>
</div>

<footer>
  <div class="footer-brand">#ALL-IN Leorningcild — Copy Trading v3</div>
  <div class="footer-copy">#ALL-IN FOUNDATION · Solana · Jupiter V6 · 2025</div>
</footer>

<!-- MODALS -->
<div class="overlay" id="phModal"><div class="modal" style="max-width:340px"><div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div><div class="mhead"><div class="mtitle">Connect Phantom</div><button class="mclose" onclick="closePhModal()">✕</button></div><div class="ph-mbody" id="phModalBody"></div></div></div>
<div class="overlay" id="sellModal"><div class="modal"><div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div><div class="mhead"><div class="mtitle">Sell Position</div><button class="mclose" onclick="closeSell()">✕</button></div><div class="mbody"><div class="micon">⚠</div><div class="mtext" id="sellTxt">Close this position?</div><div class="mdetail" id="sellDetail">—</div><div class="mbtns"><button class="mbtn-p" id="sellConfirmBtn" onclick="confirmSell()">Confirm Sell</button><button class="mbtn-s" onclick="closeSell()">Keep Position</button></div></div></div></div>
<div class="overlay" id="stopModal"><div class="modal"><div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div><div class="mhead"><div class="mtitle">Stop Preset</div><button class="mclose" onclick="closeStop()">✕</button></div><div class="mbody"><div class="micon">⏹</div><div class="mtext" id="stopTxt">Stop this preset?</div><div class="mbtns"><button class="mbtn-p" onclick="confirmStop()">Stop</button><button class="mbtn-s" onclick="closeStop()">Keep Running</button></div></div></div></div>
<div class="overlay" id="delModal"><div class="modal"><div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div><div class="mhead"><div class="mtitle">Delete Preset</div><button class="mclose" onclick="closeDel()">✕</button></div><div class="mbody"><div class="micon">🗑</div><div class="mtext" id="delTxt">Delete this preset?</div><div class="mbtns"><button class="mbtn-p" onclick="confirmDel()">Delete</button><button class="mbtn-s" onclick="closeDel()">Cancel</button></div></div></div></div>
<div class="toasts" id="toastWrap"></div>

<script>
'use strict';

/* ══ CONFIG ══ */
var WORKER_URL = (function(){
  var h = location.hostname;
  if(h==='localhost'||h==='127.0.0.1') return 'http://localhost:8787';
  return location.origin;
})();
var WS_URL   = WORKER_URL.replace(/^http/,'ws')+'/ws';
var FEE_ACCT = '';   // Jupiter Referral PDA
var FEE_BPS  = 50;
var SOL_MINT = 'So11111111111111111111111111111111111111112';
var LAMPORTS = 1e9;
var SOL_RE   = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
var FEE_LEVELS = ['auto','slow','fast','turbo'];

/* ══ STATE ══ */
var S = {
  connected:false, addr:null, balance:0, solPrice:0,
  presets:[], positions:[], history:[], logs:[],
  currency:'SOL', noCL:false, noTP:false, noTrail:false,
  dcaMode:false, copySell:false, slippage:50, editId:null,
  pendSell:null, pendStop:null, pendDel:null,
  ws:null, wsAlive:false, tokenCache:{},
  blacklistBuf:[], priorityLevel:0,
  priorityFees:{slow:1000,fast:5000,turbo:20000},
  peakPrices:{},
  sellingIds: new Set()   // BUG FIX: dedup auto-sell
};

/* ══ ENV ══ */
var ENV=(function(){
  var ua=navigator.userAgent||'', mob=/Android|iPhone|iPad|iPod/i.test(ua);
  return{mob,andr:/Android/i.test(ua),ios:/iPhone|iPad|iPod/i.test(ua),
    inPh:!!(window.phantom&&window.phantom.solana&&window.phantom.solana.isPhantom),
    ext:!mob&&!!(window.solana&&window.solana.isPhantom)};
})();
function getProvider(){
  if(window.phantom&&window.phantom.solana&&window.phantom.solana.isPhantom) return window.phantom.solana;
  if(window.solana&&window.solana.isPhantom) return window.solana;
  return null;
}

/* ══ LOCALSTORAGE ══ */
function lsSave(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function lsLoad(k){try{var v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function savePresets()  {lsSave('allin_presets',S.presets);}
function savePositions(){lsSave('allin_positions',S.positions);}
function saveHistory()  {lsSave('allin_history',S.history.slice(0,500));}

/* ══ WEBSOCKET ══ */
function connectWS(){
  if(S.ws&&S.ws.readyState===WebSocket.OPEN) return;
  setWsStatus('connecting');
  try{S.ws=new WebSocket(WS_URL);}
  catch(e){setWsStatus('error');addLog('WS failed: '+e.message,'warn');setTimeout(connectWS,5000);return;}
  S.ws.onopen=function(){
    S.wsAlive=true;setWsStatus('ok');addLog('Worker connected','inf');
    var seen=new Set();
    S.presets.filter(function(p){return p.status==='running';}).forEach(function(p){
      if(!seen.has(p.targetWallet)){S.ws.send(JSON.stringify({type:'watch',wallet:p.targetWallet}));seen.add(p.targetWallet);}
    });
  };
  S.ws.onmessage=function(evt){try{handleWSMessage(JSON.parse(evt.data));}catch(e){}};
  S.ws.onclose=function(){S.wsAlive=false;setWsStatus('reconnecting');setTimeout(connectWS,4000);};
  S.ws.onerror=function(){setWsStatus('error');};
}
function setWsStatus(state){
  var dot=document.getElementById('wsDot'),txt=document.getElementById('wsStatus');
  if(state==='ok'){dot.className='dot dot-ok';txt.textContent='Worker: online';}
  else if(state==='error'||state==='reconnecting'){dot.className='dot dot-err';txt.textContent=state==='error'?'Worker: error':'Worker: reconnecting...';}
  else{dot.className='dot dot-wait';txt.textContent='Worker: connecting...';}
}

/* ══ WS MESSAGES ══ */
async function handleWSMessage(msg){
  if(msg.type==='swap_detected'){
    addLog('Swap: '+(msg.tokenMint||'').slice(0,8)+'… '+msg.action.toUpperCase()+' | '+(msg.amountInSol||0).toFixed(4)+' SOL','inf');
    await handleTargetSwap(msg);
  }
  if(msg.type==='watching'){setMonStatus('watching',msg.wallet);addLog('Monitoring: '+shortAddr(msg.wallet)+' ('+msg.count+' wallet'+(msg.count!==1?'s':'')+')', 'inf');}
  if(msg.type==='unwatched'){addLog('Stopped: '+shortAddr(msg.wallet),'inf');if(!msg.count)setMonStatus('idle');}
  if(msg.type==='subscribed'){addLog('logsSubscribe active (id:'+msg.subId+')','inf');}
  if(msg.type==='rpc_reconnecting'){setMonStatus('reconnecting');}
  if(msg.type==='rpc_connected'){
    var seen=new Set();
    S.presets.filter(function(p){return p.status==='running';}).forEach(function(p){
      if(!seen.has(p.targetWallet)){S.ws.send(JSON.stringify({type:'watch',wallet:p.targetWallet}));seen.add(p.targetWallet);}
    });
  }
}
function setMonStatus(state,wallet){
  var dot=document.getElementById('monDot'),txt=document.getElementById('monStatus');
  if(state==='watching'){dot.className='dot dot-ok';txt.textContent='Monitor: '+shortAddr(wallet);}
  else if(state==='reconnecting'){dot.className='dot dot-wait';txt.textContent='Monitor: reconnecting...';}
  else{dot.className='dot dot-wait';txt.textContent='Monitor: idle';}
}

/* ══ HANDLE TARGET SWAP ══ */
async function handleTargetSwap(event){
  if(!S.connected) return;
  var matching=S.presets.filter(function(p){return p.status==='running'&&p.targetWallet===event.wallet;});
  if(!matching.length) return;
  for(var i=0;i<matching.length;i++){
    var preset=matching[i];
    if(event.action==='buy'){
      if(preset.minTradeSize>0&&(event.amountInSol||0)<preset.minTradeSize){addLog('['+preset.name+'] Skip: too small','inf');continue;}
      if(preset.blacklist&&preset.blacklist.includes(event.tokenMint)){addLog('['+preset.name+'] Skip: blacklisted','inf');continue;}
      await executeCopyBuy(preset,event.tokenMint,event.signature);
    }
    if(event.action==='sell'&&preset.copySell){
      var pos=S.positions.find(function(p){return p.mint===event.tokenMint&&p.presetId===preset.id;});
      if(pos&&!S.sellingIds.has(pos.id)){await autoSell(pos,'COPY SELL '+(event.sellPct||100)+'%');}
    }
  }
}

/* ══ EXECUTE COPY BUY ══ */
async function executeCopyBuy(preset,tokenMint,refSig){
  if(!tokenMint||tokenMint===SOL_MINT) return;
  var solRef=S.solPrice>0?S.solPrice:150;
  var solPerTok=preset.currency==='SOL'?preset.amount/preset.tokens:(preset.amount/preset.tokens)/solRef;
  var lamports=Math.floor(solPerTok*LAMPORTS);
  if(lamports<10000){addLog('['+preset.name+'] Too small: '+tokenMint.slice(0,8),'warn');return;}
  addLog('['+preset.name+'] Copying buy: '+tokenMint.slice(0,8)+'… | '+solPerTok.toFixed(4)+' SOL','inf');
  try{
    var quoteUrl='/quote?inputMint='+SOL_MINT+'&outputMint='+tokenMint+'&amount='+lamports+'&slippageBps='+preset.slippage;
    if(FEE_ACCT) quoteUrl+='&platformFeeBps='+FEE_BPS+'&feeAccount='+FEE_ACCT;
    var qr=await workerFetch(quoteUrl);
    if(!qr.ok||!qr.quote){addLog('['+preset.name+'] Quote failed','warn');return;}
    var swapBody={quoteResponse:qr.quote,userPublicKey:S.addr,wrapUnwrapSOL:true};
    if(FEE_ACCT) swapBody.feeAccount=FEE_ACCT;
    var cpu=getPriorityMicroLamports();
    if(cpu>0) swapBody.computeUnitPriceMicroLamports=cpu;
    var tr=await workerFetch('/swap-tx','POST',swapBody);
    if(!tr.ok||!tr.swapTransaction){addLog('['+preset.name+'] Swap TX failed','warn');return;}
    var prov=getProvider();if(!prov){addLog('Phantom not available','warn');return;}
    var vTx=solanaWeb3.VersionedTransaction.deserialize(b64ToU8(tr.swapTransaction));
    var signed=await prov.signTransaction(vTx);
    var res=await sendTx(signed.serialize());
    if(!res.signature){addLog('['+preset.name+'] Send TX failed','warn');return;}
    addLog('['+preset.name+'] BUY '+shortAddr(res.signature),'buy');
    toast('['+preset.name+'] Bought '+tokenMint.slice(0,6),'ok');
    var tinfo=await getTokenInfo(tokenMint);
    var symbol=tinfo.symbol||tokenMint.slice(0,6);
    var decs=tinfo.decimals!=null?tinfo.decimals:6;
    var outAmt=parseInt(qr.quote.outAmount||0)/Math.pow(10,decs);
    var usdInv=solPerTok*solRef;
    var buyUSD=outAmt>0?usdInv/outAmt:0;
    var pos={
      id:'pos_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
      presetId:preset.id,presetName:preset.name,
      ticker:symbol,mint:tokenMint,
      buyPrice:buyUSD,curPrice:buyUSD,invested:usdInv,qty:outAmt,
      buyTime:Date.now(),buyTx:res.signature,slippage:preset.slippage,
      cutloss:preset.noCutloss?null:preset.cutloss,noCutloss:!!preset.noCutloss,
      takeProfit:preset.noTakeProfit?null:preset.takeProfit,noTakeProfit:!!preset.noTakeProfit,
      trailPct:preset.noTrail?null:preset.trailPct,noTrail:!!preset.noTrail,
      dcaEnabled:!!preset.dcaMode,dcaTrig:preset.dcaTrig||10,dcaMult:preset.dcaMult||1.5,
      dcaMax:preset.dcaMax||3,dcaCount:0,dcaLastTrig:buyUSD
    };
    S.positions.push(pos);
    S.peakPrices[pos.id]=buyUSD;
    S.tokenCache[tokenMint]={symbol,decimals:decs};
    savePositions();
    addLog('['+preset.name+'] Opened: '+symbol+' | $'+usdInv.toFixed(2),'buy');
    renderTrades();updateSummary();
  }catch(e){addLog('['+preset.name+'] Buy error: '+(e.message||e),'warn');}
}

/* ══ EXECUTE SELL ══ */
async function executeSell(pos,confirmBtn){
  if(confirmBtn) confirmBtn.disabled=true;
  var tMint=pos.mint,decs=S.tokenCache[tMint]?S.tokenCache[tMint].decimals:6;
  var rawAmt=Math.floor(pos.qty*Math.pow(10,decs));
  if(rawAmt<1){addLog('Amount too small','warn');if(confirmBtn)confirmBtn.disabled=false;return false;}
  addLog('Selling '+pos.ticker+'…','inf');
  try{
    // BUG FIX: pakai slippage dari pos (disimpan saat buy), bukan dari S.slippage global
    var slipBps=pos.slippage||100;
    var qr=await workerFetch('/quote?inputMint='+tMint+'&outputMint='+SOL_MINT+'&amount='+rawAmt+'&slippageBps='+slipBps);
    if(!qr.ok||!qr.quote){addLog('Sell quote failed: '+pos.ticker,'warn');if(confirmBtn)confirmBtn.disabled=false;return false;}
    var swapBody={quoteResponse:qr.quote,userPublicKey:S.addr,wrapUnwrapSOL:true};
    var cpu=getPriorityMicroLamports();if(cpu>0) swapBody.computeUnitPriceMicroLamports=cpu;
    var tr=await workerFetch('/swap-tx','POST',swapBody);
    if(!tr.ok||!tr.swapTransaction){addLog('Sell TX failed','warn');if(confirmBtn)confirmBtn.disabled=false;return false;}
    var prov=getProvider();if(!prov){if(confirmBtn)confirmBtn.disabled=false;return false;}
    var vTx=solanaWeb3.VersionedTransaction.deserialize(b64ToU8(tr.swapTransaction));
    var signed=await prov.signTransaction(vTx);
    var res=await sendTx(signed.serialize());
    if(!res.signature){addLog('Sell TX send failed','warn');if(confirmBtn)confirmBtn.disabled=false;return false;}
    var pnl=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
    addLog('SOLD '+pos.ticker+' | '+shortAddr(res.signature)+' | PnL: '+fmtPnl(pnl),'sell');
    toast('Sold '+pos.ticker+' | PnL: '+fmtPnl(pnl),pnl>=0?'ok':'inf');
    return true;
  }catch(e){addLog('Sell error: '+(e.message||e),'warn');if(confirmBtn)confirmBtn.disabled=false;return false;}
}

/* ══ AUTO SELL (cutloss / TP / trail / copy-sell)
   BUG FIX: S.sellingIds dedup mencegah double-sell race condition ══ */
async function autoSell(pos,reason){
  if(S.sellingIds.has(pos.id)) return;
  S.sellingIds.add(pos.id);
  S.positions=S.positions.filter(function(p){return p.id!==pos.id;});
  delete S.peakPrices[pos.id];
  addLog(reason+': '+pos.ticker+' — selling…','sell');
  toast(reason+': '+pos.ticker,'inf');
  await executeSell(pos,null);
  var pnl=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
  S.history.unshift({id:pos.id,ticker:pos.ticker,mint:pos.mint,presetName:pos.presetName,
    buyPrice:pos.buyPrice,sellPrice:pos.curPrice,invested:pos.invested,pnl,reason,time:Date.now()});
  if(S.history.length>500) S.history.length=500;
  saveHistory();savePositions();
  renderTrades();renderHistory();updateSummary();
  S.sellingIds.delete(pos.id);
}

/* ══ SEND TX
   BUG FIX: pollConfirmation non-blocking — return signature segera,
   konfirmasi berjalan di background ══ */
async function sendTx(serialized){
  var b64=u8ToB64(serialized);
  var rpcs=['https://api.mainnet-beta.solana.com','https://rpc.ankr.com/solana'];
  var sig=null;
  for(var i=0;i<rpcs.length;i++){
    try{
      var r=await fetch(rpcs[i],{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method:'sendTransaction',
          params:[b64,{encoding:'base64',skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'}]}),
        signal:AbortSignal.timeout(15000)});
      var d=await r.json();
      if(d.result){sig=d.result;break;}
      if(d.error) addLog('RPC: '+JSON.stringify(d.error),'warn');
    }catch(e){}
  }
  if(!sig) return{signature:null,confirmed:false};
  // Non-blocking poll — tidak tunggu di sini
  pollConfirmation(sig,rpcs[0]).then(function(ok){
    if(ok) addLog('TX confirmed: '+shortAddr(sig)+' ✓','inf');
    else   addLog('TX unconfirmed after 60s: '+shortAddr(sig),'warn');
  });
  return{signature:sig,confirmed:false};
}
async function pollConfirmation(sig,rpc){
  for(var i=0;i<30;i++){
    await delay(2000);
    try{
      var r=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getSignatureStatuses',params:[[sig]]}),
        signal:AbortSignal.timeout(8000)});
      var d=await r.json();
      var st=d.result&&d.result.value&&d.result.value[0];
      if(st){if(st.err)return false;if(st.confirmationStatus==='confirmed'||st.confirmationStatus==='finalized')return true;}
    }catch(e){}
  }
  return false;
}

/* ══ PRICE REFRESH + CUTLOSS / TP / TRAILING / DCA ══ */
async function refreshPrices(){
  if(!S.positions.length) return;
  var mints=[...new Set(S.positions.map(function(p){return p.mint;}))].join(',');
  try{
    var res=await workerFetch('/price?mints='+mints);
    if(!res.ok||!res.data) return;
    var toSell=[],toDCA=[];
    S.positions.forEach(function(pos){
      if(S.sellingIds.has(pos.id)) return; // BUG FIX: skip already-queued
      var info=res.data[pos.mint];if(!info) return;
      var price=parseFloat(info.price||0);if(price<=0) return;
      pos.curPrice=price;
      // Update trailing peak
      if(!pos.noTrail&&pos.trailPct){
        if(!S.peakPrices[pos.id]||price>S.peakPrices[pos.id]) S.peakPrices[pos.id]=price;
      }
      var pct=(price-pos.buyPrice)/pos.buyPrice*100;
      // 1. Trailing stop (prioritas tertinggi)
      if(!pos.noTrail&&pos.trailPct&&S.peakPrices[pos.id]){
        var drop=(S.peakPrices[pos.id]-price)/S.peakPrices[pos.id]*100;
        if(drop>=pos.trailPct){toSell.push({pos:Object.assign({},pos),reason:'TRAIL STOP −'+pos.trailPct+'% from peak'});return;}
      }
      // 2. Cutloss
      if(!pos.noCutloss&&pos.cutloss!==null&&pct<=-pos.cutloss){toSell.push({pos:Object.assign({},pos),reason:'CUTLOSS −'+pos.cutloss+'%'});return;}
      // 3. Take Profit
      if(!pos.noTakeProfit&&pos.takeProfit&&pct>=pos.takeProfit){toSell.push({pos:Object.assign({},pos),reason:'TAKE PROFIT +'+pos.takeProfit+'%'});return;}
      // 4. DCA
      if(pos.dcaEnabled&&pos.dcaCount<pos.dcaMax){
        var dropLast=(pos.dcaLastTrig-price)/pos.dcaLastTrig*100;
        if(dropLast>=pos.dcaTrig) toDCA.push(Object.assign({},pos));
      }
    });
    toSell.forEach(function(item){autoSell(item.pos,item.reason);});
    for(var i=0;i<toDCA.length;i++){
      var dp=toDCA[i];
      var live=S.positions.find(function(p){return p.id===dp.id;});
      if(!live) continue;
      var preset=S.presets.find(function(pr){return pr.id===live.presetId;});
      if(!preset) continue;
      live.dcaCount++;live.dcaLastTrig=live.curPrice;
      savePositions();
      addLog('[DCA] Buying more '+live.ticker+' round '+live.dcaCount+'/'+live.dcaMax,'dca');
      toast('[DCA] '+live.ticker+' round '+live.dcaCount,'dca');
      executeDcaBuy(live,Math.floor((live.invested/(S.solPrice||150))*live.dcaMult*LAMPORTS)).catch(function(){});
    }
    renderTrades();updateSummary();
    document.getElementById('priceUpd').textContent='Updated '+fmtTime(new Date());
  }catch(e){}
}
async function executeDcaBuy(pos,lamports){
  try{
    var qr=await workerFetch('/quote?inputMint='+SOL_MINT+'&outputMint='+pos.mint+'&amount='+lamports+'&slippageBps='+pos.slippage);
    if(!qr.ok||!qr.quote) return;
    var swapBody={quoteResponse:qr.quote,userPublicKey:S.addr,wrapUnwrapSOL:true};
    var cpu=getPriorityMicroLamports();if(cpu>0) swapBody.computeUnitPriceMicroLamports=cpu;
    var tr=await workerFetch('/swap-tx','POST',swapBody);
    if(!tr.ok||!tr.swapTransaction) return;
    var prov=getProvider();if(!prov) return;
    var vTx=solanaWeb3.VersionedTransaction.deserialize(b64ToU8(tr.swapTransaction));
    var signed=await prov.signTransaction(vTx);
    var res=await sendTx(signed.serialize());
    if(!res.signature) return;
    var live=S.positions.find(function(p){return p.id===pos.id;});
    if(live){
      var decs=S.tokenCache[pos.mint]?S.tokenCache[pos.mint].decimals:6;
      var outAmt=parseInt(qr.quote.outAmount||0)/Math.pow(10,decs);
      var addInv=(lamports/LAMPORTS)*(S.solPrice||150);
      live.qty+=outAmt;live.invested+=addInv;
      // Recalculate avg buy price
      live.buyPrice=live.invested/(live.qty>0?live.qty:1);
      savePositions();renderTrades();updateSummary();
    }
    addLog('[DCA] BUY '+shortAddr(res.signature),'buy');
  }catch(e){addLog('[DCA] Error: '+(e.message||e),'warn');}
}

/* ══ SOL PRICE + BALANCE ══ */
async function fetchSolPrice(){
  try{var r=await workerFetch('/sol-price');if(r.ok&&r.price>0){S.solPrice=r.price;document.getElementById('solPriceBar').textContent='SOL: $'+r.price.toFixed(2);updAlloc();}}catch(e){}
}
async function fetchBal(addr){
  var rpcs=['https://api.mainnet-beta.solana.com','https://rpc.ankr.com/solana'];
  for(var i=0;i<rpcs.length;i++){try{var r=await fetch(rpcs[i],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[addr]}),signal:AbortSignal.timeout(6000)});var d=await r.json();if(d.result&&typeof d.result.value==='number'){S.balance=d.result.value/LAMPORTS;renderBal();return;}}catch(e){}}
}
function renderBal(){var t=S.balance.toFixed(4)+' SOL';if(S.solPrice>0) t+=' ≈ $'+(S.balance*S.solPrice).toFixed(2);document.getElementById('wbarBal').textContent=t;}

/* ══ PRIORITY FEE ══ */
async function fetchPriorityFee(){
  try{var r=await workerFetch('/priority-fee');if(r.ok) S.priorityFees={slow:r.slow,fast:r.fast,turbo:r.turbo};updateFeeBadge();}catch(e){}
}
function getPriorityMicroLamports(){
  var lvl=FEE_LEVELS[S.priorityLevel];
  if(lvl==='slow') return S.priorityFees.slow;
  if(lvl==='fast') return S.priorityFees.fast;
  if(lvl==='turbo') return S.priorityFees.turbo;
  return S.priorityFees.slow; // auto = slow as default
}
function cycleFee(){S.priorityLevel=(S.priorityLevel+1)%FEE_LEVELS.length;updateFeeBadge();lsSave('allin_fee_level',S.priorityLevel);}
function updateFeeBadge(){
  var btn=document.getElementById('feeBtn'),est=document.getElementById('feeEst');
  var lvl=FEE_LEVELS[S.priorityLevel];
  btn.className='fee-badge'+(lvl==='fast'?' fast':lvl==='turbo'?' turbo':'');
  btn.textContent='⚡ '+lvl.toUpperCase();
  var cu=getPriorityMicroLamports();
  est.textContent=cu?cu.toLocaleString()+' μL':'';
}

/* ══ WORKER FETCH ══ */
async function workerFetch(path,method,body){
  method=method||'GET';
  var opts={method,headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(12000)};
  if(body) opts.body=JSON.stringify(body);
  var r=await fetch(WORKER_URL+path,opts);
  if(!r.ok) throw new Error('Worker HTTP '+r.status);
  try{return await r.json();}catch(e){throw new Error('Worker non-JSON');}
}

/* ══ TOKEN INFO ══ */
async function getTokenInfo(mint){
  if(S.tokenCache[mint]) return S.tokenCache[mint];
  try{var r=await workerFetch('/token-info?mint='+mint);if(r.ok){S.tokenCache[mint]=r;return r;}}catch(e){}
  return{symbol:mint.slice(0,6),decimals:6,mint};
}

/* ══ PHANTOM WALLET ══ */
function deepLink(){return 'phantom://browse/'+encodeURIComponent(location.href)+'?ref='+encodeURIComponent(location.origin);}
function uniLink(){return 'https://phantom.app/ul/browse/'+encodeURIComponent(location.href)+'?ref='+encodeURIComponent(location.origin);}
function walletClick(){if(S.connected){doDisconnect();return;}if(ENV.inPh||ENV.ext){doConnect();return;}openPhModal();}
function openPhModal(){
  var dl=deepLink(),ul=uniLink(),html;
  if(ENV.mob){
    html='<div class="mtext">Open inside <b style="color:var(--phantom)">Phantom App</b> to connect.</div>'+
      '<div class="ph-opts"><a href="'+dl+'" class="ph-opt primary" onclick="closePhModal()">Open in Phantom App</a>'+
      '<div class="ph-div">or</div><a href="'+ul+'" class="ph-opt" onclick="closePhModal()">Universal Link</a>'+
      (ENV.andr?'<a href="https://play.google.com/store/apps/details?id=app.phantom" target="_blank" class="ph-opt" onclick="closePhModal()">Install Phantom — Google Play</a>':
               '<a href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977" target="_blank" class="ph-opt" onclick="closePhModal()">Install Phantom — App Store</a>')+
      '</div><div class="ph-note">Reconnects automatically after opening.</div>';
  }else{
    html='<div class="mtext">Phantom extension not detected.</div>'+
      '<div class="ph-opts"><a href="https://phantom.app/download" target="_blank" class="ph-opt primary" onclick="closePhModal()">Install Phantom Extension</a>'+
      '<div class="ph-div">already installed?</div><button class="ph-opt" onclick="closePhModal();retryConnect()">Retry Connection</button></div>'+
      '<div class="ph-note">Refresh page after installing.</div>';
  }
  document.getElementById('phModalBody').innerHTML=html;
  document.getElementById('phModal').classList.add('show');
}
function closePhModal(){document.getElementById('phModal').classList.remove('show');}
function retryConnect(){
  if(window.phantom&&window.phantom.solana&&window.phantom.solana.isPhantom) ENV.inPh=true;
  if(window.solana&&window.solana.isPhantom) ENV.ext=true;
  if(ENV.inPh||ENV.ext) doConnect();
  else toast('Phantom not found — refresh after install','err');
}
async function doConnect(){
  var nb=document.getElementById('navBtn');nb.classList.add('connecting');
  document.getElementById('navLabel').innerHTML='<span class="spin">↻</span> Connecting...';
  var prov=getProvider();if(!prov){resetNavBtn();toast('Phantom not found','err');return;}
  try{
    var resp=await prov.connect();
    var addr=resp.publicKey.toString?resp.publicKey.toString():String(resp.publicKey);
    S.connected=true;S.addr=addr;
    try{prov.on('accountChanged',function(pk){if(pk){S.addr=pk.toString();onConnected(S.addr);fetchBal(S.addr);}else doDisconnect();});prov.on('disconnect',doDisconnect);}catch(e){}
    onConnected(addr);fetchBal(addr);
  }catch(e){
    resetNavBtn();
    if(e.code===4001||(e.message||'').toLowerCase().includes('user rejected')) toast('Rejected','err');
    else{toast('Connect failed: '+(e.message||e),'err');addLog('Connect error: '+(e.message||e),'warn');}
  }
}
function doDisconnect(){
  S.connected=false;S.addr=null;S.balance=0;
  S.presets.forEach(function(p){if(p.status==='running') p.status='stopped';});
  savePresets();
  if(S.ws) try{S.ws.send(JSON.stringify({type:'unwatch_all'}));}catch(e){}
  try{var p=getProvider();if(p&&p.disconnect) p.disconnect();}catch(e){}
  onDisconnected();toast('Disconnected','inf');addLog('Wallet disconnected','inf');
}
function resetNavBtn(){document.getElementById('navBtn').classList.remove('connecting','connected');document.getElementById('navLabel').textContent='Connect Wallet';}
function onConnected(addr){
  document.getElementById('navBtn').classList.remove('connecting');document.getElementById('navBtn').classList.add('connected');
  document.getElementById('navLabel').innerHTML='<span class="wdot"></span> '+shortAddr(addr);
  document.getElementById('wbarAddr').textContent=shortAddr(addr);document.getElementById('wbarAddr').classList.remove('dim');
  document.getElementById('wbarBal').style.display='';document.getElementById('wbarBtnLabel').textContent='Disconnect';
  document.getElementById('walletNotice').style.display='none';
  document.getElementById('pLock').style.display='none';document.getElementById('tLock').style.display='none';
  document.getElementById('addBtn').disabled=false;document.getElementById('mobBanner').style.display='none';
  toast('Connected!','ok');addLog('Connected: '+shortAddr(addr),'inf');
}
function onDisconnected(){
  document.getElementById('navBtn').classList.remove('connected','connecting');document.getElementById('navLabel').textContent='Connect Wallet';
  document.getElementById('wbarAddr').textContent='Not connected';document.getElementById('wbarAddr').classList.add('dim');
  document.getElementById('wbarBal').style.display='none';document.getElementById('wbarBtnLabel').textContent='Connect Phantom';
  document.getElementById('walletNotice').style.display='';
  document.getElementById('pLock').style.display='';document.getElementById('tLock').style.display='';
  document.getElementById('addBtn').disabled=true;
  setMonStatus('idle');renderPresets();closeForm();
}

/* ══ PRESET FORM ══ */
function openForm(){
  if(!S.connected){toast('Connect wallet first','err');return;}
  if(S.presets.length>=100){toast('Max 100 presets','err');return;}
  S.editId=null;S.noCL=false;S.noTP=false;S.noTrail=false;S.dcaMode=false;S.copySell=false;S.blacklistBuf=[];
  document.getElementById('pFormTitle').textContent='New Preset';
  ['fName','fWallet','fAmt','fToks','fCL','fTP','fMinSOL','fTrail','fDcaTrig','fDcaMult','fDcaMax','fBlInput'].forEach(function(id){var el=document.getElementById(id);if(el){el.value='';el.disabled=false;}});
  document.getElementById('noCLBtn').classList.remove('on');document.getElementById('noCLBtn').textContent='☐ No Cutloss';
  document.getElementById('noTPBtn').classList.remove('on');document.getElementById('noTPBtn').textContent='☐ No Take Profit';
  document.getElementById('noTrailBtn').classList.remove('on');document.getElementById('noTrailBtn').textContent='☐ No Trailing Stop';
  document.getElementById('dcaBtn').classList.remove('on','on-green');document.getElementById('dcaBtn').textContent='☐ DCA Mode — buy more on dip';
  document.getElementById('copySellBtn').classList.remove('on','on-green');document.getElementById('copySellBtn').textContent='☐ Copy Sell — mirror target sells';
  document.getElementById('dcaFields').style.display='none';
  document.getElementById('blTags').innerHTML='';
  setCurr('SOL');
  document.querySelectorAll('.slip-btn').forEach(function(b){b.classList.remove('on');});
  document.querySelector('[data-bps="50"]').classList.add('on');
  S.slippage=50;updAlloc();
  document.getElementById('pForm').style.display='';document.getElementById('fName').focus();
}
function closeForm(){document.getElementById('pForm').style.display='none';S.editId=null;S.blacklistBuf=[];}

// BUG FIX: openEditForm — setSlip menggunakan data-bps attribute, bukan indexOf
function openEditForm(id){
  var p=S.presets.find(function(x){return x.id===id;});if(!p) return;
  if(p.status==='running'){
    p.status='stopped';
    // BUG FIX: hanya unwatch jika tidak ada preset lain yang masih running di wallet yang sama
    var stillWatching=S.presets.some(function(x){return x.id!==p.id&&x.status==='running'&&x.targetWallet===p.targetWallet;});
    if(!stillWatching&&S.ws) try{S.ws.send(JSON.stringify({type:'unwatch',wallet:p.targetWallet}));}catch(e){}
    savePresets();renderPresets();
  }
  S.editId=id;S.noCL=!!p.noCutloss;S.noTP=!!p.noTakeProfit;S.noTrail=!!p.noTrail;
  S.dcaMode=!!p.dcaMode;S.copySell=!!p.copySell;S.blacklistBuf=(p.blacklist||[]).slice();
  document.getElementById('pFormTitle').textContent='Edit Preset';
  document.getElementById('fName').value=p.name||'';
  document.getElementById('fWallet').value=p.targetWallet||'';
  document.getElementById('fAmt').value=p.amount||'';
  document.getElementById('fToks').value=p.tokens||'';
  document.getElementById('fMinSOL').value=p.minTradeSize||'';
  document.getElementById('fCL').value=p.noCutloss?'':(p.cutloss||'');document.getElementById('fCL').disabled=S.noCL;
  document.getElementById('fTP').value=p.noTakeProfit?'':(p.takeProfit||'');document.getElementById('fTP').disabled=S.noTP;
  document.getElementById('fTrail').value=p.noTrail?'':(p.trailPct||'');document.getElementById('fTrail').disabled=S.noTrail;
  document.getElementById('fDcaTrig').value=p.dcaTrig||10;document.getElementById('fDcaMult').value=p.dcaMult||1.5;document.getElementById('fDcaMax').value=p.dcaMax||3;
  document.getElementById('noCLBtn').classList.toggle('on',S.noCL);document.getElementById('noCLBtn').textContent=(S.noCL?'☑':'☐')+' No Cutloss';
  document.getElementById('noTPBtn').classList.toggle('on',S.noTP);document.getElementById('noTPBtn').textContent=(S.noTP?'☑':'☐')+' No Take Profit';
  document.getElementById('noTrailBtn').classList.toggle('on',S.noTrail);document.getElementById('noTrailBtn').textContent=(S.noTrail?'☑':'☐')+' No Trailing Stop';
  document.getElementById('dcaBtn').classList.toggle('on-green',S.dcaMode);document.getElementById('dcaBtn').textContent=(S.dcaMode?'☑':'☐')+' DCA Mode — buy more on dip';
  document.getElementById('dcaFields').style.display=S.dcaMode?'':'none';
  document.getElementById('copySellBtn').classList.toggle('on-green',S.copySell);document.getElementById('copySellBtn').textContent=(S.copySell?'☑':'☐')+' Copy Sell — mirror target sells';
  setCurr(p.currency||'SOL');
  // BUG FIX: cari slip button lewat data-bps attribute
  document.querySelectorAll('.slip-btn').forEach(function(b){b.classList.remove('on');});
  var activeBtn=document.querySelector('[data-bps="'+(p.slippage||50)+'"]');
  if(activeBtn) activeBtn.classList.add('on');
  S.slippage=p.slippage||50;
  renderBlacklistTags();updAlloc();
  document.getElementById('pForm').style.display='';
  document.getElementById('pForm').scrollIntoView({behavior:'smooth',block:'start'});
  document.getElementById('fName').focus();
}

function setCurr(c){
  S.currency=c;
  document.getElementById('tgSOL').classList.toggle('on',c==='SOL');
  document.getElementById('tgUSD').classList.toggle('on',c==='USD');
  document.getElementById('fAmt').placeholder=c==='SOL'?'0.0000 SOL':'0.00 USD';
  updAlloc();
}
function setSlip(bps,el){
  S.slippage=bps;
  document.querySelectorAll('.slip-btn').forEach(function(b){b.classList.remove('on');});
  if(el) el.classList.add('on');
}
function toggleNoCL(){S.noCL=!S.noCL;document.getElementById('noCLBtn').classList.toggle('on',S.noCL);document.getElementById('noCLBtn').textContent=(S.noCL?'☑':'☐')+' No Cutloss';document.getElementById('fCL').disabled=S.noCL;if(S.noCL)document.getElementById('fCL').value='';}
function toggleNoTP(){S.noTP=!S.noTP;document.getElementById('noTPBtn').classList.toggle('on',S.noTP);document.getElementById('noTPBtn').textContent=(S.noTP?'☑':'☐')+' No Take Profit';document.getElementById('fTP').disabled=S.noTP;if(S.noTP)document.getElementById('fTP').value='';}
function toggleNoTrail(){S.noTrail=!S.noTrail;document.getElementById('noTrailBtn').classList.toggle('on',S.noTrail);document.getElementById('noTrailBtn').textContent=(S.noTrail?'☑':'☐')+' No Trailing Stop';document.getElementById('fTrail').disabled=S.noTrail;if(S.noTrail)document.getElementById('fTrail').value='';}
function toggleDCA(){S.dcaMode=!S.dcaMode;document.getElementById('dcaBtn').classList.toggle('on-green',S.dcaMode);document.getElementById('dcaBtn').textContent=(S.dcaMode?'☑':'☐')+' DCA Mode — buy more on dip';document.getElementById('dcaFields').style.display=S.dcaMode?'':'none';}
function toggleCopySell(){S.copySell=!S.copySell;document.getElementById('copySellBtn').classList.toggle('on-green',S.copySell);document.getElementById('copySellBtn').textContent=(S.copySell?'☑':'☐')+' Copy Sell — mirror target sells';}

function updAlloc(){
  var amt=parseFloat(document.getElementById('fAmt').value)||0,tok=parseInt(document.getElementById('fToks').value)||0;
  var box=document.getElementById('allocBox');
  if(amt>0&&tok>0){
    var per=amt/tok;
    document.getElementById('allocVal').textContent=per.toFixed(4)+' '+S.currency;
    var sub='';
    if(S.currency==='SOL'&&S.solPrice>0) sub='≈$'+(per*S.solPrice).toFixed(2)+' USD';
    else if(S.currency==='USD'&&S.solPrice>0) sub='≈'+(per/S.solPrice).toFixed(4)+' SOL';
    document.getElementById('allocSub').textContent=sub;box.style.display='flex';
  }else{box.style.display='none';}
}

function addBlacklist(){
  var v=document.getElementById('fBlInput').value.trim();
  if(!SOL_RE.test(v)){toast('Invalid mint address','err');return;}
  if(S.blacklistBuf.includes(v)){toast('Already in list','inf');return;}
  S.blacklistBuf.push(v);document.getElementById('fBlInput').value='';renderBlacklistTags();
}
function removeBlacklist(mint){S.blacklistBuf=S.blacklistBuf.filter(function(m){return m!==mint;});renderBlacklistTags();}
function renderBlacklistTags(){
  document.getElementById('blTags').innerHTML=S.blacklistBuf.map(function(m){
    return '<span class="bl-tag">'+m.slice(0,8)+'…<button onclick="removeBlacklist(\\''+m+'\\')">×</button></span>';
  }).join(' ');
}

function savePreset(){
  if(!S.connected){toast('Connect wallet first','err');return;}
  var name=document.getElementById('fName').value.trim();
  var tw=document.getElementById('fWallet').value.trim();
  var amt=parseFloat(document.getElementById('fAmt').value);
  var tok=parseInt(document.getElementById('fToks').value);
  var cl=parseFloat(document.getElementById('fCL').value);
  var tp=parseFloat(document.getElementById('fTP').value);
  var trail=parseFloat(document.getElementById('fTrail').value);
  var minSOL=parseFloat(document.getElementById('fMinSOL').value)||0;
  var dcaTrig=parseFloat(document.getElementById('fDcaTrig').value)||10;
  var dcaMult=parseFloat(document.getElementById('fDcaMult').value)||1.5;
  var dcaMax=parseInt(document.getElementById('fDcaMax').value)||3;

  if(!name){toast('Name required','err');return;}
  if(!SOL_RE.test(tw)){toast('Invalid Solana address (Base58, 32–44 chars)','err');return;}
  if(isNaN(amt)||amt<=0||amt>1000){toast('Amount: 0.001–1000','err');return;}
  if(isNaN(tok)||tok<1||tok>50){toast('Tokens: 1–50','err');return;}
  if(!S.noCL&&(isNaN(cl)||cl<1||cl>99)){toast('Cutloss 1–99 or toggle None','err');return;}
  if(!S.noTP&&!isNaN(tp)&&(tp<1||tp>9999)){toast('Take profit 1–9999','err');return;}
  if(!S.noTrail&&!isNaN(trail)&&(trail<1||trail>99)){toast('Trailing stop 1–99','err');return;}

  var data={
    name,targetWallet:tw,amount:amt,currency:S.currency,tokens:tok,
    cutloss:S.noCL?null:cl,noCutloss:S.noCL,
    takeProfit:S.noTP?null:(isNaN(tp)?null:tp),noTakeProfit:S.noTP,
    trailPct:S.noTrail?null:(isNaN(trail)?null:trail),noTrail:S.noTrail,
    slippage:S.slippage,minTradeSize:minSOL,
    dcaMode:S.dcaMode,dcaTrig,dcaMult,dcaMax,
    copySell:S.copySell,blacklist:S.blacklistBuf.slice()
  };

  if(S.editId){
    var idx=S.presets.findIndex(function(p){return p.id===S.editId;});
    if(idx>-1){Object.assign(S.presets[idx],data);toast('Updated: '+name,'ok');addLog('Preset updated: '+name,'inf');}
  }else{
    S.presets.push(Object.assign({id:'p_'+Date.now(),status:'idle',createdAt:Date.now()},data));
    toast('Saved: '+name,'ok');addLog('Preset saved: '+name,'inf');
  }
  savePresets();renderPresets();closeForm();
}

/* ══ RENDER PRESETS ══ */
function renderPresets(){
  var list=document.getElementById('pList');
  document.getElementById('pCountBadge').textContent=S.presets.length+' / 100';
  if(!S.presets.length){list.innerHTML='<div class="pempty">♦ No presets yet<br><span style="font-size:.42rem;opacity:.5">Connect wallet &amp; create a preset</span></div>';return;}
  var h='';
  S.presets.forEach(function(p){
    var sc=p.status==='running'?'running':p.status==='stopped'?'stopped':'idle';
    var sl=p.status==='running'?'● Running':p.status==='stopped'?'○ Stopped':'○ Idle';
    var al=p.amount+(p.currency==='SOL'?' SOL':' USD');
    var cl=p.noCutloss?'No CL':'CL−'+p.cutloss+'%';
    var tp=(!p.noTakeProfit&&p.takeProfit)?'TP+'+p.takeProfit+'%':'';
    var tr=(!p.noTrail&&p.trailPct)?'Trail−'+p.trailPct+'%':'';
    var extras='';
    if(p.dcaMode) extras+='<span class="pi-m t">DCA</span>';
    if(p.copySell) extras+='<span class="pi-m t">CopySell</span>';
    if(p.blacklist&&p.blacklist.length) extras+='<span class="pi-m">BL:'+p.blacklist.length+'</span>';
    h+='<div class="pitem '+(p.status==='running'?'running':'')+'">';
    h+='<div class="pi-r1"><div class="pi-name">'+esc(p.name)+'</div><div class="pi-st '+sc+'">'+sl+'</div></div>';
    h+='<div class="pi-wallet">'+p.targetWallet+'</div>';
    h+='<div class="pi-r2"><div class="pi-m"><b>'+al+'</b></div><div class="pi-m"><b>'+p.tokens+'</b>toks</div><div class="pi-m">'+cl+'</div>'+(tp?'<div class="pi-m g">'+tp+'</div>':'')+(tr?'<div class="pi-m gold">'+tr+'</div>':'')+'<div class="pi-m">'+(p.slippage||50)/100+'%slip</div>'+extras+'</div>';
    h+='<div class="pi-acts">';
    if(p.status!=='running') h+='<button class="btn-run" onclick="runPreset(\\''+p.id+'\\')" '+(S.connected?'':'disabled')+'>▶ Run</button>';
    else h+='<button class="btn-stop" onclick="openStop(\\''+p.id+'\\')">■ Stop</button>';
    h+='<button class="btn-edit" onclick="openEditForm(\\''+p.id+'\\')">✎</button>';
    h+='<button class="btn-del" onclick="openDel(\\''+p.id+'\\')">✕</button>';
    h+='</div></div>';
  });
  list.innerHTML=h;
}

/* ══ RUN / STOP / DELETE ══ */
function runPreset(id){
  if(!S.connected){toast('Connect wallet first','err');return;}
  if(!S.wsAlive){toast('Worker not connected','err');return;}
  var p=S.presets.find(function(x){return x.id===id;});if(!p) return;
  p.status='running';savePresets();renderPresets();
  S.ws.send(JSON.stringify({type:'watch',wallet:p.targetWallet}));
  toast('"'+p.name+'" started','ok');addLog('Started: '+p.name+' → '+shortAddr(p.targetWallet),'inf');
}
function openStop(id){var p=S.presets.find(function(x){return x.id===id;});if(!p)return;S.pendStop=id;document.getElementById('stopTxt').textContent='Stop "'+p.name+'"? Positions stay open.';document.getElementById('stopModal').classList.add('show');}
function closeStop(){document.getElementById('stopModal').classList.remove('show');S.pendStop=null;}
function confirmStop(){
  var p=S.presets.find(function(x){return x.id===S.pendStop;});
  if(p){
    p.status='stopped';savePresets();toast('Stopped: '+p.name,'inf');addLog('Stopped: '+p.name,'inf');renderPresets();
    // BUG FIX: hanya unwatch wallet jika tidak ada preset lain running di wallet yang sama
    var stillNeeded=S.presets.some(function(x){return x.id!==p.id&&x.status==='running'&&x.targetWallet===p.targetWallet;});
    if(!stillNeeded&&S.ws) S.ws.send(JSON.stringify({type:'unwatch',wallet:p.targetWallet}));
  }
  closeStop();
}
function openDel(id){var p=S.presets.find(function(x){return x.id===id;});if(!p)return;S.pendDel=id;document.getElementById('delTxt').textContent='Delete "'+p.name+'"?';document.getElementById('delModal').classList.add('show');}
function closeDel(){document.getElementById('delModal').classList.remove('show');S.pendDel=null;}
function confirmDel(){S.presets=S.presets.filter(function(x){return x.id!==S.pendDel;});savePresets();toast('Deleted','inf');renderPresets();closeDel();}

/* ══ TABS ══ */
function switchTab(name,el){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.tab-panel').forEach(function(t){t.classList.remove('on');});
  el.classList.add('on');
  document.getElementById('tab'+name).classList.add('on');
}

/* ══ RENDER TRADES ══ */
function renderTrades(){
  var body=document.getElementById('tblBody');
  if(!S.positions.length){body.innerHTML='<div class="tbl-empty">♦ No active positions<br><span style="font-size:.43rem;opacity:.5">Run a preset to start</span></div>';return;}
  var h='';
  S.positions.slice().sort(function(a,b){return b.buyTime-a.buyTime;}).forEach(function(pos){
    var pnlA=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
    var pnlP=(pos.curPrice-pos.buyPrice)/pos.buyPrice*100;
    var pc=pnlA>0.0001?'pos':pnlA<-0.0001?'neg':'zero';
    var ind='';
    if(pos.dcaEnabled&&pos.dcaCount>0) ind+='<span class="dca-dot" title="DCA round '+pos.dcaCount+'/'+pos.dcaMax+'"></span>';
    if(!pos.noTrail&&pos.trailPct) ind+='<span class="trail-dot" title="Trail peak: $'+fmtP(S.peakPrices[pos.id]||pos.buyPrice)+'"></span>';
    h+='<div class="tbl-row">';
    h+='<div>'+ind+'<span class="tr-tick">'+esc(pos.ticker)+'</span>';
    h+='<div class="tr-preset">'+esc(pos.presetName)+'</div>';
    if(pos.buyTx) h+='<a href="https://solscan.io/tx/'+pos.buyTx+'" target="_blank" class="tx-link">'+shortAddr(pos.buyTx)+'↗</a>';
    h+='<div class="tr-age">'+fmtAge(Date.now()-pos.buyTime)+'</div></div>';
    h+='<div class="tr-price">$'+fmtP(pos.buyPrice)+'</div>';
    h+='<div class="tr-price">$'+fmtP(pos.curPrice)+'</div>';
    h+='<div class="tr-usd">$'+pos.invested.toFixed(2)+'</div>';
    h+='<div class="pv '+pc+'">'+(pnlA>=0?'+':'')+pnlA.toFixed(2)+'</div>';
    h+='<div class="pv '+pc+'" style="font-size:.6rem">'+(pnlP>=0?'+':'')+pnlP.toFixed(1)+'%</div>';
    h+='<button class="btn-sell'+(S.sellingIds.has(pos.id)?' pending':'')+'" onclick="openSell(\\''+pos.id+'\\')">Sell</button>';
    h+='</div>';
  });
  body.innerHTML=h;
}

/* ══ RENDER HISTORY ══ */
function renderHistory(){
  var body=document.getElementById('histBody');
  if(!S.history.length){body.innerHTML='<div class="tbl-empty">♦ No closed positions yet</div>';return;}
  var h='';
  S.history.slice(0,100).forEach(function(rec){
    var pc=rec.pnl>0.001?'pos':rec.pnl<-0.001?'neg':'zero';
    h+='<div class="hist-row">';
    h+='<div><div class="tr-tick">'+esc(rec.ticker)+'</div><div class="tr-preset">'+esc(rec.presetName)+'</div><div class="tr-age">'+fmtTime(new Date(rec.time))+'</div></div>';
    h+='<div class="tr-price">$'+fmtP(rec.buyPrice)+'</div>';
    h+='<div class="tr-price">$'+fmtP(rec.sellPrice)+'</div>';
    h+='<div class="tr-usd">$'+rec.invested.toFixed(2)+'</div>';
    h+='<div class="pv '+pc+'">'+(rec.pnl>=0?'+':'')+rec.pnl.toFixed(2)+'</div>';
    h+='<div style="font-family:\\'Share Tech Mono\\',monospace;font-size:.4rem;color:var(--muted)">'+esc(rec.reason)+'</div>';
    h+='</div>';
  });
  body.innerHTML=h;
}

/* ══ SELL MODAL ══ */
function openSell(posId){
  var pos=S.positions.find(function(p){return p.id===posId;});if(!pos) return;
  S.pendSell=posId;
  var pnl=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
  document.getElementById('sellTxt').textContent='Close '+esc(pos.ticker)+' via Jupiter market sell?';
  document.getElementById('sellDetail').textContent=pos.ticker+' | Inv: $'+pos.invested.toFixed(2)+' | Now: $'+fmtP(pos.curPrice)+' | PnL: '+fmtPnl(pnl);
  // BUG FIX: reset button text and state saat modal dibuka
  var btn=document.getElementById('sellConfirmBtn');btn.disabled=false;btn.textContent='Confirm Sell';
  document.getElementById('sellModal').classList.add('show');
}
function closeSell(){
  document.getElementById('sellModal').classList.remove('show');
  // BUG FIX: reset button saat modal ditutup
  var btn=document.getElementById('sellConfirmBtn');btn.disabled=false;btn.textContent='Confirm Sell';
  S.pendSell=null;
}
async function confirmSell(){
  var pos=S.positions.find(function(p){return p.id===S.pendSell;});
  if(!pos){closeSell();return;}
  var btn=document.getElementById('sellConfirmBtn');btn.disabled=true;btn.textContent='Signing…';
  var ok=await executeSell(pos,btn);
  if(ok){
    var pnl=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
    S.history.unshift({id:pos.id,ticker:pos.ticker,mint:pos.mint,presetName:pos.presetName,
      buyPrice:pos.buyPrice,sellPrice:pos.curPrice,invested:pos.invested,pnl,reason:'Manual Sell',time:Date.now()});
    if(S.history.length>500) S.history.length=500;
    saveHistory();
    S.positions=S.positions.filter(function(p){return p.id!==S.pendSell;});
    delete S.peakPrices[S.pendSell];
    savePositions();renderTrades();renderHistory();updateSummary();
  }
  // BUG FIX: reset button text sebelum closeSell
  btn.textContent='Confirm Sell';
  closeSell();
}

/* ══ SUMMARY ══ */
function updateSummary(){
  var inv=0,cur=0;
  S.positions.forEach(function(p){inv+=p.invested;cur+=p.invested*(p.curPrice/p.buyPrice);});
  var pnl=cur-inv;
  document.getElementById('sInvested').textContent='$'+inv.toFixed(2);
  document.getElementById('sValue').textContent='$'+cur.toFixed(2);
  var el=document.getElementById('sPnl');
  el.textContent=(pnl>=0?'+':'')+pnl.toFixed(2);
  el.className='pnl-num '+(pnl>0.001?'pos':pnl<-0.001?'neg':'');
  document.getElementById('sPos').textContent=S.positions.length;
}

/* ══ EXPORT CSV ══ */
function exportCSV(){
  var rows=[['Token','Preset','Buy Price','Current Price','Invested USD','PnL USD','PnL %','Age','TX']];
  S.positions.forEach(function(pos){
    var pnlA=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
    var pnlP=(pos.curPrice-pos.buyPrice)/pos.buyPrice*100;
    rows.push([pos.ticker,pos.presetName,pos.buyPrice,pos.curPrice,pos.invested.toFixed(2),pnlA.toFixed(2),pnlP.toFixed(2)+'%',fmtAge(Date.now()-pos.buyTime),pos.buyTx||'']);
  });
  dlCSV(rows,'allin_positions_'+Date.now()+'.csv');
}
function exportHistCSV(){
  var rows=[['Token','Preset','Buy Price','Sell Price','Invested USD','PnL USD','Reason','Time']];
  S.history.forEach(function(r){rows.push([r.ticker,r.presetName,r.buyPrice,r.sellPrice,r.invested.toFixed(2),r.pnl.toFixed(2),r.reason,new Date(r.time).toISOString()]);});
  dlCSV(rows,'allin_history_'+Date.now()+'.csv');
}
function dlCSV(rows,fname){
  var csv=rows.map(function(r){return r.map(function(c){return'"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\\n');
  var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);a.download=fname;a.click();
}

/* ══ LOG ══ */
function addLog(msg,type){S.logs.unshift({time:Date.now(),msg,type});if(S.logs.length>300)S.logs.length=300;renderLog();}
function renderLog(){
  var w=document.getElementById('logWrap');
  if(!S.logs.length){w.innerHTML='<div class="log-empty">Waiting for activity...</div>';return;}
  var h='';
  S.logs.slice(0,120).forEach(function(l){
    var badge=l.type==='buy'?'<span class="lbadge lb-buy">BUY</span>':
              l.type==='sell'?'<span class="lbadge lb-sell">SELL</span>':
              l.type==='warn'?'<span class="lbadge lb-warn">WARN</span>':
              l.type==='dca'?'<span class="lbadge lb-dca">DCA</span>':
              '<span class="lbadge lb-info">INFO</span>';
    h+='<div class="lrow"><span class="ltime">'+fmtTime(new Date(l.time))+'</span><span class="lmsg">'+esc(l.msg)+'</span>'+badge+'</div>';
  });
  w.innerHTML=h;
}
function clearLog(){S.logs=[];renderLog();}

/* ══ TOAST ══ */
function toast(msg,type){
  var w=document.getElementById('toastWrap');
  var el=document.createElement('div');el.className='toast '+(type||'inf');
  el.innerHTML='<span>'+(type==='ok'?'✔':type==='err'?'✕':type==='dca'?'⟳':'●')+'</span> '+esc(msg);
  w.appendChild(el);
  setTimeout(function(){el.classList.add('out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},280);},3800);
}

/* ══ UTILS ══ */
function shortAddr(a){if(!a||a.length<8)return a||'';return a.slice(0,4)+'…'+a.slice(-4);}
function fmtP(p){if(!p||isNaN(p))return'0';if(p>=100)return p.toFixed(2);if(p>=1)return p.toFixed(4);if(p>=0.01)return p.toFixed(6);if(p>=0.0001)return p.toFixed(8);return p.toExponential(3);}
function fmtAge(ms){var s=Math.floor(ms/1000);if(s<60)return s+'s';if(s<3600)return Math.floor(s/60)+'m';return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m';}
function fmtTime(d){return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')+':'+d.getSeconds().toString().padStart(2,'0');}
function fmtPnl(v){return(v>=0?'+':'')+v.toFixed(2);}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function b64ToU8(b64){var bin=atob(b64);var a=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
function u8ToB64(arr){var bin='';arr.forEach(function(b){bin+=String.fromCharCode(b);});return btoa(bin);}
function delay(ms){return new Promise(function(r){setTimeout(r,ms);});}

/* ══ INIT ══ */
window.addEventListener('load',function(){
  // Restore persisted data
  var sp=lsLoad('allin_presets');
  if(sp&&Array.isArray(sp)){sp.forEach(function(p){if(p.status==='running') p.status='stopped';});S.presets=sp;}
  var spos=lsLoad('allin_positions');
  if(spos&&Array.isArray(spos)){S.positions=spos;spos.forEach(function(p){S.peakPrices[p.id]=p.curPrice||p.buyPrice;});}
  var shist=lsLoad('allin_history');
  if(shist&&Array.isArray(shist)) S.history=shist;
  var sfl=lsLoad('allin_fee_level');
  if(sfl!==null&&typeof sfl==='number') S.priorityLevel=sfl;

  // Mobile banner
  if(ENV.mob&&!ENV.inPh){
    var bn=document.getElementById('mobBanner');bn.style.display='block';
    var dl=deepLink(),ul=uniLink();
    bn.innerHTML=ENV.andr?
      '📱 Android: <a href="'+dl+'">Open in Phantom App</a> · <a href="https://play.google.com/store/apps/details?id=app.phantom" target="_blank">Install</a>':
      '📱 iOS: <a href="'+ul+'">Open in Phantom App</a> · <a href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977" target="_blank">Install</a>';
  }

  // Auto-reconnect wallet
  var prov=getProvider();
  if(prov&&prov.isConnected===true&&prov.publicKey){
    S.connected=true;S.addr=prov.publicKey.toString();
    onConnected(S.addr);fetchBal(S.addr);
    try{prov.on('accountChanged',function(pk){if(pk){S.addr=pk.toString();onConnected(S.addr);fetchBal(S.addr);}else doDisconnect();});prov.on('disconnect',doDisconnect);}catch(e){}
  }

  connectWS();
  fetchSolPrice();
  fetchPriorityFee();
  updateFeeBadge();
  setInterval(fetchSolPrice,60000);
  setInterval(refreshPrices,15000);
  setInterval(fetchPriorityFee,120000);
  setInterval(function(){if(S.connected&&S.addr) fetchBal(S.addr);},30000);
  setInterval(function(){if(S.ws&&S.ws.readyState===WebSocket.OPEN) S.ws.send(JSON.stringify({type:'ping'}));},25000);

  renderPresets();renderLog();renderHistory();updateSummary();
  addLog('#ALL-IN Leorningcild Copy Trading v3 — ready','inf');
  if(S.positions.length) addLog('Restored '+S.positions.length+' position(s)','inf');
  if(S.presets.length)   addLog('Loaded '+S.presets.length+' preset(s)','inf');
  if(!ENV.mob&&!ENV.ext&&!ENV.inPh) addLog('Phantom not detected — install at phantom.app','warn');
  if(ENV.mob&&!ENV.inPh) addLog('Mobile: open inside Phantom App to connect','warn');
});
</script>
</body>
</html>
`, {
          headers: { 'Content-Type': 'text/html;charset=utf-8' },
        });
      }

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

// ─── WEBSOCKET ───────────────────────────────────────────────────────────
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

  // Gunakan Helius jika HELIUS_KEY tersedia di env
  const rpcHttp  = env.HELIUS_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_KEY}`
    : CFG.RPC_HTTP;
  const rpcWsUrl = env.HELIUS_KEY
    ? `wss://mainnet.helius-rpc.com/?api-key=${env.HELIUS_KEY}`
    : CFG.RPC_WS;

  let rpcWs     = null;
  let alive     = true;
  let watchSet  = new Set();   // wallet address yang sedang dimonitor
  let sigSeen   = new Set();   // dedup signature
  let reconTimer = null;

  const send = obj => { try { server.send(JSON.stringify(obj)); } catch (_) {} };

  // ── Parse getTransaction, cari token yang balance berubah ──
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

      // Transaksi belum diproses validator — retry hingga 5x
      if (!d.result) {
        if (attempt < 5) { await sleep(2500); return parseTx(sig, attempt + 1); }
        return [];
      }

      const tx   = d.result;
      const meta = tx.meta;
      if (!meta || meta.err) return [];

      // Map preTokenBalances berdasarkan accountIndex
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
        // Hitung SOL yang digunakan wallet target
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
            // Token bertambah = BUY
            events.push({ wallet, mint: post.mint, action: 'buy', amountInSol, sig });
          } else if (after < pre - 0.000001 && pre > 0) {
            // Token berkurang = SELL
            const pct = Math.round(((pre - after) / pre) * 100);
            events.push({ wallet, mint: post.mint, action: 'sell', sellPct: pct, amountInSol: 0, sig });
          }
        }
      }
      return events;
    } catch (_) { return []; }
  }

  // ── Subscribe wallet ke logsSubscribe ──
  function subscribeWallet(wallet) {
    if (!rpcWs || rpcWs.readyState !== WebSocket.OPEN) return;
    rpcWs.send(JSON.stringify({
      jsonrpc: '2.0', id: Date.now(),
      method : 'logsSubscribe',
      params : [{ mentions: [wallet] }, { commitment: 'confirmed' }],
    }));
  }

  // ── Connect ke Solana RPC WebSocket ──
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

      // Konfirmasi subscription berhasil
      if (typeof msg.result === 'number' && msg.id) {
        send({ type: 'subscribed', subId: msg.result });
        return;
      }
      if (msg.method !== 'logsNotification') return;

      const val  = msg.params?.result?.value;
      if (!val) return;
      const sig  = val.signature;
      const logs = val.logs || [];

      // Dedup — skip signature yang sudah diproses
      if (sigSeen.has(sig)) return;
      sigSeen.add(sig);
      if (sigSeen.size > 500) sigSeen.clear(); // cegah memory leak

      // Filter: hanya proses log yang terlihat seperti swap/token transfer
      const isRelevant = logs.some(l =>
        l.includes('Program JUP') ||
        l.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') ||
        l.includes('swap') || l.includes('Swap') ||
        l.includes('Transfer')
      );
      if (!isRelevant) return;

      // BUG FIX: ctx diteruskan dari main fetch handler melalui closure
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

  // ── Terima pesan dari frontend client ──
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

    // BUG FIX: unwatch per-wallet, bukan unwatch_all sekaligus
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

// ─── API HANDLERS ────────────────────────────────────────────────────────

async function apiSolPrice(orig) {
  // Fallback chain: Binance (lebih cepat) → CoinGecko
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
  // Teruskan semua params (termasuk slippageBps, platformFeeBps, feeAccount)
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

  // Cek KV cache dulu
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
    // Simpan ke KV dengan TTL 24 jam
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
