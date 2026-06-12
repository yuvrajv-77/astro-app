# DevJSON Sandbox - Online JSON Tool Suite

An offline-first, private-by-design developer utility suite for formatting, beautifying, validating, and minifying JSON data. Includes an interactive Tree Explorer and quick format converters (XML, CSV, YAML).

Developed using **Astro**, **React**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Key Features

* **JSON Formatter & Beautifier:** Collapse and inspect properties dynamically. Customize indentation sizes (2 spaces, 4 spaces, 8 spaces, or tabs).
* **JSON Validator:** Real-time syntax diagnostics. Catch missing braces, quotes, or trailing commas with double-click line focusing.
* **JSON Minifier:** Strip formatting to squeeze size.
* **Format Converters:** Convert valid JSON to XML, CSV, or YAML formats on the fly.
* **JSON Diagnostics HUD:** Real-time metrics including file size, node count, recursive nesting depth, and browser parse speed.
* **Local History Cache:** Caches your last 10 formatting runs locally in browser storage.
* **Absolute Privacy:** 100% of formatting, parsing, and conversions run client-side. No data is ever sent to servers.

---

## 🛠️ Code Architecture

The core JSON Editor tool is fully modularized to promote testability and performance:

```text
src/components/json-editor/
├── constants.ts          # Default mock JSON data and configuration constants
├── useJSONEditorState.ts # State hook encapsulating core logic, metric computation, and history
├── InputPanel.tsx        # Left editor panel (textarea, gutter numbers, clear/copy controls)
├── ControlDeck.tsx       # Central column (preferences, HUD, conversions, import URL dialog)
└── OutputPanel.tsx       # Right inspector panel (Tree Explorer, plain text tabs, download controls)
```

---

## 📦 Local Development

Verify you have Node.js **v22.12.0+** installed, then run:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript checking
npm run typecheck

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Production Deployment Guide

The suite is built as a **fully static web application** which can be hosted on any static provider (Cloudflare Pages, Netlify, Vercel, or GitHub Pages) for maximum performance and zero server costs.

### Hosting on Cloudflare Pages (Recommended)

1. **Connect Repository:** Log in to your Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** and link your Git repository.
2. **Build Settings:**
   * **Framework Preset:** `Astro`
   * **Build Command:** `npm run build`
   * **Build Output Directory:** `dist`
3. **Environment Setup:**
   * Cloudflare Pages automatically detects the `.node-version` file inside the repository and builds using **Node.js v22.12.0**.
4. **Deploy:** Click **Save and Deploy**. Cloudflare will compile and distribute your static pages on their edge CDN in seconds.

### SEO & Sitemap Configurations
* The application automatically outputs a sitemap on build via `@astrojs/sitemap` integration at `dist/sitemap-index.xml`.
* Update the `site` domain in `astro.config.mjs` and `public/robots.txt` if you register a custom domain.
