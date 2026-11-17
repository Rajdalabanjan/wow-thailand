const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const bangkokImg = fs.readFileSync(path.join(dir, 'hero_improved_preview_bangkok.png')).toString('base64');
const pattayaImg = fs.readFileSync(path.join(dir, 'hero_improved_preview_pattaya.png')).toString('base64');
const phuketImg = fs.readFileSync(path.join(dir, 'hero_improved_preview_phuket.png')).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-2">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl p-4 shadow-xl max-w-5xl mx-auto">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-[var(--border)] pb-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">EXPERT GRADE</span>
          <h2 class="text-[var(--foreground)] font-bold text-lg">Interactive Enhanced UI Preview</h2>
        </div>
        <p class="text-[var(--muted-foreground)] text-xs mt-1">Live synchronized destination matching • Zero typewriter layout shifts • Optimized widget elevation</p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
        <button id="btn-bkk" onclick="showTab('bkk')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm">
          🏛️ Bangkok (Default)
        </button>
        <button id="btn-pty" onclick="showTab('pty')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          🏖️ Pattaya
        </button>
        <button id="btn-pkt" onclick="showTab('pkt')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          🏝️ Phuket
        </button>
      </div>
    </div>

    <!-- Image Display Screen -->
    <div class="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950">
      <img id="preview-img" src="data:image/png;base64,${bangkokImg}" class="w-full h-auto object-cover rounded-xl transition-all duration-300" alt="Enhanced UI Preview" />
      
      <!-- Callout Badge -->
      <div id="callout" class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-white shadow-lg">
        <div class="flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span><strong>Active Sync:</strong> Bangkok selected on right &rarr; Search box automatically syncs to <em>&quot;Bangkok, Thailand&quot;</em></span>
        </div>
        <span class="text-amber-400 font-semibold">&check; Zero Layout Jitter</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">1. Live City Match</div>
        <div class="text-[var(--muted-foreground)]">Right-side city cards drive the search bar automatically (Bangkok &rarr; Bangkok, Thailand).</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">2. Stable Baseline Width</div>
        <div class="text-[var(--muted-foreground)]">Headline container has a stable optical boundary so typewriter animation never causes jumps.</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">3. Balanced Padding</div>
        <div class="text-[var(--muted-foreground)]">Search bar elevated cleanly above the floating WhatsApp &amp; Luzia AI concierge.</div>
      </div>
    </div>
  </div>

  <script>
    const images = {
      bkk: 'data:image/png;base64,${bangkokImg}',
      pty: 'data:image/png;base64,${pattayaImg}',
      pkt: 'data:image/png;base64,${phuketImg}'
    };

    const callouts = {
      bkk: '<strong>Active Sync:</strong> Bangkok selected on right &rarr; Search box automatically syncs to <em>&quot;Bangkok, Thailand&quot;</em>',
      pty: '<strong>Active Sync:</strong> Pattaya selected on right &rarr; Sunset beach theme + Search box syncs to <em>&quot;Pattaya, Thailand&quot;</em>',
      pkt: '<strong>Active Sync:</strong> Phuket selected on right &rarr; Tropical Andaman theme + Search box syncs to <em>&quot;Phuket, Thailand&quot;</em>'
    };

    function showTab(city) {
      document.getElementById('preview-img').src = images[city];
      document.getElementById('callout').querySelector('span:nth-child(2)').innerHTML = callouts[city];
      
      const btns = { bkk: 'btn-bkk', pty: 'btn-pty', pkt: 'btn-pkt' };
      Object.keys(btns).forEach(k => {
        const el = document.getElementById(btns[k]);
        if (k === city) {
          el.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm';
        } else {
          el.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all';
        }
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'preview_widget.html'), html, 'utf8');
console.log('preview_widget.html generated! Bytes:', html.length);

