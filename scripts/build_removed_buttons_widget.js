const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const cleanImg = fs.readFileSync(path.join(dir, 'hero_clean_no_right_buttons.png')).toString('base64');
const beforeImg = fs.readFileSync(path.join(dir, 'hero_improved_preview_bangkok.png')).toString('base64');

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
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">UPDATED</span>
          <h2 class="text-[var(--foreground)] font-bold text-lg">Destination Buttons Removed Preview</h2>
        </div>
        <p class="text-[var(--muted-foreground)] text-xs mt-1">Right-hand vertical buttons stack completely removed from the hero section</p>
      </div>

      <!-- Toggle View -->
      <div class="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 gap-1">
        <button id="btn-after" onclick="showView('after')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm">
          ✨ After (Clean Hero)
        </button>
        <button id="btn-before" onclick="showView('before')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all">
          ⏪ Before (With Buttons)
        </button>
      </div>
    </div>

    <!-- Image Display Screen -->
    <div class="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950">
      <img id="preview-img" src="data:image/png;base64,${cleanImg}" class="w-full h-auto object-cover rounded-xl transition-all duration-300" alt="Clean Hero Preview" />
      
      <!-- Callout Badge -->
      <div id="callout" class="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-white shadow-lg">
        <div class="flex items-center gap-3">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span><strong>Result:</strong> Right-side destination buttons stack removed. The panoramic sunset background is now fully open and uncluttered.</span>
        </div>
        <span class="text-emerald-400 font-semibold">&check; Ultra Clean Luxury View</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-emerald-400 mb-1">Clean Panoramic Aesthetics</div>
        <div class="text-[var(--muted-foreground)]">Removing the vertical column removes visual friction and allows the Thailand landscape and Wat Arun sunset to be the hero focus.</div>
      </div>
      <div class="p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <div class="font-bold text-amber-400 mb-1">Smooth Background Cycle Preserved</div>
        <div class="text-[var(--muted-foreground)]">The typewriter and background scenes continue to rotate smoothly without needing the button list taking up screen space.</div>
      </div>
    </div>
  </div>

  <script>
    const views = {
      after: {
        src: 'data:image/png;base64,${cleanImg}',
        badge: '<strong>Result:</strong> Right-side destination buttons stack removed. The panoramic sunset background is now fully open and uncluttered.',
        status: '&check; Ultra Clean Luxury View'
      },
      before: {
        src: 'data:image/png;base64,${beforeImg}',
        badge: '<strong>Previous:</strong> Right-side destination buttons stack visible over the sunset background.',
        status: 'Previous Layout'
      }
    };

    function showView(viewKey) {
      const v = views[viewKey];
      document.getElementById('preview-img').src = v.src;
      document.getElementById('callout').querySelector('span:nth-child(2)').innerHTML = v.badge;
      document.getElementById('callout').querySelector('span:last-child').innerHTML = v.status;
      
      if (viewKey === 'after') {
        document.getElementById('btn-after').className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm';
        document.getElementById('btn-before').className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all';
      } else {
        document.getElementById('btn-before').className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all shadow-sm';
        document.getElementById('btn-after').className = 'px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all';
      }
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'buttons_removed_preview_widget.html'), html, 'utf8');
console.log('buttons_removed_preview_widget.html generated! Bytes:', html.length);

