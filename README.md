
<!-- Short, friendly README designed for new visitors -->

# Vibe WiFi — Client-side WiFi Coverage Heatmap

A tiny, privacy-first single-page app to build a WiFi coverage heatmap from in-browser speedtests.

Why this exists
----------------
You should be able to measure and visualise local WiFi performance without sending your data to a cloud service. Vibe WiFi collects measurements in your browser, shows them on a map as an intuitive heatmap, and lets you export/import your data as JSON.

Highlights
----------
- Run Cloudflare speedtests from the browser for the current map location.
- Heatmap visualization (switch between download/upload intensity).
- Export/import your points as JSON — all storage is local (no server required).
- Lightweight, single-file frontend ideal for self-hosting or local use.

Quick start
-----------
Requirements: Node.js 16+ and npm

```bash
npm install
npm run dev
```

Open the dev URL printed by Vite (usually http://localhost:5173).

Build for production
--------------------
```bash
npm run build
npm run preview
```

How it works (short)
--------------------
- Map: Leaflet + OpenStreetMap for tiles.
- Heatmap: heatmap.js via the Leaflet plugin (`HeatmapOverlay`).
- Speed tests: `@cloudflare/speedtest` (widget is used programmatically and hidden while running).
- Storage: `localStorage` keys — `wifi_points`, `show_points`, `heat_metric`.

Storage format
--------------
`wifi_points` is an array of objects like:

```json
{
	"lat": 50.12345,
	"lng": 8.12345,
	"download": 72.5,
	"upload": 21.3
}
```

Export / Import
---------------
- Use the Export button to download `wifi_points.json`.
- Use Import to load a previously exported JSON file; the app replaces stored points with the uploaded file.

Privacy and best practices
--------------------------
- All measurements live in the browser unless you explicitly export them. No server-side storage.
- Export files contain location data; treat them as sensitive.
- For more reliable results, run multiple tests per location and average them.

Development notes
-----------------
- Keep dependencies up to date and prefer stable releases.
- Add unit tests around JSON parsing (import/export) if you extend the feature set.

Next improvements (ideas)
------------------------
- Import merge mode (merge by coordinates with tolerance).
- Store timestamps per measurement and allow time-based filtering.
- Add a small UX flow for editing/merging points.

Credits
-------
Built with React, Vite, Leaflet and heatmap.js. Uses Cloudflare's in-browser speedtest.

---

## Previous README (kept for history)

```markdown
This open-source web app visualizes WiFi coverage as a heatmap. Users can run speed tests at different locations on a map, leveraging @cloudflare/speedtest and browser geolocation. Results are displayed interactively using Leaflet.

Features
- Interactive map for adding measurement points
- Speed tests using @cloudflare/speedtest
- Geolocation API integration
- Heatmap visualization

Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`

Tech Stack
- React + Vite
- Leaflet
- @cloudflare/speedtest

License
MIT
```
