const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const r1 = fs.readFileSync(path.join(dir, 'reel_1_gold_logo.png')).toString('base64');
const r2 = fs.readFileSync(path.join(dir, 'reel_2_luxury_yacht.png')).toString('base64');
const r3 = fs.readFileSync(path.join(dir, 'reel_3_cliffside_villa.png')).toString('base64');
const r4 = fs.readFileSync(path.join(dir, 'reel_4_beachfront_lagoon.png')).toString('base64');
const oldBefore = fs.readFileSync(path.join(dir, 'current_user_intro.png')).toString('base64');

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
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">7-STAR LUXURY REEL</span>
          <h2 class="text-[var(--foreground)] font-bold text-lg">WOW THAILAND • Cinema Intro Reel (MP4)</h2>
        </div>
        <p class="text-[var(--muted-foreground)] text-xs mt-1">Pre-rendered 1080p Commercial: 3D Sculpted Gold Logo &bull; Superyacht Expeditions &bull; Cliffside Pool Villas &bull; Private Lagoon</p>
      </div>

      <!-- Scene Tabs -->
      <div class="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1 flex-wrap">
        <button id="btn-r1" onclick="setScene('r1')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm">
          👑 Scene 1: 3D Gold Logo
        </button>
        <button id="btn-r2" onclick="setScene('r2')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          🛥️ Scene 2: Superyacht
        </button>
        <button id="btn-r3" onclick="setScene('r3')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          🌅 Scene 3: Cliff Villa
        </button>
        <button id="btn-r4" onclick="setScene('r4')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          🏝️ Scene 4: Island Lagoon
        </button>
        <button id="btn-old" onclick="setScene('old')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white transition-all border border-rose-500/20">
          ❌ Old (Flat Screen)
        </button>
      </div>
    </div>

    <!-- Image Display Screen -->
    <div class="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950">
      <img id="preview-img" src="data:image/png;base64,${r1}" class="w-full h-auto object-cover rounded-xl transition-all duration-300" alt="Luxury Commercial Preview" />
      
      <!-- Callout Badge -->
      <div id="callout" class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-white shadow-lg">
        <div class="flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span id="callout-text"><strong>Scene 1 (3D Gold Logo):</strong> Sculpted 24k mirror-finish gold Thai royal pagoda emblem + 3D WOW THAILAND typography with volumetric cinema lighting.</span>
        </div>
        <span id="callout-tag" class="text-amber-400 font-semibold">&check; 3D Gold Reveal</span>
      </div>
    </div>

    <!-- Video Reel Breakdown -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">Scene 1: 3D Gold Reveal</div>
        <div class="text-[var(--muted-foreground)]">24k metallic Thai royal pagoda crest with specular light gleams on dark obsidian glass.</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">Scene 2: Luxury Yacht</div>
        <div class="text-[var(--muted-foreground)]">Cinematic aerial drone shot of a superyacht gliding across turquoise Andaman waters.</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">Scene 3: Cliffside Pool Villa</div>
        <div class="text-[var(--muted-foreground)]">5-star private villa with an infinity pool, champagne service, and twilight horizon.</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">Scene 4: Private Lagoon</div>
        <div class="text-[var(--muted-foreground)]">Overwater bungalows and white powdery sands surrounded by translucent coral reefs.</div>
      </div>
    </div>
  </div>

  <script>
    const scenes = {
      r1: {
        src: 'data:image/png;base64,${r1}',
        text: '<strong>Scene 1 (3D Gold Logo):</strong> Sculpted 24k mirror-finish gold Thai royal pagoda emblem + 3D WOW THAILAND typography with volumetric cinema lighting.',
        tag: '&check; 3D Gold Reveal'
      },
      r2: {
        src: 'data:image/png;base64,${r2}',
        text: '<strong>Scene 2 (Luxury Yacht):</strong> Ultra-luxury superyacht slicing through crystal-clear turquoise waters framed by limestone karst islands.',
        tag: '🛥️ Private Yacht Charter'
      },
      r3: {
        src: 'data:image/png;base64,${r3}',
        text: '<strong>Scene 3 (Cliffside Villa):</strong> 5-star private villa with infinity pool, champagne service, and twilight Andaman sunset horizon.',
        tag: '🌅 5-Star Luxury Villa'
      },
      r4: {
        src: 'data:image/png;base64,${r4}',
        text: '<strong>Scene 4 (Island Lagoon):</strong> World-class private island resort with overwater suites, powdery white sands, and emerald coral waters.',
        tag: '🏝️ Tropical Lagoon'
      },
      old: {
        src: 'data:image/png;base64,${oldBefore}',
        text: '<strong>Previous Version:</strong> Flat, plain dark blue screen with CSS text dots without any video or luxury branding.',
        tag: '❌ Old Flat Text'
      }
    };

    function setScene(key) {
      const item = scenes[key];
      document.getElementById('preview-img').src = item.src;
      document.getElementById('callout-text').innerHTML = item.text;
      document.getElementById('callout-tag').innerHTML = item.tag;

      ['btn-r1', 'btn-r2', 'btn-r3', 'btn-r4', 'btn-old'].forEach(id => {
        const btn = document.getElementById(id);
        if (id === 'btn-' + key) {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all';
        }
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'luxury_intro_widget.html'), html, 'utf8');
console.log('luxury_intro_widget.html updated! Bytes:', html.length);
