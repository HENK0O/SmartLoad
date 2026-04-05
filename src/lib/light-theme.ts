const LIGHT_OVERRIDES = [
  ["bg-neutral-950", "#fafafa"],
  ["bg-neutral-900", "#ffffff"],
  ["bg-neutral-800", "#f5f5f5"],
  ["bg-neutral-700", "#e5e5e5"],
  ["border-neutral-800", "#e5e5e5"],
  ["border-neutral-700", "#d4d4d4"],
  ["text-neutral-50", "#171717"],
  ["text-neutral-500", "#737373"],
  ["text-neutral-600", "#525252"],
  ["text-neutral-400", "#a3a3a3"],
  ["text-neutral-300", "#525252"],
  ["text-neutral-700", "#404040"],
  ["text-neutral-950", "#0a0a0a"],
  ["text-white", "#171717"],
  ["border-t", null],
  ["border-b", null],
];

function buildLightCSS(): string {
  return `
    html.light body { background-color: #fafafa; color: #171717; }
    html.light .bg-neutral-950 { background-color: #fafafa; }
    html.light .bg-neutral-900 { background-color: #ffffff; }
    html.light .bg-neutral-800 { background-color: #f5f5f5; }
    html.light .bg-neutral-700 { background-color: #e5e5e5; }
    html.light .border-neutral-800 { border-color: #e5e5e5; }
    html.light .border-neutral-700 { border-color: #d4d4d4; }
    html.light .text-neutral-50 { color: #171717; }
    html.light .text-neutral-500 { color: #737373; }
    html.light .text-neutral-600 { color: #525252; }
    html.light .text-neutral-400 { color: #a3a3a3; }
    html.light .text-neutral-300 { color: #525252; }
    html.light .text-neutral-700 { color: #404040; }
    html.light .text-neutral-950 { color: #0a0a0a; }
    html.light .text-white { color: #171717; }
    html.light .placeholder\\:text-neutral-600::placeholder { color: #a3a3a3; }
    html.light .placeholder\\:text-white\\/20::placeholder { color: rgba(23,23,23,0.2); }
    html.light .placeholder\\:text-white\\/30::placeholder { color: rgba(23,23,23,0.3); }
    html.light .hover\\:text-neutral-300:hover { color: #525252; }
    html.light .hover\\:text-neutral-400:hover { color: #737373; }
    html.light .hover\\:border-neutral-700:hover { border-color: #d4d4d4; }
    html.light .hover\\:border-green-500\\/30:hover { border-color: rgba(34,197,94,0.4); }
    html.light .hover\\:border-green-500\\/50:hover { border-color: rgba(34,197,94,0.5); }
    html.light .bg-green-500\\/5 { background-color: rgba(34,197,94,0.08); }
    html.light .bg-green-500\\/10 { background-color: rgba(34,197,94,0.12); }
    html.light .border-green-500\\/20 { border-color: rgba(34,197,94,0.25); }
    html.light .border-green-500\\/30 { border-color: rgba(34,197,94,0.35); }
    html.light .bg-red-500\\/5 { background-color: rgba(239,68,68,0.08); }
    html.light .bg-red-500\\/10 { background-color: rgba(239,68,68,0.12); }
    html.light .border-red-500\\/20 { border-color: rgba(239,68,68,0.25); }
    html.light .shadow-green-500\\/20 { --tw-shadow-color: rgba(34,197,94,0.15); }
    html.light .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05); }
    html.light .backdrop-blur-xl { backdrop-filter: blur(24px); }
    html.light .bg-black\\/60 { background-color: rgba(0,0,0,0.3); }
    html.light .bg-black\\/70 { background-color: rgba(0,0,0,0.3); }
    html.light .bg-neutral-950\\/90 { background-color: rgba(250,250,250,0.95); }
    html.light .hover\\:bg-red-500\\/5:hover { background-color: rgba(239,68,68,0.08); }
    html.light .hover\\:bg-green-500\\/5:hover { background-color: rgba(34,197,94,0.08); }
    html.light .hover\\:bg-neutral-900:hover { background-color: #f5f5f5; }
    html.light .from-green-400 { background-color: #22c55e; }
    html.light .to-green-600 { background-color: #16a34a; }
    html.light .from-green-500 { background-color: #22c55e; }
    html.light .to-green-400 { background-color: #4ade80; }
    html.light .via-green-500 { background-color: #22c55e; }
    html.light .bg-white\\/30 { background-color: rgba(0,0,0,0.1); }
    html.light .text-green-500 { color: #16a34a; }
    html.light .text-green-500\\/80 { color: rgba(22,163,74,0.8); }
    html.light .text-red-500 { color: #dc2626; }
    html.light .text-red-500\\/70 { color: rgba(220,38,38,0.7); }
    html.light .hover\\:text-green-500:hover { color: #16a34a; }
    html.light .hover\\:text-green-400:hover { color: #22c55e; }
    html.light .hover\\:text-red-500:hover { color: #dc2626; }
    html.light .focus\\:ring-green-500\\/50:focus { --tw-ring-color: rgba(22,163,74,0.5); }
    html.light .bg-green-500 { background-color: #22c55e; }
    html.light .border-t { border-top-color: #e5e5e5; }
    html.light .border-b { border-bottom-color: #e5e5e5; }
    html.light .text-neutral-950\\/70 { color: rgba(23,23,23,0.7); }
    html.light .text-neutral-950\\/50 { color: rgba(23,23,23,0.5); }
    html.light .hover\\:text-green-500:hover { color: #16a34a; }
    html.light .hover\\:text-red-500:hover { color: #dc2626; }
    html.light .hover\\:bg-red-500\\/5:hover { background-color: rgba(239,68,68,0.08); }
    html.light .hover\\:border-green-500\\/30:hover { border-color: rgba(22,163,74,0.35); }
    html.light .text-green-400 { color: #22c55e; }
    html.light .text-blue-500 { color: #3b82f6; }
    html.light .text-yellow-500 { color: #eab308; }
    html.light .hover\\:text-green-500:hover { color: #16a34a; }
    html.light .hover\\:text-red-500:hover { color: #dc2626; }
    html.light .hover\\:bg-neutral-800:hover { background-color: #f0f0f0; }
    html.light .hover\\:bg-neutral-700:hover { background-color: #e8e8e8; }
    html.light .border-green-500\\/50 { border-color: rgba(34,197,94,0.5); }
    html.light .bg-white { background-color: #ffffff; }
    html.light .text-gray-400 { color: #9ca3af; }
    html.light .text-gray-500 { color: #6b7280; }
    html.light .text-gray-600 { color: #4b5563; }
    html.light .bg-gray-100 { background-color: #f3f4f6; }
    html.light .bg-gray-200 { background-color: #e5e7eb; }
    html.light .bg-gray-900 { background-color: #111827; }
    html.light .hover\\:bg-white\\/10:hover { background-color: rgba(0,0,0,0.1); }
  `;
}

let styleEl: HTMLStyleElement | null = null;

export function injectLightStyles() {
  if (styleEl) return;
  styleEl = document.createElement("style");
  styleEl.id = "light-theme-overrides";
  styleEl.textContent = buildLightCSS();
  document.head.appendChild(styleEl);
}
