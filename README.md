# Breeze

![Breeze logo](https://github.com/stel79/breeze-weather/raw/main/logo.svg)

Breeze is a minimalist weather dashboard built with React, TypeScript, and Vite. It uses the free Open‑Meteo APIs to provide current conditions, hourly charts, and a 7‑day forecast.

Live app

- Live: https://stel79.github.io/breeze-weather/
- Download ZIP: https://github.com/stel79/breeze-weather/archive/refs/heads/main.zip

Quick start (developer)

1. Clone the repo:

   ```bash
   git clone https://github.com/stel79/breeze-weather.git
   cd breeze-weather
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. (Optional) Start the proxy (the app uses Open‑Meteo directly; the proxy is provided for switching providers or hiding keys):

   ```bash
   npm run proxy
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open the app in your browser:

   - http://localhost:5173

Build & deploy (production)

1. Build the production site:

   ```bash
   npm run build
   ```

2. The build output is in `dist/`. You can deploy that folder to any static host (GitHub Pages, Netlify, Vercel, S3, etc.). The repo contains a GitHub Actions workflow that can build and deploy to GitHub Pages.

Step-by-step user guide (how to use Breeze)

1. Open the app:
   - Use the live URL or run locally.

2. Search for a city:
   - Type a city name into the search box (for example, "London").
   - Wait a moment — suggestions will appear.
   - Click a suggestion to select it.

3. Read the current conditions:
   - After selecting a city the "Current weather" card will show the current temperature, a short weather description, wind speed, and update time.

4. View the hourly chart:
   - The hourly chart shows temperature for the next 24 hours. Hover points to see exact values and timestamps.

5. See the 7-day forecast:
   - The 7-day forecast cards show a daily summary (high / low temperatures, weather icon/description, and precipitation totals).

6. Toggle units:
   - Use the °C / °F segmented control in the top right to switch units. The UI updates temperatures and wind units accordingly.

7. Use your location:
   - Click "Use my location" to let the browser share your coordinates (you must allow location permission).
   - The app will fetch local weather for your location.

8. Recent locations (local cache):
   - Breeze stores up to 6 recent locations in your browser localStorage. Click a recent location chip to reload its weather instantly.

9. Download source / ZIP:
   - If you want the source code, use the "Download source ZIP" link on the download page or the repo's Code → Download ZIP.

Privacy & notes

- Breeze uses Open‑Meteo (no API key). If you add a provider that requires a key, do not commit the key to the repository — use the included Express proxy or environment variables on your server.
- The app caches only recent **location metadata** in your browser localStorage (city name, lat/lon); it does not send or store any personal data on the server.
- The "Use my location" feature asks your browser for permission; location data stays in the browser and is used only to fetch weather for the coordinates.

Troubleshooting

- No suggestions when searching:
  - Check your network connection. The app queries the Open‑Meteo geocoding endpoint.

- The app shows a build error during GitHub Actions:
  - In the repository Actions tab, open the failed job logs, copy the error output, and paste it here — I can help debug.
  - Ensure Node 18 is available and `npm ci` completes successfully.

- Pages not published:
  - In the repository Settings → Pages, confirm the source (GitHub Actions or branch) and that the workflow has run successfully. If the workflow failed, check Actions logs.

Contributing

- Feel free to open issues or pull requests. Suggestions:
  - Add precipitation/wind visualizations.
  - Add unit preferences persisted across sessions.
  - Add a screenshot and social preview images.

License: MIT
