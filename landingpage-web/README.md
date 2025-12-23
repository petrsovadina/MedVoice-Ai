# MedVoice-AI Web & Landing Page

Toto je zdrojový kód pro veřejnou prezentaci (Landing Page) projektu MedVoice-AI.

## Technologie

*   **React 19**
*   **Vite**
*   **Tailwind CSS (v4)**
*   **Framer Motion** (animace)
*   **Google Gemini SDK** (AI Chat)

## Lokální Vývoj

Před spuštěním se ujistěte, že máte v tomto adresáři soubor `.env.local` s vaším API klíčem:

```env
GEMINI_API_KEY=vys_api_klic
```

### Spuštění
```bash
npm install
npm run dev
```

### Build
Pro manuální sestavení (standardně spouštěno z root adresáře přes `npm run build:landing`):

```bash
npm run build
```

Výstup bude ve složce `dist/`.

## Struktura
*   `/components` - UI komponenty (Hero, Features, AIChat)
*   `/services` - Integrace s Gemini API
*   `index.css` - Globální styly a Tailwind import
