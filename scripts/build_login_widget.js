const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/rajda/.gemini/antigravity/brain/50c8ec7f-dbeb-481c-a8ea-921ffa64dc2d';
const imgBase64 = fs.readFileSync(path.join(dir, 'login_modal_updated_passwords.png')).toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-2">
  <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl p-4 shadow-xl max-w-4xl mx-auto">
    <div class="flex items-center justify-between gap-3 mb-3 border-b border-[var(--border)] pb-3">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">UPDATED & VERIFIED</span>
          <h2 class="text-[var(--foreground)] font-bold text-lg">Quick Access Demo Accounts</h2>
        </div>
        <p class="text-[var(--muted-foreground)] text-xs mt-1">Unified WOW THAILAND passwords • Instant 1-click login auto-fill</p>
      </div>
    </div>

    <!-- Image Display Screen -->
    <div class="rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-slate-950">
      <img src="data:image/png;base64,${imgBase64}" class="w-full h-auto object-cover rounded-xl" alt="Updated Login Modal" />
    </div>

    <!-- Credentials Table -->
    <div class="mt-4 rounded-xl border border-white/10 overflow-hidden text-xs">
      <table class="w-full text-left">
        <thead class="bg-white/5 border-b border-white/10 text-amber-400 font-semibold">
          <tr>
            <th class="p-2.5">Portal Role</th>
            <th class="p-2.5">Username / ID</th>
            <th class="p-2.5">Password</th>
            <th class="p-2.5">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 text-[var(--foreground)]">
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">Superadmin (Full Access)</td>
            <td class="p-2.5 font-mono text-emerald-400">superadmin</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">Admin (Operators)</td>
            <td class="p-2.5 font-mono text-emerald-400">admin</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">Vehicle Vendor (Fleet Listings)</td>
            <td class="p-2.5 font-mono text-emerald-400">vendor</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">Hotel Vendor (Hotel PMS)</td>
            <td class="p-2.5 font-mono text-emerald-400">hotel_vendor</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">Flight Vendor (Flight PMS)</td>
            <td class="p-2.5 font-mono text-emerald-400">flight_vendor</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">🛡️ Sub-Admin Portal (Lead Operations)</td>
            <td class="p-2.5 font-mono text-emerald-400">subadmin</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">💼 B2B Portal (Travel Partner Agency)</td>
            <td class="p-2.5 font-mono text-emerald-400">partner_a</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
          <tr class="hover:bg-white/[0.02]">
            <td class="p-2.5 font-bold">🚗 Driver Portal (WOW THAILAND Fleet)</td>
            <td class="p-2.5 font-mono text-emerald-400">driver@gmail.com</td>
            <td class="p-2.5 font-mono text-amber-300">admin@2026</td>
            <td class="p-2.5 text-emerald-400 font-semibold">&check; Active</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'login_passwords_widget.html'), html, 'utf8');
console.log('login_passwords_widget.html generated! Bytes:', html.length);

