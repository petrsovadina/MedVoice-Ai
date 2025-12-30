# MedVoice AI 🩺

**Inteligentní dokumentační platforma pro moderní zdravotnictví**

MedVoice AI je komplexní ekosystém využívající generativní umělou inteligenci (Google Gemini 2.5) k automatizaci tvorby zdravotnické dokumentace.

---

## 🏛️ Architektura (Monorepo)

| Komponenta | Cesta | Technologie | Popis |
| :--- | :--- | :--- | :--- |
| **Dashboard** (Lékař) | `/apps/dashboard` | React 19, Vite | Hlavní aplikace pro nahrávání a správu pacientů. |
| **Landing Page** (Web) | `/apps/landing` | React 19, Tailwind v4 | Veřejná prezentace. |
| **Backend** | `/functions` | Cloud Functions v2 | Logika pro komunikaci s Gemini API a zpracování audia. |

---

## 🚀 Rychlý Start (Lokální Vývoj)

### 1. Prerekvizity
*   **Node.js 20+**
*   **Firebase CLI** (`npm install -g firebase-tools`)
*   **Google Cloud Project** (s aktivovaným Gemini API a Firebase Storage)

### 2. Instalace
```bash
git clone [url-repozitare]
cd MedVoice-Ai
npm install  # Nainstaluje závislosti pro celý projekt (workspaces)
```

### 3. Konfigurace Klíčů (.env)

**A. Backend (Lokální testování):**
Vytvořte `functions/.env` (nebo `.env.local`):
```env
GOOGLE_GENAI_KEY=AIzaSy... (Váš Gemini API Key)
```

**B. Dashboard (Frontend):**
Vytvořte `apps/dashboard/.env.local`:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Spuštění
```bash
npm run dev      # Spustí frontendy (Dashboard: localhost:5173, Landing: localhost:3000)
# nebo
npm run emulators # Spustí backend emulátory (Functions, Firestore, Storage)
```

---

## 🚢 Nasazení do Produkce (Deployment)

Pro úspěšné nasazení je nutné dodržet tento postup:

### 1. Build & Deploy
```bash
npm run build      # Sestaví všechny aplikace
firebase deploy    # Nasadí vše (Hosting, Functions, Firestore, Storage)
```

### 2. ⚠️ Konfigurace Produkce (Kritické kroky)
Po prvním nasazení je nutné provést tyto manuální kroky, jinak nebude aplikace fungovat:

#### A. Nastavení API Klíče pro Backend
Soubory `.env` se z bezpečnostních důvodů nenahrávají do Gitu. Pro Cloud Functions je musíte vytvořit:
1.  Vytvořte soubor `functions/.env` s obsahem `GOOGLE_GENAI_KEY=...`
2.  Znovu nasaďte funkce: `firebase deploy --only functions`

#### B. Povolení CORS na Storage (Oprava "Processing..." chyby)
Firebase Storage má defaultně zakázaný přístup z webu. Musíte ho povolit přes Google Cloud Shell:
1.  Otevřete [Google Cloud Console](https://console.cloud.google.com/) > Aktivovat Cloud Shell.
2.  Vytvořte konfiguraci: `echo '[{"origin": ["*"],"method": ["GET", "HEAD", "PUT", "POST", "DELETE"],"maxAgeSeconds": 3600}]' > cors.json`
3.  Aplikujte na váš bucket: `gsutil cors set cors.json gs://<BASKET_NAME>.firebasestorage.app`
    *(Název bucketu zjistíte příkazem `gsutil ls`)*

#### C. Autorizované Domény (Oprava přihlášení)
Aby fungovalo přihlášení přes Google:
1.  Jděte do [Firebase Console](https://console.firebase.google.com/) > Authentication > Settings > Authorized domains.
2.  Přidejte doménu vaší aplikace (např. `dashboard-xxxxx.web.app`).

---

## 🛠️ Technologie
*   **AI:** Gemini 2.5 Flash & Pro (via Google GenAI SDK)
*   **Backend:** Firebase Cloud Functions (2nd Gen), Node.js 20
*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **Infra:** Firebase Hosting, Firestore, Storage

---

## ⚠️ Disclaimer
*MedVoice AI je asistenční nástroj. Veškerá vygenerovaná dokumentace musí být před uložením do zdravotní karty ověřena lékařem.*