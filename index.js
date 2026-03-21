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
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>#ALL-IN Leorningcild — Copy Trading</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,700;1,400;1,700&family=Barlow+Condensed:wght@300;400;600;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">

<!--
  ════════════════════════════════════════════════════════
  EXTERNAL DEPENDENCIES (loaded from CDN)
  • @solana/web3.js  — sign & send transactions
  ════════════════════════════════════════════════════════
-->
<script src="https://unpkg.com/@solana/web3.js@1.91.8/lib/index.iife.min.js"></script>

<style>
/* ═══════════════ DESIGN TOKENS ═══════════════ */
:root{
  --void:#02040a;--deep:#060d14;
  --gold:#d4a853;--gold-bright:#f5c842;--gold-dim:rgba(212,168,83,.18);
  --red:#b31b1b;--red2:#d42020;--red-glow:rgba(179,27,27,.4);
  --green:#1a5e2a;--green2:#27a045;
  --cream:#ede8dc;--dim:rgba(237,232,220,.45);--muted:rgba(237,232,220,.22);
  --teal:#63cab7;--phantom:#ab9ff2;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:var(--void);color:var(--cream);font-family:'Barlow Condensed',sans-serif;overflow-x:hidden;min-height:100vh}
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  opacity:.028;mix-blend-mode:overlay}

/* ─ TICKER ─ */
:root{--ticker-h:28px;--nav-h:52px;--worker-h:26px;--header-offset:calc(var(--ticker-h) + var(--nav-h) + var(--worker-h))}
.ticker{position:fixed;top:0;left:0;right:0;z-index:600;height:var(--ticker-h);background:var(--red);overflow:hidden;display:flex;align-items:center;border-bottom:1px solid rgba(212,168,83,.2)}
.t-inner{display:flex;animation:tickrun 50s linear infinite;white-space:nowrap;flex-shrink:0}
.ti{font-family:'Share Tech Mono',monospace;font-size:.6rem;letter-spacing:.08em;color:rgba(237,232,220,.85);padding:0 1.4rem;display:inline-flex;align-items:center;gap:.35rem}
.ti b{color:var(--gold-bright)}.tsep{color:rgba(212,168,83,.4)}
@keyframes tickrun{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ─ NAV ─ */
nav{position:fixed;top:var(--ticker-h);left:0;right:0;z-index:599;display:flex;align-items:center;justify-content:space-between;padding:.55rem 1rem;background:rgba(2,4,10,.95);border-bottom:1px solid rgba(212,168,83,.1);backdrop-filter:blur(20px);box-sizing:border-box}
.nav-logo{font-family:'Libre Baskerville',serif;font-style:italic;font-weight:700;font-size:.9rem;letter-spacing:.02em;color:var(--gold);display:flex;align-items:center;gap:.3rem;text-decoration:none;min-width:0;flex-shrink:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nav-badge{font-family:'Barlow Condensed',sans-serif;font-style:normal;font-weight:700;font-size:.38rem;letter-spacing:.1em;text-transform:uppercase;padding:.14rem .38rem;border:1px solid rgba(212,168,83,.22);color:var(--gold);background:rgba(212,168,83,.05);white-space:nowrap;flex-shrink:0}
.ph-btn{display:inline-flex;align-items:center;gap:.3rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;padding:.38rem .65rem;background:transparent;color:var(--cream);border:1px solid rgba(171,159,242,.35);cursor:pointer;transition:all .22s;flex-shrink:0;white-space:nowrap}
.ph-btn img{width:20px;height:20px;border-radius:5px;flex-shrink:0}
.ph-btn:hover{border-color:var(--phantom);background:rgba(171,159,242,.08)}
.ph-btn.connected{border-color:rgba(61,220,106,.35);background:rgba(26,94,42,.1);color:#3ddc6a}
.ph-btn.connecting{opacity:.55;cursor:wait;pointer-events:none}

/* ─ WORKER STATUS BAR ─ */
.worker-bar{background:rgba(6,13,20,.9);border-bottom:1px solid rgba(212,168,83,.05);padding:.22rem 1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:nowrap;position:fixed;top:calc(var(--ticker-h) + var(--nav-h));left:0;right:0;z-index:598;overflow:hidden}
.wb-item{display:flex;align-items:center;gap:.3rem;font-family:'Share Tech Mono',monospace;font-size:.44rem;letter-spacing:.04em;color:rgba(237,232,220,.28);white-space:nowrap;flex-shrink:0}
.wb-item .dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.dot-ok{background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite}
.dot-err{background:#ff6b6b}
.dot-wait{background:rgba(237,232,220,.22);animation:blink 1.2s ease-in-out infinite}
@keyframes pdot{0%,100%{box-shadow:0 0 0 0 rgba(61,220,106,.5)}60%{box-shadow:0 0 0 4px transparent}}
@keyframes blink{0%,100%{opacity:.3}50%{opacity:1}}

/* ─ PAGE HEADER ─ */
.page-header{padding:calc(var(--header-offset) + 1.8rem) 1.2rem 1.6rem;max-width:1200px;margin:0 auto;box-sizing:border-box;width:100%}
.eyebrow{display:flex;align-items:center;gap:.7rem;margin-bottom:.7rem}
.eyebrow-line{width:22px;height:1px;background:var(--teal)}
.eyebrow-txt{font-size:.46rem;font-weight:700;letter-spacing:.14em;color:var(--teal);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.page-title{font-family:'Libre Baskerville',serif;font-weight:700;font-style:italic;font-size:clamp(.95rem,4.5vw,3.2rem);color:var(--cream);line-height:1.1;margin-bottom:.65rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.page-title span{color:var(--gold)}
.page-desc{font-size:.68rem;font-weight:300;letter-spacing:.04em;line-height:1.9;color:var(--dim);max-width:540px}
.wallet-notice{margin-top:1.1rem;display:inline-flex;align-items:center;gap:.55rem;padding:.5rem .9rem;border:1px dashed rgba(171,159,242,.22);background:rgba(171,159,242,.04);font-size:.56rem;font-weight:600;letter-spacing:.12em;color:rgba(171,159,242,.6);text-transform:uppercase;max-width:100%;box-sizing:border-box;flex-wrap:wrap}
.wallet-notice img{width:15px;height:15px;border-radius:4px;flex-shrink:0}

/* ─ MOBILE BANNER ─ */
.mob-banner{display:none;padding:.6rem 1rem;border:1px solid rgba(171,159,242,.2);background:rgba(171,159,242,.05);font-size:.6rem;font-weight:600;letter-spacing:.06em;color:rgba(171,159,242,.8);line-height:2}
.mob-banner a{color:var(--phantom);text-decoration:none;border-bottom:1px solid rgba(171,159,242,.3)}
/* ─ MOBILE OVERFLOW FIX ─ */
@media(max-width:520px){
  :root{--nav-h:46px;--worker-h:24px}
  nav{padding:.45rem .75rem}
  .nav-logo{font-size:.82rem}
  .nav-badge{font-size:.34rem;letter-spacing:.08em;padding:.12rem .3rem}
  .ph-btn{font-size:.52rem;letter-spacing:.06em;padding:.32rem .55rem}
  .ph-btn img{width:15px;height:15px}
  .page-title{font-size:clamp(.85rem,4.2vw,2rem)}
  .eyebrow-txt{letter-spacing:.1em;font-size:.44rem}
  .worker-bar{padding:.18rem .75rem;gap:.5rem}
  .wb-item{font-size:.4rem}
  .page-header{padding:calc(var(--header-offset) + 1.4rem) .85rem 1.2rem}
  .app-wrap{padding:0 .85rem 4rem}
}

/* ─ LAYOUT ─ */
.app-wrap{max-width:1200px;margin:0 auto;padding:0 1.5rem 4rem;display:grid;grid-template-columns:1fr;gap:1.4rem}
@media(min-width:880px){.app-wrap{grid-template-columns:340px 1fr}}

/* ─ PANEL ─ */
.panel{border:1px solid rgba(212,168,83,.11);background:rgba(6,13,20,.82);position:relative;overflow:hidden}
.panel::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.7}
.c{position:absolute;width:9px;height:9px;border-color:rgba(212,168,83,.22);border-style:solid}
.c.tl{top:0;left:0;border-width:1px 0 0 1px}.c.tr{top:0;right:0;border-width:1px 1px 0 0}
.c.bl{bottom:0;left:0;border-width:0 0 1px 1px}.c.br{bottom:0;right:0;border-width:0 1px 1px 0}
.panel-head{padding:.85rem 1rem;border-bottom:1px solid rgba(212,168,83,.06);display:flex;align-items:center;justify-content:space-between;background:rgba(212,168,83,.015)}
.panel-title{font-size:.58rem;font-weight:700;letter-spacing:.26em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;gap:.45rem}
.panel-count{font-family:'Share Tech Mono',monospace;font-size:.52rem;padding:.12rem .5rem;border:1px solid rgba(212,168,83,.16);color:var(--gold);background:rgba(212,168,83,.03)}

/* ─ WALLET BAR ─ */
.wbar{border:1px solid rgba(212,168,83,.09);background:rgba(2,4,10,.72);padding:.75rem 1.1rem;display:flex;align-items:center;gap:.85rem;flex-wrap:wrap;margin-bottom:1.3rem;position:relative}
.wbar::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,83,.16),transparent)}
.wbar img.wbar-logo{width:28px;height:28px;border-radius:8px;flex-shrink:0}
.wbar-info{flex:1;min-width:0}
.wbar-addr{font-family:'Share Tech Mono',monospace;font-size:.6rem;color:var(--cream);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wbar-addr.dim{color:rgba(237,232,220,.25)}
.wbar-net{font-family:'Share Tech Mono',monospace;font-size:.42rem;color:rgba(237,232,220,.2);margin-top:.08rem}
.wbar-bal{font-family:'Share Tech Mono',monospace;font-size:.65rem;color:var(--gold-bright);white-space:nowrap}
.wbar-btn{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.66rem;letter-spacing:.15em;text-transform:uppercase;padding:.48rem 1rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.14);cursor:pointer;display:inline-flex;align-items:center;gap:.4rem;transition:all .22s;flex-shrink:0}
.wbar-btn:hover{box-shadow:0 0 16px var(--red-glow)}
/* ─ BALANCE BREAKDOWN ─ */
.bal-panel{border:1px solid rgba(212,168,83,.09);background:rgba(2,4,10,.72);margin-bottom:1.3rem;display:none;position:relative;overflow:hidden}
.bal-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,83,.16),transparent)}
.bal-panel.show{display:block}
.bal-head{padding:.55rem 1rem;border-bottom:1px solid rgba(212,168,83,.06);font-size:.48rem;font-weight:700;letter-spacing:.22em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;justify-content:space-between}
.bal-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:rgba(212,168,83,.05)}
.bal-cell{background:var(--deep);padding:.7rem .75rem;text-align:center}
.bal-lbl{font-size:.42rem;font-weight:700;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-bottom:.22rem}
.bal-val{font-family:'Share Tech Mono',monospace;font-size:.72rem;color:var(--cream);display:block;word-break:break-all}
.bal-val.gold{color:var(--gold-bright)}
.bal-val.teal{color:var(--teal)}
.bal-sub{font-family:'Share Tech Mono',monospace;font-size:.42rem;color:var(--muted);margin-top:.12rem}
.bal-tokens{padding:.4rem .6rem;border-top:1px solid rgba(212,168,83,.06);max-height:280px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(212,168,83,.1) transparent}
.bal-tok-row{display:flex;align-items:center;justify-content:space-between;padding:.28rem 0;border-bottom:1px solid rgba(212,168,83,.03)}
.bal-tok-row:last-child{border-bottom:none}
.bal-tok-name{font-family:'Share Tech Mono',monospace;font-size:.5rem;color:var(--dim)}
.bal-tok-amt{font-family:'Share Tech Mono',monospace;font-size:.5rem;color:var(--gold);text-align:right}
.bal-tok-usd{font-family:'Share Tech Mono',monospace;font-size:.44rem;color:var(--muted);text-align:right}
.bal-empty{font-family:'Share Tech Mono',monospace;font-size:.46rem;color:var(--muted);text-align:center;padding:.6rem 0;letter-spacing:.08em}
.bal-refresh{background:transparent;border:none;font-family:'Share Tech Mono',monospace;font-size:.44rem;color:rgba(212,168,83,.3);cursor:pointer;transition:color .18s}
.bal-refresh:hover{color:var(--gold)}

/* ─ PRESET FORM ─ */
.pform{padding:.95rem 1rem;border-bottom:1px solid rgba(212,168,83,.06)}
.pform-title{font-size:.52rem;font-weight:700;letter-spacing:.22em;color:var(--teal);text-transform:uppercase;margin-bottom:.85rem;display:flex;align-items:center;gap:.45rem}
.pform-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(99,202,183,.18),transparent)}
.flabel{font-size:.48rem;font-weight:700;letter-spacing:.18em;color:var(--gold);text-transform:uppercase;display:block;margin-bottom:.28rem;opacity:.8}
.frow{margin-bottom:.7rem}
.finput{width:100%;font-family:'Share Tech Mono',monospace;font-size:.64rem;padding:.5rem .75rem;background:rgba(2,4,10,.85);color:var(--cream);border:1px solid rgba(212,168,83,.14);outline:none;transition:border-color .18s,box-shadow .18s;letter-spacing:.03em}
.finput::placeholder{color:rgba(237,232,220,.18)}
.finput:focus{border-color:rgba(212,168,83,.38);box-shadow:0 0 0 2px rgba(212,168,83,.05)}
.finput:disabled{opacity:.3;cursor:not-allowed}
.tg-wrap{display:flex;gap:.28rem;margin-bottom:.38rem}
.tg{flex:1;font-family:'Barlow Condensed',sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.42rem .4rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.1);cursor:pointer;transition:all .18s;text-align:center}
.tg:hover{color:var(--cream)}.tg.on{background:rgba(212,168,83,.1);color:var(--gold-bright);border-color:rgba(212,168,83,.38)}
.cl-wrap{display:flex;gap:.28rem;align-items:center;margin-bottom:.7rem}
.cl-rel{flex:1;position:relative}
.cl-unit{position:absolute;right:.65rem;top:50%;transform:translateY(-50%);font-family:'Share Tech Mono',monospace;font-size:.52rem;color:rgba(212,168,83,.45);pointer-events:none}
.nocl-btn{font-family:'Barlow Condensed',sans-serif;font-size:.56rem;font-weight:700;letter-spacing:.1em;padding:.42rem .7rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.1);cursor:pointer;transition:all .18s;white-space:nowrap;text-transform:uppercase}
.nocl-btn:hover{color:var(--cream)}.nocl-btn.on{background:rgba(212,168,83,.07);color:var(--gold);border-color:rgba(212,168,83,.28)}
.alloc-box{padding:.55rem .75rem;background:rgba(2,4,10,.65);border:1px solid rgba(212,168,83,.07);margin-bottom:.7rem;display:none;align-items:center;gap:.55rem;font-family:'Share Tech Mono',monospace;font-size:.56rem}
.alloc-arrow{color:rgba(212,168,83,.38)}.alloc-val{color:var(--gold-bright);font-size:.68rem}.alloc-sub{color:var(--muted);font-size:.48rem;margin-left:auto}
/* slippage */
.slip-row{display:flex;gap:.28rem;align-items:center;margin-bottom:.7rem}
.slip-label{font-size:.48rem;font-weight:700;letter-spacing:.14em;color:var(--gold);opacity:.7;text-transform:uppercase;white-space:nowrap}
.slip-btns{display:flex;gap:.2rem}
.slip-btn{font-family:'Share Tech Mono',monospace;font-size:.54rem;padding:.3rem .55rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.1);cursor:pointer;transition:all .18s}
.slip-btn.on{background:rgba(212,168,83,.1);color:var(--gold-bright);border-color:rgba(212,168,83,.38)}
.factions{display:flex;gap:.45rem;margin-top:.85rem}
.btn-save{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;padding:.65rem .9rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.14);cursor:pointer;transition:all .22s}
.btn-save:hover{box-shadow:0 0 18px var(--red-glow)}
.btn-cancel{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:.68rem;letter-spacing:.13em;text-transform:uppercase;padding:.65rem .9rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.09);cursor:pointer;transition:all .18s}
.btn-cancel:hover{color:var(--cream)}

/* ─ PRESET LIST ─ */
.plist{max-height:420px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(212,168,83,.14) transparent}
.plist::-webkit-scrollbar{width:3px}.plist::-webkit-scrollbar-thumb{background:rgba(212,168,83,.14)}
.pitem{padding:.75rem 1rem;border-bottom:1px solid rgba(212,168,83,.04);transition:background .18s;position:relative;display:flex;flex-direction:column;gap:.32rem}
.pitem:last-child{border-bottom:none}.pitem:hover{background:rgba(212,168,83,.018)}
.pitem.running{background:rgba(26,94,42,.035)}
.pitem.running::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--green2);opacity:.7}
.pi-r1{display:flex;align-items:center;gap:.55rem}
.pi-name{font-size:.68rem;font-weight:700;letter-spacing:.1em;color:var(--cream);text-transform:uppercase;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pi-st{font-size:.43rem;font-weight:700;letter-spacing:.14em;padding:.16rem .5rem;border-radius:2px;text-transform:uppercase;white-space:nowrap}
.pi-st.idle{color:rgba(237,232,220,.25);border:1px solid rgba(212,168,83,.06)}
.pi-st.running{color:#3ddc6a;background:rgba(26,94,42,.14);border:1px solid rgba(26,94,42,.22);animation:rblink 2s ease-in-out infinite}
.pi-st.stopped{color:#ff6b6b;background:rgba(179,27,27,.09);border:1px solid rgba(179,27,27,.18)}
@keyframes rblink{0%,100%{opacity:1}50%{opacity:.5}}
.pi-r2{display:flex;gap:.7rem;flex-wrap:wrap}
.pi-m{font-family:'Share Tech Mono',monospace;font-size:.46rem;color:var(--muted)}
.pi-m b{color:rgba(212,168,83,.6)}.pi-wallet{font-family:'Share Tech Mono',monospace;font-size:.44rem;color:rgba(237,232,220,.18)}
.pi-acts{display:flex;gap:.28rem;margin-top:.18rem}
.btn-run{font-family:'Barlow Condensed',sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.32rem .75rem;background:rgba(26,94,42,.14);color:#3ddc6a;border:1px solid rgba(26,94,42,.22);cursor:pointer;transition:all .18s}
.btn-run:hover{background:rgba(26,94,42,.28)}.btn-run:disabled{opacity:.3;cursor:not-allowed}
.btn-stop{font-family:'Barlow Condensed',sans-serif;font-size:.58rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.32rem .75rem;background:rgba(179,27,27,.1);color:#ff6b6b;border:1px solid rgba(179,27,27,.18);cursor:pointer;transition:all .18s}
.btn-stop:hover{background:rgba(179,27,27,.22)}
.btn-del{font-family:'Share Tech Mono',monospace;font-size:.58rem;padding:.32rem .5rem;background:transparent;color:rgba(237,232,220,.16);border:1px solid rgba(212,168,83,.05);cursor:pointer;transition:all .18s;margin-left:auto}
.btn-del:hover{color:#ff6b6b}
.pempty{padding:2.5rem 1rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.52rem;letter-spacing:.1em;color:var(--muted);line-height:2.2}

/* ─ RIGHT COL ─ */
.right-col{display:flex;flex-direction:column;gap:1.4rem}
.pnl-sum{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(212,168,83,.05);border:1px solid rgba(212,168,83,.07)}
@media(min-width:580px){.pnl-sum{grid-template-columns:repeat(4,1fr)}}
.pnl-cell{background:var(--deep);padding:.95rem .85rem;text-align:center}
.pnl-lbl{font-size:.44rem;font-weight:700;letter-spacing:.2em;color:var(--muted);text-transform:uppercase;margin-bottom:.32rem}
.pnl-num{font-family:'Share Tech Mono',monospace;font-size:clamp(.88rem,3.2vw,1.25rem);color:var(--cream);display:block}
.pnl-num.pos{color:#3ddc6a}.pnl-num.neg{color:#ff6b6b}.pnl-num.gold{color:var(--gold-bright)}

/* Trade table */
.tbl-wrap{overflow-x:auto}
.tbl-hdr,.tbl-row{display:grid;grid-template-columns:1fr 80px 80px 80px 95px 95px;gap:.25rem;padding:.5rem .9rem;min-width:530px}
.tbl-hdr{border-bottom:1px solid rgba(212,168,83,.06);background:rgba(212,168,83,.025)}
.tbl-hdr span{font-size:.42rem;font-weight:700;letter-spacing:.16em;color:var(--gold);opacity:.65;text-transform:uppercase}
.tbl-row{border-bottom:1px solid rgba(212,168,83,.035);align-items:center;transition:background .16s;animation:fadein .3s ease both}
.tbl-row:last-child{border-bottom:none}.tbl-row:hover{background:rgba(212,168,83,.018)}
@keyframes fadein{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
.tr-tick{font-size:.68rem;font-weight:700;letter-spacing:.09em;color:var(--cream)}
.tr-preset{font-size:.44rem;letter-spacing:.08em;color:var(--muted);margin-top:.08rem}
.tr-age{font-family:'Share Tech Mono',monospace;font-size:.42rem;color:rgba(237,232,220,.2)}
.tr-price{font-family:'Share Tech Mono',monospace;font-size:.62rem;color:var(--dim)}
.tr-usd{font-family:'Share Tech Mono',monospace;font-size:.7rem;color:var(--gold-bright)}
.pv{font-family:'Share Tech Mono',monospace;font-size:.75rem;font-weight:600}
.pv.pos{color:#3ddc6a}.pv.neg{color:#ff6b6b}.pv.zero{color:rgba(237,232,220,.28)}
.btn-sell{font-family:'Barlow Condensed',sans-serif;font-size:.56rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:.28rem .55rem;background:rgba(179,27,27,.09);color:#ff6b6b;border:1px solid rgba(179,27,27,.16);cursor:pointer;transition:all .18s;white-space:nowrap}
.btn-sell:hover{background:rgba(179,27,27,.22)}
/* pending state */
.btn-sell.pending{opacity:.5;cursor:wait;pointer-events:none}
.tbl-empty{padding:2.5rem 1rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.52rem;letter-spacing:.1em;color:var(--muted);line-height:2.2}

/* tx badge */
.tx-link{font-family:'Share Tech Mono',monospace;font-size:.42rem;color:rgba(212,168,83,.4);text-decoration:none;display:inline-block;margin-top:.1rem}
.tx-link:hover{color:var(--gold)}

/* Log */
.log-wrap{max-height:220px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(212,168,83,.09) transparent}
.log-wrap::-webkit-scrollbar{width:3px}.log-wrap::-webkit-scrollbar-thumb{background:rgba(212,168,83,.09)}
.lrow{padding:.48rem .9rem;border-bottom:1px solid rgba(212,168,83,.025);display:grid;grid-template-columns:58px 1fr auto;gap:.45rem;align-items:center;font-size:.48rem;letter-spacing:.04em;animation:fadein .28s ease both}
.lrow:last-child{border-bottom:none}
.ltime{font-family:'Share Tech Mono',monospace;color:rgba(237,232,220,.18)}
.lmsg{color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbadge{font-family:'Barlow Condensed',sans-serif;font-size:.52rem;font-weight:700;letter-spacing:.07em;padding:.1rem .38rem;border-radius:2px;white-space:nowrap}
.lb-buy{background:rgba(26,94,42,.18);color:#3ddc6a;border:1px solid rgba(26,94,42,.28)}
.lb-sell{background:rgba(179,27,27,.18);color:#ff6b6b;border:1px solid rgba(179,27,27,.28)}
.lb-info{background:rgba(212,168,83,.07);color:var(--gold);border:1px solid rgba(212,168,83,.14)}
.lb-warn{background:rgba(179,27,27,.07);color:rgba(237,232,220,.45);border:1px solid rgba(179,27,27,.1)}
.lb-ok{background:rgba(26,94,42,.14);color:#3ddc6a;border:1px solid rgba(26,94,42,.2)}
.log-empty{padding:1.4rem;text-align:center;font-family:'Share Tech Mono',monospace;font-size:.48rem;letter-spacing:.1em;color:var(--muted)}

/* ─ MODALS ─ */
.overlay{display:none;position:fixed;inset:0;z-index:800;background:rgba(2,4,10,.9);backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:1.2rem}
.overlay.show{display:flex}
.modal{width:100%;max-width:420px;border:1px solid rgba(212,168,83,.16);background:var(--deep);position:relative;overflow:hidden;animation:mshow .28s cubic-bezier(.16,1,.3,1) both}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
@keyframes mshow{from{opacity:0;transform:scale(.95) translateY(10px)}to{opacity:1;transform:none}}
.mhead{padding:.9rem 1.1rem;border-bottom:1px solid rgba(212,168,83,.06);display:flex;align-items:center;justify-content:space-between}
.mtitle{font-size:.62rem;font-weight:700;letter-spacing:.22em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;gap:.45rem}
.mtitle img{width:18px;height:18px;border-radius:4px}
.mclose{background:transparent;border:none;color:rgba(237,232,220,.28);cursor:pointer;font-size:1rem;line-height:1;padding:.18rem .38rem;transition:color .18s}
.mclose:hover{color:var(--cream)}
.mbody{padding:1.1rem}
.micon{text-align:center;margin-bottom:.9rem;font-size:2.2rem}
.mtext{font-size:.62rem;font-weight:300;letter-spacing:.04em;color:var(--dim);line-height:1.9;text-align:center;margin-bottom:.9rem}
.mdetail{padding:.65rem;background:rgba(212,168,83,.04);border:1px solid rgba(212,168,83,.1);font-family:'Share Tech Mono',monospace;font-size:.54rem;color:rgba(237,232,220,.55);margin-bottom:.9rem;text-align:center;word-break:break-all}
.mbtns{display:flex;gap:.45rem}
.mbtn-p{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;padding:.65rem;background:var(--red);color:#fff;border:1px solid rgba(212,168,83,.14);cursor:pointer;transition:all .22s}
.mbtn-p:hover{box-shadow:0 0 16px var(--red-glow)}.mbtn-p:disabled{opacity:.4;cursor:wait}
.mbtn-s{flex:1;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;padding:.65rem;background:transparent;color:var(--muted);border:1px solid rgba(212,168,83,.09);cursor:pointer;transition:all .18s}
.mbtn-s:hover{color:var(--cream)}
/* Phantom modal */
.ph-mbody{padding:1.2rem;text-align:center}
.ph-opts{display:flex;flex-direction:column;gap:.38rem;margin-top:.85rem}
.ph-opt{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;padding:.7rem 1rem;border:1px solid rgba(171,159,242,.2);background:rgba(171,159,242,.04);color:rgba(171,159,242,.88);cursor:pointer;transition:all .22s;display:flex;align-items:center;justify-content:center;gap:.55rem;text-decoration:none;width:100%}
.ph-opt:hover{background:rgba(171,159,242,.11);border-color:rgba(171,159,242,.45)}
.ph-opt.primary{background:var(--phantom);border-color:var(--phantom);color:#fff}
.ph-opt.primary:hover{background:#c2b6f5}
.ph-opt img{width:18px;height:18px;border-radius:4px}
.ph-div{display:flex;align-items:center;gap:.55rem;color:rgba(237,232,220,.18);font-size:.46rem;letter-spacing:.13em;margin:.05rem 0}
.ph-div::before,.ph-div::after{content:'';flex:1;height:1px;background:rgba(212,168,83,.07)}
.ph-note{font-family:'Share Tech Mono',monospace;font-size:.42rem;color:rgba(237,232,220,.16);margin-top:.9rem;line-height:1.9}

/* ─ TOAST ─ */
.toasts{position:fixed;bottom:1.3rem;right:1.3rem;z-index:900;display:flex;flex-direction:column;gap:.45rem;pointer-events:none}
.toast{font-family:'Share Tech Mono',monospace;font-size:.56rem;letter-spacing:.07em;padding:.55rem .9rem;border-left:2px solid;background:rgba(6,13,20,.97);backdrop-filter:blur(10px);display:flex;align-items:center;gap:.45rem;min-width:200px;max-width:340px;animation:tin .28s ease both;pointer-events:auto}
.toast.ok{border-color:#3ddc6a;color:#3ddc6a}.toast.err{border-color:#ff6b6b;color:#ff6b6b}
.toast.inf{border-color:var(--gold);color:var(--gold)}.toast.ph{border-color:var(--phantom);color:var(--phantom)}
.toast.out{animation:tout .28s ease forwards}
@keyframes tin{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
@keyframes tout{from{opacity:1}to{opacity:0;transform:translateX(14px)}}

/* ─ FOOTER ─ */
.footer{border-top:1px solid rgba(212,168,83,.06);padding:.9rem 1.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.45rem;background:rgba(2,4,10,.5)}
.footer-brand{font-family:'Libre Baskerville',serif;font-style:italic;font-size:.65rem;color:rgba(212,168,83,.4);letter-spacing:.06em}
.footer-copy{font-family:'Share Tech Mono',monospace;font-size:.4rem;letter-spacing:.1em;color:rgba(237,232,220,.14)}

/* dots */
.gdot{width:5px;height:5px;border-radius:50%;display:inline-block;flex-shrink:0}
.gdot.green{background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite}
.gdot.red{background:var(--red2);animation:rdot 1.8s ease-in-out infinite}
.wdot{width:6px;height:6px;border-radius:50%;background:#3ddc6a;animation:pdot 1.4s ease-in-out infinite;flex-shrink:0;display:inline-block}
@keyframes rdot{0%,100%{box-shadow:0 0 0 0 rgba(179,27,27,.6)}60%{box-shadow:0 0 0 4px transparent}}
.spin{display:inline-block;animation:spinit 1s linear infinite}
@keyframes spinit{from{transform:rotate(0)}to{transform:rotate(360deg)}}

/* lock */
.lock{position:absolute;inset:0;z-index:10;background:rgba(2,4,10,.6);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.7rem;text-align:center;padding:1.2rem}
.lock-icon{font-size:1.6rem;opacity:.3}.lock-txt{font-size:.55rem;font-weight:600;letter-spacing:.15em;color:rgba(212,168,83,.42);text-transform:uppercase;line-height:1.9}
</style>
</head>
<body>

<!-- TICKER -->
<div class="ticker"><div class="t-inner">
  <span class="ti"><span class="tsep">♦</span><b>#ALL-IN</b> LEORNINGCILD — COPY TRADING</span>
  <span class="ti"><span class="tsep">♦</span> SOLANA MAINNET</span>
  <span class="ti"><span class="tsep">♦</span> JUPITER V6 SWAPS</span>
  <span class="ti"><span class="tsep">♦</span> REAL-TIME WALLET MONITOR</span>
  <span class="ti"><span class="tsep">♦</span> REAL <b>PnL</b> TRACKING</span>
  <span class="ti"><span class="tsep">♦</span> AUTO FUND SPLIT</span>
  <span class="ti"><span class="tsep">♦</span> CUTLOSS PROTECTION</span>
  <span class="ti"><span class="tsep">♦</span> #ALL-IN FOUNDATION</span>
  <span class="ti"><span class="tsep">♦</span><b>#ALL-IN</b> LEORNINGCILD — COPY TRADING</span>
  <span class="ti"><span class="tsep">♦</span> SOLANA MAINNET</span>
  <span class="ti"><span class="tsep">♦</span> JUPITER V6 SWAPS</span>
  <span class="ti"><span class="tsep">♦</span> REAL-TIME WALLET MONITOR</span>
  <span class="ti"><span class="tsep">♦</span> REAL <b>PnL</b> TRACKING</span>
  <span class="ti"><span class="tsep">♦</span> AUTO FUND SPLIT</span>
  <span class="ti"><span class="tsep">♦</span> CUTLOSS PROTECTION</span>
  <span class="ti"><span class="tsep">♦</span> #ALL-IN FOUNDATION</span>
</div></div>

<!-- NAV -->
<nav>
  <a href="#" class="nav-logo">#ALL-IN <span class="nav-badge">Leorningcild</span></a>
  <button class="ph-btn" id="navBtn" onclick="walletClick()">
    <img id="navPhLogo" src="https://mintcdn.com/phantom-e50e2e68/SnwwAVi9jRoVyyZ5/resources/images/Phantom_SVG_Icon.svg?fit=max&auto=format&n=SnwwAVi9jRoVyyZ5&q=85&s=46d796e02bde533ac3765ff42ea28c81" alt="Phantom">
    <span id="navLabel">Connect Wallet</span>
  </button>
</nav>

<!-- WORKER STATUS BAR -->
<div class="worker-bar">
  <div class="wb-item"><div class="dot dot-wait" id="wsDot"></div><span id="wsStatus">Worker: connecting...</span></div>
  <div class="wb-item"><div class="dot dot-wait" id="monDot"></div><span id="monStatus">Monitor: idle</span></div>
  <div class="wb-item" style="margin-left:auto"><span id="solPriceBar">SOL: —</span></div>
</div>

<!-- PAGE HEADER -->
<div class="page-header">
  <div class="eyebrow"><div class="eyebrow-line"></div><div class="eyebrow-txt">Copy Trading Module — Live</div></div>
  <h1 class="page-title"><span>#ALL-IN</span> Leorningcild</h1>
  <p class="page-desc">Real-time wallet copy trading on Solana. Connects to target wallets via WebSocket, detects swaps, and mirrors them through Jupiter V6.</p>
  <div class="wallet-notice" id="walletNotice">
    <img src="https://mintcdn.com/phantom-e50e2e68/SnwwAVi9jRoVyyZ5/resources/images/Phantom_SVG_Icon.svg?fit=max&auto=format&n=SnwwAVi9jRoVyyZ5&q=85&s=46d796e02bde533ac3765ff42ea28c81" alt="Phantom">
    Connect Phantom Wallet to activate copy trading
  </div>
</div>

<div style="max-width:1200px;margin:0 auto;padding:0 1.5rem">
  <div class="mob-banner" id="mobBanner"></div>
</div>

<!-- APP -->
<div class="app-wrap">
  <!-- LEFT -->
  <div>
    <div class="wbar">
      <img class="wbar-logo" src="https://mintcdn.com/phantom-e50e2e68/SnwwAVi9jRoVyyZ5/resources/images/Phantom_SVG_Icon.svg?fit=max&auto=format&n=SnwwAVi9jRoVyyZ5&q=85&s=46d796e02bde533ac3765ff42ea28c81" alt="Phantom">
      <div class="wbar-info">
        <div class="wbar-addr dim" id="wbarAddr">Not connected</div>
        <div class="wbar-net">Solana Mainnet</div>
      </div>
      <div class="wbar-bal" id="wbarBal" style="display:none"></div>
      <button class="wbar-btn" onclick="walletClick()"><span id="wbarBtnLabel">Connect Phantom</span></button>
    </div>

    <!-- BALANCE BREAKDOWN PANEL -->
    <div class="bal-panel" id="balPanel">
      <div class="bal-head">
        <span>💼 Wallet Balance</span>
        <button class="bal-refresh" onclick="refreshBalPanel()">↻ Refresh</button>
      </div>
      <div class="bal-grid">
        <div class="bal-cell">
          <div class="bal-lbl">SOL</div>
          <span class="bal-val gold" id="balSOL">—</span>
          <div class="bal-sub" id="balSOLusd">—</div>
        </div>
        <div class="bal-cell">
          <div class="bal-lbl">USD Value</div>
          <span class="bal-val teal" id="balUSD">—</span>
          <div class="bal-sub">Total Wallet</div>
        </div>
        <div class="bal-cell">
          <div class="bal-lbl">Tokens</div>
          <span class="bal-val" id="balTokCount">—</span>
          <div class="bal-sub">SPL Tokens</div>
        </div>
      </div>
      <div class="bal-tokens" id="balTokenList">
        <div class="bal-empty">Loading tokens...</div>
      </div>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="panel-head">
        <div class="panel-title"><span class="gdot red"></span> Copy Presets</div>
        <div style="display:flex;align-items:center;gap:.45rem">
          <div class="panel-count" id="pCountBadge">0 / 100</div>
          <button id="addBtn" onclick="openForm()" disabled
            style="font-family:'Barlow Condensed',sans-serif;font-size:.56rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:.26rem .65rem;background:rgba(212,168,83,.05);color:var(--gold);border:1px solid rgba(212,168,83,.16);cursor:pointer;transition:all .18s">+ NEW</button>
        </div>
      </div>

      <div class="pform" id="pForm" style="display:none">
        <div class="pform-title" id="pFormTitle">New Preset</div>
        <div class="frow">
          <label class="flabel">Preset Name</label>
          <input class="finput" id="fName" type="text" placeholder="e.g. DEGEN ALPHA 01" maxlength="32"/>
        </div>
        <div class="frow">
          <label class="flabel">Target Wallet Address</label>
          <input class="finput" id="fWallet" type="text" placeholder="Solana wallet to copy..."/>
        </div>
        <div class="frow">
          <label class="flabel">Fund Amount</label>
          <div class="tg-wrap">
            <button class="tg on" id="tgSOL" onclick="setCurr('SOL')">SOL</button>
            <button class="tg" id="tgUSD" onclick="setCurr('USD')">USD</button>
          </div>
          <input class="finput" id="fAmt" type="number" placeholder="0.00" min="0" step="0.01" oninput="updAlloc()"/>
        </div>
        <div class="frow">
          <label class="flabel">Split Into (number of different tokens)</label>
          <input class="finput" id="fToks" type="number" placeholder="e.g. 5" min="1" max="50" step="1" oninput="updAlloc()"/>
        </div>
        <div class="alloc-box" id="allocBox">
          <span style="font-size:.48rem;letter-spacing:.12em;color:rgba(212,168,83,.48);text-transform:uppercase">Per Token</span>
          <span class="alloc-arrow">→</span>
          <span class="alloc-val" id="allocVal">—</span>
          <span class="alloc-sub" id="allocSub"></span>
        </div>
        <div class="frow" style="margin-bottom:0"><label class="flabel">Cutloss</label></div>
        <div class="cl-wrap">
          <div class="cl-rel">
            <input class="finput" id="fCL" type="number" placeholder="e.g. 20" min="1" max="99" step="1"/>
            <span class="cl-unit">%</span>
          </div>
          <button class="nocl-btn" id="noCLBtn" onclick="toggleNoCL()">No Cutloss</button>
        </div>
        <div class="frow">
          <label class="flabel">Slippage Tolerance</label>
          <div class="slip-row">
            <div class="slip-btns" id="slipBtns">
              <button class="slip-btn on" onclick="setSlip(50,this)">0.5%</button>
              <button class="slip-btn" onclick="setSlip(100,this)">1%</button>
              <button class="slip-btn" onclick="setSlip(200,this)">2%</button>
              <button class="slip-btn" onclick="setSlip(500,this)">5%</button>
            </div>
          </div>
        </div>
        <div class="factions">
          <button class="btn-save" onclick="savePreset()">Save Preset</button>
          <button class="btn-cancel" onclick="closeForm()">Cancel</button>
        </div>
      </div>

      <div class="plist" id="pList">
        <div class="pempty">♦ No presets yet<br><span style="font-size:.44rem;opacity:.5">Connect wallet &amp; add your first preset</span></div>
      </div>
      <div class="lock" id="pLock"><div class="lock-icon">🔒</div><div class="lock-txt">Connect Phantom Wallet<br>to manage presets</div></div>
    </div>
  </div>

  <!-- RIGHT -->
  <div class="right-col">
    <div class="pnl-sum">
      <div class="pnl-cell"><div class="pnl-lbl">Total Invested</div><span class="pnl-num gold" id="sInvested">$0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">Current Value</div><span class="pnl-num" id="sValue">$0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">Total PnL</div><span class="pnl-num" id="sPnl">+0.00</span></div>
      <div class="pnl-cell"><div class="pnl-lbl">Positions</div><span class="pnl-num" id="sPos">0</span></div>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="panel-head">
        <div class="panel-title"><span class="gdot green"></span> Active Positions</div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:.44rem;letter-spacing:.08em;color:var(--muted)" id="priceUpd">—</div>
      </div>
      <div class="tbl-wrap">
        <div class="tbl-hdr"><span>TOKEN</span><span>BUY</span><span>NOW</span><span>INV.</span><span>PnL</span><span>ACTION</span></div>
        <div id="tblBody"><div class="tbl-empty">♦ No active positions<br><span style="font-size:.44rem;opacity:.5">Run a preset to start copy trading</span></div></div>
      </div>
      <div class="lock" id="tLock"><div class="lock-icon">🔒</div><div class="lock-txt">Connect wallet<br>to view positions</div></div>
    </div>

    <div class="panel">
      <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
      <div class="panel-head">
        <div class="panel-title">Activity Log</div>
        <button onclick="clearLog()" style="font-family:'Share Tech Mono',monospace;font-size:.44rem;letter-spacing:.07em;color:rgba(237,232,220,.16);background:transparent;border:none;cursor:pointer;transition:color .18s" onmouseover="this.style.color='rgba(237,232,220,.4)'" onmouseout="this.style.color='rgba(237,232,220,.16)'">CLEAR</button>
      </div>
      <div class="log-wrap" id="logWrap"><div class="log-empty">Waiting for activity...</div></div>
    </div>
  </div>
</div>

<footer class="footer">
  <div class="footer-brand">#ALL-IN Leorningcild — Copy Trading</div>
  <div class="footer-copy">#ALL-IN FOUNDATION · Solana · Jupiter V6 · 2025</div>
</footer>

<!-- MODALS -->
<div class="overlay" id="phModal">
  <div class="modal" style="max-width:350px">
    <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
    <div class="mhead">
      <div class="mtitle">
        <img src="https://mintcdn.com/phantom-e50e2e68/SnwwAVi9jRoVyyZ5/resources/images/Phantom_SVG_Icon.svg?fit=max&auto=format&n=SnwwAVi9jRoVyyZ5&q=85&s=46d796e02bde533ac3765ff42ea28c81" alt="Phantom">
        Connect Phantom
      </div>
      <button class="mclose" onclick="closePhModal()">✕</button>
    </div>
    <div class="ph-mbody" id="phModalBody"></div>
  </div>
</div>

<div class="overlay" id="sellModal">
  <div class="modal">
    <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
    <div class="mhead"><div class="mtitle">Cancel Copy &amp; Sell</div><button class="mclose" onclick="closeSell()">✕</button></div>
    <div class="mbody">
      <div class="micon">⚠</div>
      <div class="mtext" id="sellTxt">Close this position?</div>
      <div class="mdetail" id="sellDetail">—</div>
      <div class="mbtns">
        <button class="mbtn-p" id="sellConfirmBtn" onclick="confirmSell()">Confirm Sell</button>
        <button class="mbtn-s" onclick="closeSell()">Keep Position</button>
      </div>
    </div>
  </div>
</div>

<div class="overlay" id="stopModal">
  <div class="modal">
    <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
    <div class="mhead"><div class="mtitle">Stop Preset</div><button class="mclose" onclick="closeStop()">✕</button></div>
    <div class="mbody">
      <div class="micon">⏹</div>
      <div class="mtext" id="stopTxt">Stop this preset?</div>
      <div class="mbtns">
        <button class="mbtn-p" onclick="confirmStop()">Stop Preset</button>
        <button class="mbtn-s" onclick="closeStop()">Keep Running</button>
      </div>
    </div>
  </div>
</div>

<div class="overlay" id="delModal">
  <div class="modal">
    <div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
    <div class="mhead"><div class="mtitle">Delete Preset</div><button class="mclose" onclick="closeDel()">✕</button></div>
    <div class="mbody">
      <div class="micon">🗑</div>
      <div class="mtext" id="delTxt">Permanently delete this preset?</div>
      <div class="mbtns">
        <button class="mbtn-p" onclick="confirmDel()">Delete</button>
        <button class="mbtn-s" onclick="closeDel()">Cancel</button>
      </div>
    </div>
  </div>
</div>

<div class="toasts" id="toastWrap"></div>

<!-- ════════════════════════════════════════════════════
     FULL APP LOGIC
════════════════════════════════════════════════════ -->
<script>
'use strict';

/* ══════════════════════════════════════
   CONFIG — CHANGE THIS TO YOUR WORKER URL
   After deploying worker: wrangler deploy
   Your URL will be: https://allin-copytrade-worker.<your-subdomain>.workers.dev
══════════════════════════════════════ */
var WORKER_URL = (function(){
  // Auto-detect: if on Pages domain, derive worker URL
  // Otherwise default — user must update this
  var host = location.hostname;
  if(host === 'localhost' || host === '127.0.0.1'){
    return 'http://localhost:8787'; // wrangler dev
  }
  // For production: replace with your actual worker URL
  return 'https://allin-copytrade-worker.YOUR-SUBDOMAIN.workers.dev';
})();

var WS_URL = WORKER_URL.replace(/^http/, 'ws') + '/ws';

/* ══════════════════════════════════════
   SOLANA CONSTANTS
══════════════════════════════════════ */
var SOL_MINT  = 'So11111111111111111111111111111111111111112';
var LAMPORTS  = 1e9;

/* ══════════════════════════════════════
   ENVIRONMENT DETECTION
══════════════════════════════════════ */
var ENV = (function(){
  var ua   = navigator.userAgent || '';
  var mob  = /Android|iPhone|iPad|iPod/i.test(ua);
  var andr = /Android/i.test(ua);
  var ios  = /iPhone|iPad|iPod/i.test(ua);
  var inPh = !!(window.phantom && window.phantom.solana && window.phantom.solana.isPhantom);
  var ext  = !mob && !!(window.solana && window.solana.isPhantom);
  return { mob, andr, ios, inPh, ext };
})();

function getProvider(){
  if(window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) return window.phantom.solana;
  if(window.solana && window.solana.isPhantom) return window.solana;
  return null;
}

/* ══════════════════════════════════════
   APP STATE
══════════════════════════════════════ */
var S = {
  connected  : false,
  addr       : null,
  balance    : 0,
  solPrice   : 0,
  presets    : [],
  positions  : [],
  logs       : [],
  currency   : 'SOL',
  noCL       : false,
  slippage   : 50,        // bps: 50 = 0.5%
  editId     : null,
  pendSell   : null,
  pendStop   : null,
  pendDel    : null,
  ws         : null,      // WebSocket to worker
  wsAlive    : false,
  priceTimer : null,      // interval for price refresh
  tokenCache : {}         // mint → {symbol, decimals, price}
};

/* ══════════════════════════════════════
   WEBSOCKET — connect to Cloudflare Worker
══════════════════════════════════════ */
function connectWS(){
  if(S.ws && S.ws.readyState === WebSocket.OPEN) return;

  setWsStatus('connecting');
  try {
    S.ws = new WebSocket(WS_URL);
  } catch(e){
    setWsStatus('error');
    addLog('Worker WS connect failed: ' + e.message, 'warn');
    setTimeout(connectWS, 5000);
    return;
  }

  S.ws.onopen = function(){
    S.wsAlive = true;
    setWsStatus('ok');
    addLog('Worker connected', 'inf');
    // Re-watch any running presets
    S.presets.filter(function(p){ return p.status === 'running'; }).forEach(function(p){
      S.ws.send(JSON.stringify({ type:'watch', wallet: p.targetWallet }));
    });
  };

  S.ws.onmessage = function(evt){
    try {
      var msg = JSON.parse(evt.data);
      handleWSMessage(msg);
    } catch(e){}
  };

  S.ws.onclose = function(){
    S.wsAlive = false;
    setWsStatus('reconnecting');
    setTimeout(connectWS, 4000);
  };

  S.ws.onerror = function(){
    setWsStatus('error');
  };
}

function setWsStatus(state){
  var dot = document.getElementById('wsDot');
  var txt = document.getElementById('wsStatus');
  if(state === 'ok'){
    dot.className = 'dot dot-ok';
    txt.textContent = 'Worker: online';
  } else if(state === 'error' || state === 'reconnecting'){
    dot.className = 'dot dot-err';
    txt.textContent = state === 'error' ? 'Worker: error' : 'Worker: reconnecting...';
  } else {
    dot.className = 'dot dot-wait';
    txt.textContent = 'Worker: connecting...';
  }
}

/* ══════════════════════════════════════
   HANDLE WORKER MESSAGES
══════════════════════════════════════ */
async function handleWSMessage(msg){
  if(msg.type === 'swap_detected'){
    addLog('Target swap detected: ' + (msg.action || '?') + ' ' + (msg.tokenMint || '').slice(0,8) + '…', 'inf');
    await handleTargetSwap(msg);
  }
  if(msg.type === 'watching'){
    setMonStatus('watching', msg.wallet);
    addLog('Monitoring wallet: ' + shortAddr(msg.wallet), 'inf');
  }
  if(msg.type === 'subscribed'){
    addLog('RPC subscription active (id: ' + msg.subId + ')', 'inf');
  }
  if(msg.type === 'rpc_reconnecting'){
    setMonStatus('reconnecting');
  }
  if(msg.type === 'rpc_connected'){
    // Re-subscribe
    S.presets.filter(function(p){ return p.status === 'running'; }).forEach(function(p){
      S.ws.send(JSON.stringify({ type:'watch', wallet: p.targetWallet }));
    });
  }
}

function setMonStatus(state, wallet){
  var dot = document.getElementById('monDot');
  var txt = document.getElementById('monStatus');
  if(state === 'watching'){
    dot.className = 'dot dot-ok';
    txt.textContent = 'Monitor: ' + shortAddr(wallet);
  } else if(state === 'reconnecting'){
    dot.className = 'dot dot-wait';
    txt.textContent = 'Monitor: reconnecting...';
  } else {
    dot.className = 'dot dot-wait';
    txt.textContent = 'Monitor: idle';
  }
}

/* ══════════════════════════════════════
   HANDLE TARGET WALLET SWAP DETECTED
   → mirror buy with Jupiter
══════════════════════════════════════ */
async function handleTargetSwap(event){
  if(!S.connected){ return; }
  if(event.action !== 'buy') return; // only copy buys (sells handled by cutloss/manual)

  // Find which preset(s) are watching this wallet
  var presets = S.presets.filter(function(p){
    return p.status === 'running' && p.targetWallet === event.wallet;
  });
  if(!presets.length) return;

  for(var i = 0; i < presets.length; i++){
    var preset = presets[i];
    await executeCopyBuy(preset, event.tokenMint, event.signature);
  }
}

/* ══════════════════════════════════════
   EXECUTE COPY BUY via Jupiter
══════════════════════════════════════ */
async function executeCopyBuy(preset, tokenMint, refSig){
  if(!tokenMint || tokenMint === SOL_MINT) return;

  var solRef   = S.solPrice > 0 ? S.solPrice : 155;
  // Per-token SOL amount
  var solPerToken = preset.currency === 'SOL'
    ? preset.amount / preset.tokens
    : (preset.amount / preset.tokens) / solRef;

  var lamports = Math.floor(solPerToken * LAMPORTS);
  if(lamports < 10000){ // min ~$0.001 worth
    addLog('Amount too small for ' + tokenMint.slice(0,8) + ', skipping', 'warn');
    return;
  }

  addLog('Copying buy: ' + tokenMint.slice(0,8) + '… | ' + solPerToken.toFixed(4) + ' SOL', 'inf');

  try {
    // 1. Get Jupiter quote (SOL → token)
    var quoteRes = await workerFetch('/quote?inputMint=' + SOL_MINT +
      '&outputMint=' + tokenMint +
      '&amount=' + lamports +
      '&slippage=' + preset.slippage);

    if(!quoteRes.ok || !quoteRes.quote){
      addLog('Quote failed for ' + tokenMint.slice(0,8), 'warn');
      return;
    }

    var quote = quoteRes.quote;
    var outAmount = parseInt(quote.outAmount || 0);

    // 2. Build swap transaction via worker
    var txRes = await workerFetch('/swap-tx', 'POST', {
      quoteResponse  : quote,
      userPublicKey  : S.addr,
      wrapUnwrapSOL  : true
    });

    if(!txRes.ok || !txRes.swapTransaction){
      addLog('Swap TX build failed', 'warn');
      return;
    }

    // 3. Deserialize, sign, and send via Phantom
    var swapTxBase64 = txRes.swapTransaction;
    var txBytes      = base64ToUint8Array(swapTxBase64);

    // Use Solana web3.js VersionedTransaction
    var vTx = solanaWeb3.VersionedTransaction.deserialize(txBytes);

    var provider = getProvider();
    if(!provider){ addLog('Phantom not available for signing', 'warn'); return; }

    var signed = await provider.signTransaction(vTx);

    // 4. Send via RPC
    var sig = await sendTransaction(signed.serialize());

    if(!sig){
      addLog('Send TX failed for ' + tokenMint.slice(0,8), 'warn');
      return;
    }

    addLog('BUY TX sent: ' + shortAddr(sig), 'buy');
    toast('Copied buy: ' + tokenMint.slice(0,8) + '…', 'ok');

    // 5. Get token info and record position
    var tokenInfo = await getTokenInfo(tokenMint);
    var symbol    = tokenInfo.symbol || tokenMint.slice(0,6);
    var decimals  = tokenInfo.decimals || 6;
    var outAmtUi  = outAmount / Math.pow(10, decimals);

    // Estimate buy price in USD
    var usdInvested = solPerToken * solRef;
    var buyPriceUSD = outAmtUi > 0 ? usdInvested / outAmtUi : 0;

    var pos = {
      id         : 'pos_' + Date.now(),
      presetId   : preset.id,
      presetName : preset.name,
      ticker     : symbol,
      mint       : tokenMint,
      buyPrice   : buyPriceUSD,
      curPrice   : buyPriceUSD,
      invested   : usdInvested,
      qty        : outAmtUi,
      buyTime    : Date.now(),
      buyTx      : sig,
      cutloss    : preset.noCutloss ? null : preset.cutloss,
      noCutloss  : preset.noCutloss
    };
    S.positions.push(pos);
    S.tokenCache[tokenMint] = { symbol, decimals };

    addLog('Position opened: ' + symbol + ' | $' + usdInvested.toFixed(2), 'buy');
    renderTrades();
    updateSummary();

  } catch(e){
    addLog('Copy buy error: ' + (e.message || String(e)), 'warn');
    console.error('executeCopyBuy error:', e);
  }
}

/* ══════════════════════════════════════
   EXECUTE SELL via Jupiter
══════════════════════════════════════ */
async function executeSell(pos, confirmBtn){
  if(confirmBtn) confirmBtn.disabled = true;

  var tokenMint = pos.mint;
  var qty       = pos.qty;

  // Convert qty to raw amount
  var decimals  = (S.tokenCache[tokenMint] && S.tokenCache[tokenMint].decimals) ? S.tokenCache[tokenMint].decimals : 6;
  var rawAmount = Math.floor(qty * Math.pow(10, decimals));

  if(rawAmount < 1){ addLog('Amount too small to sell', 'warn'); return false; }

  addLog('Selling ' + pos.ticker + '…', 'inf');
  try {
    // Quote: token → SOL
    var quoteRes = await workerFetch('/quote?inputMint=' + tokenMint +
      '&outputMint=' + SOL_MINT +
      '&amount=' + rawAmount +
      '&slippage=' + (S.slippage || 100));

    if(!quoteRes.ok || !quoteRes.quote){
      addLog('Sell quote failed for ' + pos.ticker, 'warn');
      if(confirmBtn) confirmBtn.disabled = false;
      return false;
    }

    var txRes = await workerFetch('/swap-tx', 'POST', {
      quoteResponse : quoteRes.quote,
      userPublicKey : S.addr,
      wrapUnwrapSOL : true
    });

    if(!txRes.ok || !txRes.swapTransaction){
      addLog('Sell TX build failed', 'warn');
      if(confirmBtn) confirmBtn.disabled = false;
      return false;
    }

    var txBytes = base64ToUint8Array(txRes.swapTransaction);
    var vTx     = solanaWeb3.VersionedTransaction.deserialize(txBytes);
    var prov    = getProvider();
    if(!prov){ if(confirmBtn) confirmBtn.disabled = false; return false; }

    var signed = await prov.signTransaction(vTx);
    var sig    = await sendTransaction(signed.serialize());

    if(!sig){
      addLog('Sell TX send failed', 'warn');
      if(confirmBtn) confirmBtn.disabled = false;
      return false;
    }

    var pnl = (pos.curPrice - pos.buyPrice) / pos.buyPrice * pos.invested;
    addLog('SELL TX: ' + pos.ticker + ' | sig: ' + shortAddr(sig) + ' | PnL: ' + fmtPnl(pnl), 'sell');
    toast('Sold ' + pos.ticker + ' | PnL: ' + fmtPnl(pnl), pnl >= 0 ? 'ok' : 'inf');
    return true;

  } catch(e){
    addLog('Sell error: ' + (e.message || String(e)), 'warn');
    if(confirmBtn) confirmBtn.disabled = false;
    return false;
  }
}

/* ══════════════════════════════════════
   SEND TRANSACTION via Solana RPC
══════════════════════════════════════ */
async function sendTransaction(serializedTx){
  var b64 = uint8ArrayToBase64(serializedTx);
  var rpcs = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
  ];
  for(var i = 0; i < rpcs.length; i++){
    try{
      var r = await fetch(rpcs[i], {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({
          jsonrpc  : '2.0',
          id       : 1,
          method   : 'sendTransaction',
          params   : [b64, { encoding: 'base64', skipPreflight: false, maxRetries: 3, preflightCommitment: 'confirmed' }]
        }),
        signal  : AbortSignal.timeout(15000)
      });
      var d = await r.json();
      if(d.result) return d.result; // transaction signature
      if(d.error)  addLog('RPC error: ' + JSON.stringify(d.error), 'warn');
    } catch(e){}
  }
  return null;
}

/* ══════════════════════════════════════
   PRICE REFRESH — Jupiter Price API
══════════════════════════════════════ */
async function refreshPrices(){
  if(!S.positions.length) return;
  var mints = [...new Set(S.positions.map(function(p){ return p.mint; }))].join(',');
  try{
    var res = await workerFetch('/price?mints=' + mints);
    if(!res.ok || !res.data) return;
    var solRef = S.solPrice > 0 ? S.solPrice : 155;
    S.positions.forEach(function(pos){
      var info = res.data[pos.mint];
      if(!info) return;
      var priceUSD = parseFloat(info.price || 0);
      if(priceUSD > 0){
        pos.curPrice = priceUSD;
        // Cutloss check
        if(!pos.noCutloss && pos.cutloss !== null){
          var pct = (pos.curPrice - pos.buyPrice) / pos.buyPrice * 100;
          if(pct <= -pos.cutloss){
            addLog('CUTLOSS: ' + pos.ticker + ' at −' + pos.cutloss + '% — auto-selling…', 'sell');
            toast('Cutloss: ' + pos.ticker + ' at −' + pos.cutloss + '%', 'inf');
            var posCopy = Object.assign({}, pos);
            S.positions = S.positions.filter(function(p){ return p.id !== pos.id; });
            executeSell(posCopy, null).catch(function(){});
          }
        }
      }
    });
    renderTrades();
    updateSummary();
    document.getElementById('priceUpd').textContent = 'Updated ' + fmtTime(new Date());
  } catch(e){}
}

async function fetchSolPrice(){
  try{
    var res = await workerFetch('/sol-price');
    if(res && res.price > 0){
      S.solPrice = res.price;
      document.getElementById('solPriceBar').textContent = 'SOL: $' + S.solPrice.toFixed(2);
      updAlloc();
    }
  } catch(e){}
}

/* ══════════════════════════════════════
   WORKER FETCH HELPER
══════════════════════════════════════ */
async function workerFetch(path, method, body){
  method = method || 'GET';
  var opts = {
    method  : method,
    headers : { 'Content-Type': 'application/json' },
    signal  : AbortSignal.timeout(12000)
  };
  if(body) opts.body = JSON.stringify(body);
  var r = await fetch(WORKER_URL + path, opts);
  return await r.json();
}

/* ══════════════════════════════════════
   TOKEN INFO CACHE
══════════════════════════════════════ */
async function getTokenInfo(mint){
  if(S.tokenCache[mint]) return S.tokenCache[mint];
  try{
    var res = await workerFetch('/token-info?mint=' + mint);
    if(res.ok){
      S.tokenCache[mint] = res;
      return res;
    }
  } catch(e){}
  return { symbol: mint.slice(0,6), decimals: 6, mint };
}

/* ══════════════════════════════════════
   BALANCE
══════════════════════════════════════ */
async function fetchBal(addr){
  var rpcs = ['https://api.mainnet-beta.solana.com','https://rpc.ankr.com/solana'];
  for(var i = 0; i < rpcs.length; i++){
    try{
      var r = await fetch(rpcs[i], {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({jsonrpc:'2.0',id:1,method:'getBalance',params:[addr]}),
        signal  : AbortSignal.timeout(6000)
      });
      var d = await r.json();
      if(d.result && typeof d.result.value === 'number'){
        S.balance = d.result.value / LAMPORTS;
        renderBal();
        return;
      }
    } catch(e){}
  }
}
function renderBal(){
  var t = S.balance.toFixed(4) + ' SOL';
  if(S.solPrice > 0) t += ' ≈ $' + (S.balance * S.solPrice).toFixed(2);
  document.getElementById('wbarBal').textContent = t;
  // Update balance panel top row
  if(S.connected){
    document.getElementById('balSOL').textContent = S.balance.toFixed(4);
    var usd = S.solPrice > 0 ? (S.balance * S.solPrice) : 0;
    document.getElementById('balSOLusd').textContent = S.solPrice > 0 ? '≈ $' + usd.toFixed(2) : '—';
    document.getElementById('balUSD').textContent = S.solPrice > 0 ? '$' + usd.toFixed(2) : '—';
  }
}

async function fetchTokenBalances(addr){
  var RPC_LIST = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-mainnet.g.alchemy.com/v2/demo'
  ];
  var accounts = null;

  // 1. Ambil semua token accounts
  for(var i = 0; i < RPC_LIST.length; i++){
    try{
      var r = await fetch(RPC_LIST[i], {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          jsonrpc:'2.0', id:1,
          method:'getTokenAccountsByOwner',
          params:[addr,
            {programId:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'},
            {encoding:'jsonParsed', commitment:'confirmed'}
          ]
        }),
        signal: AbortSignal.timeout(10000)
      });
      var d = await r.json();
      if(d.result && d.result.value && d.result.value.length >= 0){
        accounts = d.result.value;
        break;
      }
    }catch(e){}
  }

  if(accounts === null){
    document.getElementById('balTokenList').innerHTML = '<div class="bal-empty">Failed to load tokens — RPC timeout</div>';
    return;
  }

  // 2. Parse token accounts, skip dust
  var rawTokens = [];
  accounts.forEach(function(acc){
    try{
      var info = acc.account.data.parsed.info;
      var uiAmt = parseFloat(info.tokenAmount.uiAmount || 0);
      if(uiAmt < 0.000001) return;
      rawTokens.push({
        mint     : info.mint,
        amt      : uiAmt,
        decimals : info.tokenAmount.decimals,
        sym      : S.tokenCache[info.mint] ? S.tokenCache[info.mint].symbol : null
      });
    }catch(e){}
  });

  document.getElementById('balTokCount').textContent = rawTokens.length;
  if(rawTokens.length === 0){
    document.getElementById('balTokenList').innerHTML = '<div class="bal-empty">No SPL tokens in this wallet</div>';
    return;
  }

  // 3. Fetch prices dari Jupiter untuk semua mints sekaligus
  var allMints = rawTokens.map(function(t){ return t.mint; }).join(',');
  var priceMap = {};
  try{
    var pr = await fetch('https://api.jup.ag/price/v2?ids=' + allMints, {
      signal: AbortSignal.timeout(8000)
    });
    var pd = await pr.json();
    if(pd.data){
      Object.keys(pd.data).forEach(function(mint){
        var p = pd.data[mint];
        if(p && p.price) priceMap[mint] = parseFloat(p.price);
      });
    }
  }catch(e){}

  // 4. Fetch token supply + symbol dari Solana RPC (batch)
  // Ambil symbol dari Jupiter token list jika belum ada
  var missingSymMints = rawTokens.filter(function(t){ return !t.sym; }).map(function(t){ return t.mint; });
  if(missingSymMints.length > 0){
    try{
      var tr = await fetch('https://api.jup.ag/tokens/v1/mints?mints=' + missingSymMints.slice(0,30).join(','), {
        signal: AbortSignal.timeout(6000)
      });
      var td = await tr.json();
      if(Array.isArray(td)){
        td.forEach(function(tok){
          if(tok.address && tok.symbol){
            rawTokens.forEach(function(t){ if(t.mint === tok.address){ t.sym = tok.symbol; } });
            S.tokenCache[tok.address] = { symbol: tok.symbol, decimals: tok.decimals || 6 };
          }
        });
      }
    }catch(e){}
  }

  // 5. Fetch total supply untuk tiap token (untuk % calculation)
  //    Batch via RPC getMultipleAccounts — ambil mint accounts
  var supplyMap = {};
  try{
    for(var si = 0; si < Math.min(rawTokens.length, 20); si++){
      var mint = rawTokens[si].mint;
      try{
        var sr = await fetch(RPC_LIST[0], {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            jsonrpc:'2.0', id:1,
            method:'getTokenSupply',
            params:[mint]
          }),
          signal: AbortSignal.timeout(4000)
        });
        var sd = await sr.json();
        if(sd.result && sd.result.value){
          var supplyUi = parseFloat(sd.result.value.uiAmount || 0);
          if(supplyUi > 0) supplyMap[mint] = supplyUi;
        }
      }catch(e){}
    }
  }catch(e){}

  // 6. Build token list dengan semua data
  var totalTokenUsd = 0;
  rawTokens.forEach(function(t){
    var price = priceMap[t.mint] || 0;
    t.price = price;
    t.usd   = price > 0 ? t.amt * price : 0;
    t.supply = supplyMap[t.mint] || 0;
    t.pct    = (t.supply > 0) ? (t.amt / t.supply * 100) : null;
    if(t.usd > 0) totalTokenUsd += t.usd;
    if(!t.sym) t.sym = t.mint.slice(0,4)+'…'+t.mint.slice(-4);
  });

  // Sort by USD value descending
  rawTokens.sort(function(a,b){ return b.usd - a.usd; });

  // 7. Render table
  var h = '<table style="width:100%;border-collapse:collapse">';
  h += '<tr style="border-bottom:1px solid rgba(212,168,83,.08)">';
  h += '<th style="font-family:'Barlow Condensed',sans-serif;font-size:.42rem;letter-spacing:.16em;color:rgba(212,168,83,.5);text-transform:uppercase;padding:.3rem .4rem;text-align:left;font-weight:700">TOKEN</th>';
  h += '<th style="font-family:'Barlow Condensed',sans-serif;font-size:.42rem;letter-spacing:.16em;color:rgba(212,168,83,.5);text-transform:uppercase;padding:.3rem .4rem;text-align:right;font-weight:700">AMOUNT</th>';
  h += '<th style="font-family:'Barlow Condensed',sans-serif;font-size:.42rem;letter-spacing:.16em;color:rgba(212,168,83,.5);text-transform:uppercase;padding:.3rem .4rem;text-align:right;font-weight:700">% SUPPLY</th>';
  h += '<th style="font-family:'Barlow Condensed',sans-serif;font-size:.42rem;letter-spacing:.16em;color:rgba(212,168,83,.5);text-transform:uppercase;padding:.3rem .4rem;text-align:right;font-weight:700">USD</th>';
  h += '</tr>';

  rawTokens.forEach(function(t){
    h += '<tr style="border-bottom:1px solid rgba(212,168,83,.03);transition:background .15s" onmouseover="this.style.background='rgba(212,168,83,.02)'" onmouseout="this.style.background=''">';
    // Token name
    h += '<td style="padding:.38rem .4rem">';
    h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.54rem;color:var(--cream);font-weight:600">' + esc(t.sym) + '</div>';
    h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.38rem;color:rgba(237,232,220,.18);margin-top:.05rem">' + t.mint.slice(0,8) + '…</div>';
    h += '</td>';
    // Amount
    h += '<td style="padding:.38rem .4rem;text-align:right">';
    h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.52rem;color:var(--gold-bright)">';
    if(t.amt >= 1e6) h += (t.amt/1e6).toFixed(2)+'M';
    else if(t.amt >= 1e3) h += (t.amt/1e3).toFixed(2)+'K';
    else h += t.amt.toLocaleString(undefined,{maximumFractionDigits:4});
    h += '</div>';
    if(t.price > 0) h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.38rem;color:rgba(237,232,220,.22)">$'+fmtP(t.price)+'/ea</div>';
    h += '</td>';
    // % Supply
    h += '<td style="padding:.38rem .4rem;text-align:right">';
    if(t.pct !== null){
      var pctStr = t.pct < 0.0001 ? '<0.0001%' : t.pct.toFixed(4)+'%';
      var pctColor = t.pct >= 1 ? '#f5c842' : t.pct >= 0.1 ? 'var(--teal)' : 'rgba(237,232,220,.35)';
      h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.52rem;color:'+pctColor+'">'+pctStr+'</div>';
    } else {
      h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.52rem;color:rgba(237,232,220,.18)">—</div>';
    }
    h += '</td>';
    // USD
    h += '<td style="padding:.38rem .4rem;text-align:right">';
    if(t.usd > 0){
      h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.56rem;color:#3ddc6a;font-weight:600">$'+t.usd.toFixed(2)+'</div>';
    } else {
      h += '<div style="font-family:'Share Tech Mono',monospace;font-size:.52rem;color:rgba(237,232,220,.18)">—</div>';
    }
    h += '</td>';
    h += '</tr>';
  });
  h += '</table>';

  document.getElementById('balTokenList').innerHTML = h;

  // Update total USD (SOL + tokens)
  var totalUsd = S.balance * (S.solPrice || 0) + totalTokenUsd;
  if(S.solPrice > 0 || totalTokenUsd > 0){
    document.getElementById('balUSD').textContent = '$' + totalUsd.toFixed(2);
  }
}

async function refreshBalPanel(){
  if(!S.connected || !S.addr) return;
  document.getElementById('balTokenList').innerHTML = '<div class="bal-empty">Loading...</div>';
  await fetchBal(S.addr);
  await fetchTokenBalances(S.addr);
}

/* ══════════════════════════════════════
   PHANTOM WALLET
══════════════════════════════════════ */
function deepLink(){
  // Phantom deep link — browse mode, opens page inside Phantom browser
  return 'phantom://browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin);
}
function uniLink(){
  // Universal link — opens Phantom app and browses to this page
  return 'https://phantom.app/ul/browse/' + encodeURIComponent(location.href) + '?ref=' + encodeURIComponent(location.origin);
}
// ── Phantom Connect API (proper redirect flow) ──────────────
// Menggunakan Web Crypto API (native browser) untuk ECDH key exchange
var _phantomSession = null;

async function generateDappKeyPair(){
  // Generate X25519 key pair menggunakan Web Crypto
  try{
    var kp = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey','deriveBits']);
    var pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey);
    var pubHex = Array.from(new Uint8Array(pubRaw)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    return { keyPair: kp, pubHex: pubHex };
  }catch(e){ return null; }
}

async function phantomConnectRedirect(){
  // Simpan URL saat ini
  sessionStorage.setItem('ph_return_url', location.href);
  // Pakai Phantom deeplink v1 connect dengan redirect_link
  // Phantom akan redirect balik ke redirect_link?phantom_encryption_public_key=...&nonce=...&data=...
  var redirectLink = location.origin + location.pathname + '?phantom_connect=1';
  var params = new URLSearchParams({
    app_url      : location.origin,
    redirect_link: redirectLink,
    cluster      : 'mainnet-beta'
  });
  var url = 'https://phantom.app/ul/v1/connect?' + params.toString();
  window.location.href = url;
}

// Check jika ada callback dari Phantom Connect API
function checkPhantomCallback(){
  var urlParams = new URLSearchParams(location.search);
  if(urlParams.get('phantom_connect') === '1'){
    var pubKey = urlParams.get('phantom_encryption_public_key');
    var nonce  = urlParams.get('nonce');
    var data   = urlParams.get('data');
    // Bersihkan URL tanpa reload
    window.history.replaceState({}, '', location.pathname);
    if(pubKey && data){
      // Phantom berhasil connect — ambil public key dari data
      // Data berisi encrypted { public_key, session } tapi kita perlu decrypt
      // Untuk simplicity: trigger prov.connect() yang seharusnya sudah ada sessionnya
      setTimeout(function(){
        var prov = getProvider();
        if(prov && prov.publicKey){
          S.connected = true;
          S.addr = prov.publicKey.toString();
          onConnected(S.addr);
          fetchBal(S.addr);
          addLog('Connected via Phantom Connect API', 'inf');
        } else {
          // Fallback: coba connect normal
          doConnect();
        }
      }, 500);
    }
    if(urlParams.get('errorCode')){
      toast('Phantom connect error: ' + urlParams.get('errorMessage'), 'err');
    }
  }
}

function walletClick(){
  if(S.connected){ doDisconnect(); return; }
  // Re-check provider setiap kali — Phantom mungkin inject setelah load
  var prov = getProvider();
  if(prov){
    ENV.inPh = true; ENV.ext = true;
    doConnect();
    return;
  }
  // Jika tidak ada provider, buka modal
  openPhModal();
}

function openPhModal(){
  var dl = deepLink(), ul = uniLink();
  var html;
  var logo = 'https://mintcdn.com/phantom-e50e2e68/SnwwAVi9jRoVyyZ5/resources/images/Phantom_SVG_Icon.svg?fit=max&auto=format&n=SnwwAVi9jRoVyyZ5&q=85&s=46d796e02bde533ac3765ff42ea28c81';
  if(ENV.mob){
    html = '<img src="'+logo+'" style="width:48px;height:48px;border-radius:12px;margin:0 auto .75rem;display:block" alt="Phantom">' +
      '<div class="mtext"><b>Pilih cara connect:</b></div>' +
      '<div class="ph-opts">' +
        '<button class="ph-opt primary" onclick="closePhModal();phantomConnectRedirect()" style="flex-direction:column;gap:.25rem;padding:.85rem">' +
          '<span style="display:flex;align-items:center;gap:.5rem"><img src="'+logo+'" style="width:18px;height:18px;border-radius:4px"> Connect & Kembali ke Chrome</span>' +
          '<span style="font-size:.44rem;opacity:.65;font-weight:400;letter-spacing:.04em">Buka Phantom, approve, lalu otomatis kembali ke sini</span>' +
        '</button>' +
        '<div class="ph-div">atau</div>' +
        '<a href="'+ul+'" class="ph-opt" style="flex-direction:column;gap:.2rem;padding:.75rem">' +
          '<span>Buka Halaman di Phantom Browser</span>' +
          '<span style="font-size:.42rem;opacity:.6;font-weight:400">Halaman terbuka di browser Phantom</span>' +
        '</a>' +
        '<div class="ph-div">belum install Phantom?</div>' +
        (ENV.andr
          ? '<a href="https://play.google.com/store/apps/details?id=app.phantom" target="_blank" class="ph-opt" onclick="closePhModal()">Install Phantom — Google Play</a>'
          : '<a href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977" target="_blank" class="ph-opt" onclick="closePhModal()">Install Phantom — App Store</a>') +
      '</div>' +
      '<div class="ph-note">Opsi 1: Phantom approve lalu redirect otomatis kembali ke Chrome.<br>Opsi 2: Halaman terbuka permanen di Phantom browser.</div>';
  } else {
    html = '<img src="'+logo+'" style="width:52px;height:52px;border-radius:14px;margin:0 auto .8rem;display:block" alt="Phantom">' +
      '<div class="mtext">Phantom extension not detected. Install it to connect.</div>' +
      '<div class="ph-opts">' +
        '<a href="https://phantom.app/download" target="_blank" class="ph-opt primary" onclick="closePhModal()">Install Phantom Extension</a>' +
        '<div class="ph-div">already installed?</div>' +
        '<button class="ph-opt" onclick="closePhModal();retryConnect()">Retry Connection</button>' +
      '</div>' +
      '<div class="ph-note">Refresh page after installing.</div>';
  }
  document.getElementById('phModalBody').innerHTML = html;
  document.getElementById('phModal').classList.add('show');
}
function closePhModal(){ document.getElementById('phModal').classList.remove('show'); }
function retryConnect(){
  if(window.phantom?.solana?.isPhantom) ENV.inPh = true;
  if(window.solana?.isPhantom) ENV.ext = true;
  if(ENV.inPh || ENV.ext) doConnect();
  else toast('Phantom still not found — please refresh after installing.', 'err');
}

async function doConnect(){
  var nb = document.getElementById('navBtn');
  nb.classList.add('connecting');
  document.getElementById('navLabel').innerHTML = '<span class="spin">↻</span> Connecting...';
  document.getElementById('wbarBtnLabel').innerHTML = '<span class="spin">↻</span>';

  var prov = getProvider();
  if(!prov){ resetNavBtn(); toast('Phantom not found', 'err'); return; }

  try{
    var resp = await prov.connect();
    var addr = resp.publicKey.toString ? resp.publicKey.toString() : String(resp.publicKey);
    S.connected = true; S.addr = addr;
    try{
      prov.on('accountChanged', function(pk){ if(pk){ S.addr=pk.toString(); onConnected(S.addr); fetchBal(S.addr); } else doDisconnect(); });
      prov.on('disconnect', doDisconnect);
    } catch(e){}
    onConnected(addr);
    fetchBal(addr);
  } catch(e){
    resetNavBtn();
    if(e.code === 4001 || (e.message||'').toLowerCase().includes('user rejected')){
      toast('Connection rejected', 'err');
    } else {
      toast('Connect failed: ' + (e.message || String(e)), 'err');
      addLog('Connect error: ' + (e.message || String(e)), 'warn');
    }
  }
}

function doDisconnect(){
  S.connected = false; S.addr = null; S.balance = 0;
  // Stop all presets
  S.presets.forEach(function(p){ if(p.status==='running') p.status='stopped'; });
  if(S.ws) S.ws.send(JSON.stringify({ type:'unwatch' }));
  try{ var p=getProvider(); if(p&&p.disconnect) p.disconnect(); } catch(e){}
  onDisconnected();
  toast('Wallet disconnected', 'inf');
  addLog('Wallet disconnected', 'inf');
}

function resetNavBtn(){
  document.getElementById('navBtn').classList.remove('connecting','connected');
  document.getElementById('navLabel').textContent = 'Connect Wallet';
  document.getElementById('wbarBtnLabel').textContent = 'Connect Phantom';
}

function onConnected(addr){
  document.getElementById('navBtn').classList.remove('connecting'); document.getElementById('navBtn').classList.add('connected');
  document.getElementById('navLabel').innerHTML = '<span class="wdot"></span> ' + shortAddr(addr);
  document.getElementById('wbarAddr').textContent = shortAddr(addr); document.getElementById('wbarAddr').classList.remove('dim');
  document.getElementById('wbarBal').style.display = '';
  document.getElementById('wbarBtnLabel').textContent = 'Disconnect';
  document.getElementById('walletNotice').style.display = 'none';
  document.getElementById('pLock').style.display = 'none';
  document.getElementById('tLock').style.display = 'none';
  document.getElementById('addBtn').disabled = false;
  document.getElementById('mobBanner').style.display = 'none';
  document.getElementById('balPanel').classList.add('show');
  toast('Wallet connected!', 'ok');
  addLog('Connected: ' + shortAddr(addr), 'inf');
  // Fetch token balances after connect
  setTimeout(function(){ fetchTokenBalances(addr); }, 800);
}

function onDisconnected(){
  document.getElementById('navBtn').classList.remove('connected','connecting');
  document.getElementById('navLabel').textContent = 'Connect Wallet';
  document.getElementById('wbarAddr').textContent = 'Not connected'; document.getElementById('wbarAddr').classList.add('dim');
  document.getElementById('wbarBal').style.display = 'none';
  document.getElementById('wbarBtnLabel').textContent = 'Connect Phantom';
  document.getElementById('walletNotice').style.display = '';
  document.getElementById('pLock').style.display = ''; document.getElementById('tLock').style.display = '';
  document.getElementById('addBtn').disabled = true;
  document.getElementById('balPanel').classList.remove('show');
  setMonStatus('idle');
  renderPresets();
  closeForm();
}

/* ══════════════════════════════════════
   PRESET FORM
══════════════════════════════════════ */
function openForm(){
  if(!S.connected){ toast('Connect wallet first','err'); return; }
  if(S.presets.length>=100){ toast('Max 100 presets','err'); return; }
  S.editId = null;
  document.getElementById('pFormTitle').textContent = 'New Preset';
  ['fName','fWallet','fAmt','fToks','fCL'].forEach(function(id){ document.getElementById(id).value=''; document.getElementById(id).disabled=false; });
  S.noCL = false;
  document.getElementById('noCLBtn').classList.remove('on');
  setCurr('SOL'); setSlip(50); updAlloc();
  document.getElementById('pForm').style.display = '';
  document.getElementById('fName').focus();
}
function closeForm(){ document.getElementById('pForm').style.display='none'; S.editId=null; }

function setCurr(c){
  S.currency = c;
  document.getElementById('tgSOL').classList.toggle('on',c==='SOL');
  document.getElementById('tgUSD').classList.toggle('on',c==='USD');
  document.getElementById('fAmt').placeholder = c==='SOL' ? '0.0000 SOL' : '0.00 USD';
  updAlloc();
}

function setSlip(bps, el){
  S.slippage = bps;
  document.querySelectorAll('.slip-btn').forEach(function(b){ b.classList.remove('on'); });
  if(el) el.classList.add('on');
}

function toggleNoCL(){
  S.noCL = !S.noCL;
  document.getElementById('noCLBtn').classList.toggle('on', S.noCL);
  document.getElementById('fCL').disabled = S.noCL;
  if(S.noCL) document.getElementById('fCL').value='';
}

function updAlloc(){
  var amt = parseFloat(document.getElementById('fAmt').value)||0;
  var tok = parseInt(document.getElementById('fToks').value)||0;
  var box = document.getElementById('allocBox');
  if(amt>0 && tok>0){
    var per = amt/tok;
    document.getElementById('allocVal').textContent = per.toFixed(4)+' '+S.currency;
    var sub = '';
    if(S.currency==='SOL' && S.solPrice>0) sub = '≈$'+(per*S.solPrice).toFixed(2)+' USD';
    else if(S.currency==='USD' && S.solPrice>0) sub = '≈'+(per/S.solPrice).toFixed(4)+' SOL';
    document.getElementById('allocSub').textContent = sub;
    box.style.display = 'flex';
  } else { box.style.display='none'; }
}

function savePreset(){
  if(!S.connected){ toast('Connect wallet first','err'); return; }
  var name  = document.getElementById('fName').value.trim();
  var tw    = document.getElementById('fWallet').value.trim();
  var amt   = parseFloat(document.getElementById('fAmt').value);
  var tok   = parseInt(document.getElementById('fToks').value);
  var cl    = parseFloat(document.getElementById('fCL').value);
  var noCL  = S.noCL;
  if(!name)                    { toast('Preset name required','err'); return; }
  if(!tw||tw.length<32)        { toast('Invalid Solana address','err'); return; }
  if(isNaN(amt)||amt<=0)       { toast('Invalid amount','err'); return; }
  if(isNaN(tok)||tok<1||tok>50){ toast('Tokens: 1–50','err'); return; }
  if(!noCL&&(isNaN(cl)||cl<1||cl>99)){ toast('Enter cutloss (1–99) or No Cutloss','err'); return; }
  var data = { name, targetWallet:tw, amount:amt, currency:S.currency, tokens:tok, cutloss:noCL?null:cl, noCutloss:noCL, slippage:S.slippage };
  if(S.editId){
    var idx = S.presets.findIndex(function(p){ return p.id===S.editId; });
    if(idx>-1){ Object.assign(S.presets[idx], data); toast('Updated: '+name,'ok'); addLog('Preset updated: '+name,'inf'); }
  } else {
    S.presets.push(Object.assign({ id:'p_'+Date.now(), status:'idle', createdAt:Date.now() }, data));
    toast('Saved: '+name,'ok'); addLog('Preset saved: '+name,'inf');
  }
  renderPresets(); closeForm();
}

/* ══════════════════════════════════════
   RENDER PRESETS
══════════════════════════════════════ */
function renderPresets(){
  var list = document.getElementById('pList');
  document.getElementById('pCountBadge').textContent = S.presets.length+' / 100';
  if(!S.presets.length){ list.innerHTML='<div class="pempty">♦ No presets yet<br><span style="font-size:.44rem;opacity:.5">Connect wallet &amp; add your first preset</span></div>'; return; }
  var h='';
  S.presets.forEach(function(p){
    var sc=p.status==='running'?'running':p.status==='stopped'?'stopped':'idle';
    var sl=p.status==='running'?'● Running':p.status==='stopped'?'○ Stopped':'○ Idle';
    var al=p.amount+(p.currency==='SOL'?' SOL':' USD');
    var cl=p.noCutloss?'No CL':'CL '+p.cutloss+'%';
    var sl2=(p.slippage||50)/100+'% slip';
    h+='<div class="pitem '+(p.status==='running'?'running':'')+'">';
    h+='<div class="pi-r1"><div class="pi-name">'+esc(p.name)+'</div><div class="pi-st '+sc+'">'+sl+'</div></div>';
    h+='<div class="pi-wallet">↳ '+shortAddr(p.targetWallet)+'</div>';
    h+='<div class="pi-r2"><div class="pi-m"><b>'+al+'</b></div><div class="pi-m"><b>'+p.tokens+'</b> toks</div><div class="pi-m">'+cl+'</div><div class="pi-m">'+sl2+'</div></div>';
    h+='<div class="pi-acts">';
    if(p.status!=='running') h+='<button class="btn-run" onclick="runPreset(\\''+p.id+'\\')" '+(S.connected?'':'disabled')+'>▶ Run</button>';
    else h+='<button class="btn-stop" onclick="openStop(\\''+p.id+'\\')">■ Stop</button>';
    h+='<button class="btn-del" onclick="openDel(\\''+p.id+'\\')">✕</button>';
    h+='</div></div>';
  });
  list.innerHTML=h;
}

/* ══════════════════════════════════════
   RUN PRESET
══════════════════════════════════════ */
function runPreset(id){
  if(!S.connected){ toast('Connect wallet first','err'); return; }
  if(!S.wsAlive){ toast('Worker not connected — wait a moment','err'); return; }
  var p = S.presets.find(function(x){ return x.id===id; });
  if(!p) return;
  p.status = 'running';
  renderPresets();
  // Subscribe to target wallet on worker
  S.ws.send(JSON.stringify({ type:'watch', wallet: p.targetWallet }));
  toast('"'+p.name+'" started — monitoring '+shortAddr(p.targetWallet), 'ok');
  addLog('Preset started: '+p.name+' | watching '+shortAddr(p.targetWallet), 'inf');
}

/* ══════════════════════════════════════
   STOP / DELETE PRESETS
══════════════════════════════════════ */
function openStop(id){ var p=S.presets.find(function(x){return x.id===id;});if(!p)return;S.pendStop=id;document.getElementById('stopTxt').textContent='Stop "'+p.name+'"? Open positions stay open.';document.getElementById('stopModal').classList.add('show'); }
function closeStop(){ document.getElementById('stopModal').classList.remove('show');S.pendStop=null; }
function confirmStop(){
  var p=S.presets.find(function(x){return x.id===S.pendStop;});
  if(p){ p.status='stopped'; toast('Stopped: '+p.name,'inf'); addLog('Preset stopped: '+p.name,'inf'); renderPresets();
    var anyRun=S.presets.some(function(x){return x.status==='running';});
    if(!anyRun && S.ws) S.ws.send(JSON.stringify({type:'unwatch'}));
  }
  closeStop();
}
function openDel(id){ var p=S.presets.find(function(x){return x.id===id;});if(!p)return;S.pendDel=id;document.getElementById('delTxt').textContent='Delete "'+p.name+'"?';document.getElementById('delModal').classList.add('show'); }
function closeDel(){ document.getElementById('delModal').classList.remove('show');S.pendDel=null; }
function confirmDel(){ S.presets=S.presets.filter(function(x){return x.id!==S.pendDel;});toast('Deleted','inf');addLog('Preset deleted','inf');renderPresets();closeDel(); }

/* ══════════════════════════════════════
   RENDER TRADES
══════════════════════════════════════ */
function renderTrades(){
  var body = document.getElementById('tblBody');
  if(!S.positions.length){ body.innerHTML='<div class="tbl-empty">♦ No active positions<br><span style="font-size:.44rem;opacity:.5">Run a preset to start copy trading</span></div>'; return; }
  var h='';
  S.positions.slice().sort(function(a,b){return b.buyTime-a.buyTime;}).forEach(function(pos){
    var pnlAmt=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
    var pnlPct=(pos.curPrice-pos.buyPrice)/pos.buyPrice*100;
    var pc=pnlAmt>0.0001?'pos':pnlAmt<-0.0001?'neg':'zero';
    h+='<div class="tbl-row">';
    h+='<div><div class="tr-tick">'+pos.ticker+'</div><div class="tr-preset">'+esc(pos.presetName)+'</div>';
    if(pos.buyTx) h+='<a href="https://solscan.io/tx/'+pos.buyTx+'" target="_blank" class="tx-link">'+shortAddr(pos.buyTx)+'↗</a>';
    h+='<div class="tr-age">'+fmtAge(Date.now()-pos.buyTime)+'</div></div>';
    h+='<div class="tr-price">$'+fmtP(pos.buyPrice)+'</div>';
    h+='<div class="tr-price">$'+fmtP(pos.curPrice)+'</div>';
    h+='<div class="tr-usd">$'+pos.invested.toFixed(2)+'</div>';
    h+='<div><div class="pv '+pc+'">'+(pnlAmt>=0?'+':'')+pnlAmt.toFixed(2)+'</div><div style="font-family:\\'Share Tech Mono\\',monospace;font-size:.42rem;color:rgba(237,232,220,.26)">'+(pnlPct>=0?'+':'')+pnlPct.toFixed(1)+'%</div></div>';
    h+='<button class="btn-sell" onclick="openSell(\\''+pos.id+'\\')">Cancel &amp; Sell</button>';
    h+='</div>';
  });
  body.innerHTML=h;
}

/* ══════════════════════════════════════
   SELL MODAL
══════════════════════════════════════ */
function openSell(posId){
  var pos=S.positions.find(function(p){return p.id===posId;});if(!pos)return;
  S.pendSell=posId;
  var pnl=(pos.curPrice-pos.buyPrice)/pos.buyPrice*pos.invested;
  document.getElementById('sellTxt').textContent='Close '+pos.ticker+' position via Jupiter market sell?';
  document.getElementById('sellDetail').textContent=pos.ticker+' | Inv: $'+pos.invested.toFixed(2)+' | Price: $'+fmtP(pos.curPrice)+' | PnL: '+fmtPnl(pnl);
  document.getElementById('sellConfirmBtn').disabled=false;
  document.getElementById('sellModal').classList.add('show');
}
function closeSell(){ document.getElementById('sellModal').classList.remove('show');S.pendSell=null; }
async function confirmSell(){
  var pos=S.positions.find(function(p){return p.id===S.pendSell;});
  if(!pos){ closeSell(); return; }
  var btn=document.getElementById('sellConfirmBtn');
  btn.disabled=true; btn.textContent='Signing…';
  var ok=await executeSell(pos, btn);
  if(ok){
    S.positions=S.positions.filter(function(p){return p.id!==S.pendSell;});
    renderTrades(); updateSummary();
  }
  closeSell();
}

/* ══════════════════════════════════════
   SUMMARY
══════════════════════════════════════ */
function updateSummary(){
  var inv=0,cur=0;
  S.positions.forEach(function(p){ inv+=p.invested; cur+=p.invested*(p.curPrice/p.buyPrice); });
  var pnl=cur-inv;
  document.getElementById('sInvested').textContent='$'+inv.toFixed(2);
  document.getElementById('sValue').textContent='$'+cur.toFixed(2);
  var el=document.getElementById('sPnl');
  el.textContent=(pnl>=0?'+':'')+pnl.toFixed(2);
  el.className='pnl-num '+(pnl>0.001?'pos':pnl<-0.001?'neg':'');
  document.getElementById('sPos').textContent=S.positions.length;
}

/* ══════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════ */
function addLog(msg,type){ S.logs.unshift({time:Date.now(),msg,type}); if(S.logs.length>200)S.logs.length=200; renderLog(); }
function renderLog(){
  var w=document.getElementById('logWrap');
  if(!S.logs.length){ w.innerHTML='<div class="log-empty">Waiting for activity...</div>'; return; }
  var h='';
  S.logs.slice(0,100).forEach(function(l){
    var badge=l.type==='buy'?'<span class="lbadge lb-buy">BUY</span>':l.type==='sell'?'<span class="lbadge lb-sell">SELL</span>':l.type==='warn'?'<span class="lbadge lb-warn">WARN</span>':'<span class="lbadge lb-info">INFO</span>';
    h+='<div class="lrow"><span class="ltime">'+fmtTime(new Date(l.time))+'</span><span class="lmsg">'+esc(l.msg)+'</span>'+badge+'</div>';
  });
  w.innerHTML=h;
}
function clearLog(){ S.logs=[]; renderLog(); }

/* ══════════════════════════════════════
   TOAST
══════════════════════════════════════ */
function toast(msg,type){
  var w=document.getElementById('toastWrap');
  var el=document.createElement('div'); el.className='toast '+(type||'inf');
  el.innerHTML='<span>'+(type==='ok'?'✔':type==='err'?'✕':'●')+'</span> '+esc(msg);
  w.appendChild(el);
  setTimeout(function(){ el.classList.add('out'); setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},300); }, 3800);
}

/* ══════════════════════════════════════
   UTILS
══════════════════════════════════════ */
function shortAddr(a){ if(!a||a.length<8)return a||''; return a.slice(0,4)+'…'+a.slice(-4); }
function fmtP(p){ if(!p||isNaN(p))return'0'; if(p>=100)return p.toFixed(2); if(p>=1)return p.toFixed(4); if(p>=0.01)return p.toFixed(6); if(p>=0.0001)return p.toFixed(8); return p.toExponential(3); }
function fmtAge(ms){ var s=Math.floor(ms/1000); if(s<60)return s+'s'; if(s<3600)return Math.floor(s/60)+'m'; return Math.floor(s/3600)+'h'; }
function fmtTime(d){ return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0')+':'+d.getSeconds().toString().padStart(2,'0'); }
function fmtPnl(v){ return(v>=0?'+':'')+v.toFixed(2); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function base64ToUint8Array(b64){ var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i); return arr; }
function uint8ArrayToBase64(arr){ var bin=''; arr.forEach(function(b){bin+=String.fromCharCode(b);}); return btoa(bin); }

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
window.addEventListener('load', function(){
  // Mobile banner
  if(ENV.mob && !ENV.inPh){
    var bn=document.getElementById('mobBanner');
    bn.style.display='block';
    var dl=deepLink(),ul=uniLink();
    bn.innerHTML = ENV.andr
      ? '📱 Android: <a href="'+dl+'">Open in Phantom App</a> to connect &nbsp;·&nbsp; <a href="https://play.google.com/store/apps/details?id=app.phantom" target="_blank">Install Phantom</a>'
      : '📱 iOS: <a href="'+ul+'">Open in Phantom App</a> to connect &nbsp;·&nbsp; <a href="https://apps.apple.com/app/phantom-solana-wallet/id1598432977" target="_blank">Install Phantom</a>';
  }

  // Auto-reconnect wallet
  var prov = getProvider();
  if(prov && prov.isConnected===true && prov.publicKey){
    S.connected=true; S.addr=prov.publicKey.toString();
    onConnected(S.addr); fetchBal(S.addr);
    try{ prov.on('accountChanged',function(pk){if(pk){S.addr=pk.toString();onConnected(S.addr);fetchBal(S.addr);}else doDisconnect();}); prov.on('disconnect',doDisconnect); }catch(e){}
  }

  // Check Phantom Connect API callback
  checkPhantomCallback();

  // Measure actual nav height and update CSS variable dynamically
  (function fixLayout(){
    var nav = document.querySelector('nav');
    if(nav){
      var h = nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-h', Math.ceil(h) + 'px');
    }
    // Also update on resize
    window.addEventListener('resize', function(){
      var nav = document.querySelector('nav');
      if(nav){
        var h = nav.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--nav-h', Math.ceil(h) + 'px');
      }
    });
  })();

  // Connect to Cloudflare Worker WebSocket
  connectWS();

  // Fetch initial prices
  fetchSolPrice();

  // Periodic tasks
  setInterval(fetchSolPrice, 60000);
  setInterval(refreshPrices, 15000);           // real token prices every 15s
  setInterval(function(){ if(S.connected&&S.addr) fetchBal(S.addr); }, 30000);
  // WS keep-alive ping
  setInterval(function(){ if(S.ws&&S.ws.readyState===WebSocket.OPEN) S.ws.send(JSON.stringify({type:'ping'})); }, 25000);

  renderPresets(); renderLog(); updateSummary();
  addLog('#ALL-IN Leorningcild Copy Trading loaded', 'inf');
  if(!ENV.mob&&!ENV.ext&&!ENV.inPh) addLog('Phantom extension not found — install at phantom.app','warn');
  if(ENV.mob&&!ENV.inPh) addLog('Mobile: open inside Phantom App to connect','warn');

  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState === 'visible' && !S.connected){
      var prov = getProvider();
      if(prov){
        ENV.inPh = true; ENV.ext = true;
        if(prov.isConnected && prov.publicKey){
          S.connected = true; S.addr = prov.publicKey.toString();
          onConnected(S.addr); fetchBal(S.addr);
          addLog('Auto-reconnected via Phantom', 'inf');
        } else { doConnect(); }
      }
    }
  });
});
</script>
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

  // Forward messages: browser → Solana RPC WebSocket
  let rpcWs = null;
  let watchedWallet = null;
  let subId = null;

  function connectRpc() {
    rpcWs = new WebSocket('wss://api.mainnet-beta.solana.com');
    rpcWs.onopen = () => {
      server.send(JSON.stringify({ type: 'rpc_connected' }));
      if (watchedWallet) subscribeWallet(watchedWallet);
    };
    rpcWs.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        // Detect account notification (potential swap)
        if (msg.method === 'accountNotification' && watchedWallet) {
          server.send(JSON.stringify({
            type: 'swap_detected',
            wallet: watchedWallet,
            action: 'buy',
            tokenMint: null,
            signature: null,
            raw: msg.params
          }));
        }
        if (msg.id === 1 && msg.result) {
          subId = msg.result;
          server.send(JSON.stringify({ type: 'subscribed', subId }));
        }
      } catch(e) {}
    };
    rpcWs.onclose = () => {
      server.send(JSON.stringify({ type: 'rpc_reconnecting' }));
      setTimeout(connectRpc, 3000);
    };
    rpcWs.onerror = () => {};
  }

  function subscribeWallet(wallet) {
    if (rpcWs && rpcWs.readyState === 1) {
      rpcWs.send(JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'accountSubscribe',
        params: [wallet, { encoding: 'jsonParsed', commitment: 'confirmed' }]
      }));
      server.send(JSON.stringify({ type: 'watching', wallet }));
    }
  }

  server.addEventListener('message', (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'watch' && msg.wallet) {
        watchedWallet = msg.wallet;
        if (!rpcWs || rpcWs.readyState > 1) {
          connectRpc();
        } else {
          subscribeWallet(watchedWallet);
        }
      }
      if (msg.type === 'unwatch') {
        watchedWallet = null;
        if (rpcWs && subId) {
          rpcWs.send(JSON.stringify({ jsonrpc:'2.0', id:2, method:'accountUnsubscribe', params:[subId] }));
        }
      }
      if (msg.type === 'ping') {
        server.send(JSON.stringify({ type: 'pong' }));
      }
    } catch(e) {}
  });

  server.addEventListener('close', () => {
    if (rpcWs) rpcWs.close();
  });

  connectRpc();
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
