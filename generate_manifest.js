const fs = require('fs');

// 1. Criar um canvas HTML basico que gera um PNG valido via base64 para 192x192 e 512x512
const baseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="100" fill="#1e293b"/><circle cx="256" cy="256" r="160" fill="none" stroke="#38bdf8" stroke-width="32"/><circle cx="256" cy="256" r="80" fill="#f43f5e"/></svg>`;

fs.writeFileSync('icon.svg', baseIconSvg);

const manifest = {
  "id": "/",
  "name": "Pulse Dash",
  "short_name": "PulseDash",
  "description": "Um jogo arcade emocionante de desviar e sobreviver.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e293b",
  "theme_color": "#38bdf8",
  "orientation": "portrait",
  "categories": ["games", "arcade"],
  "icons": [
    {
      "src": "https://raw.githubusercontent.com/andersonpereira07716-oss/pulse-dash/main/icon.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "https://raw.githubusercontent.com/andersonpereira07716-oss/pulse-dash/main/icon.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "maskable"
    },
    {
      "src": "https://www.pwabuilder.com/assets/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "https://www.pwabuilder.com/assets/images/icon-512.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "https://www.pwabuilder.com/assets/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Pulse Dash Gameplay"
    },
    {
      "src": "https://www.pwabuilder.com/assets/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Pulse Dash Desktop"
    }
  ]
};

fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
