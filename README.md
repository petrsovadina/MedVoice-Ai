# MedVoice AI 🩺

**Inteligentní dokumentační asistent pro moderní zdravotnictví**

MedVoice AI je webová aplikace nové generace, která využívá generativní umělou inteligenci (Google Gemini) k automatizaci tvorby zdravotnické dokumentace. Transformuje hlasový záznam konzultace (prezenční i distanční) na strukturované lékařské záznamy v souladu s platnou legislativou ČR.

---

## 🚀 Klíčové Funkce

### 🎙️ Inteligentní Zpracování Hlasu
*   **Diarizace Mluvčích:** Automatické rozlišení řeči mezi lékařem a pacientem.
*   **Multimodální Vstup:** Nahrávání v reálném čase nebo upload souborů (WAV, MP3, M4A).
*   **Karaoke Mód:** Interaktivní přehrávání svázané s textem.

### 🧠 AI Analýza (Secure Backend)
*   **Gemini 2.5 Flash:** Využívá nejnovější stabilní model (prosinec/leden 2025) pro maximální přesnost.
*   **Cloud Functions:** Veškerá AI logika běží na zabezpečeném serveru (Firebase Cloud Functions), API klíče nejsou nikdy vystaveny klientovi.
*   **Strukturovaná Data:** Automatická extrakce diagnóz (ICD-10), medikace a osobních údajů.

### 💾 Správa Dat a Historie
*   **Uživatelské Účty:** Bezpečné přihlášení přes Google (Firebase Auth).
*   **Cloud Historie:** Všechna vyšetření se ukládají do cloudu (Firestore) a jsou dostupná odkudkoliv.
*   **Audio Archiv:** Nahrávky jsou bezpečně uloženy (Firebase Storage).
*   **Offline Ready:** Aplikace funguje i při výpadku internetu díky lokální synchronizaci.

---

## 🛠️ Technický Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
*   **Backend:** Firebase Cloud Functions (Node.js)
*   **Auth:** Firebase Authentication (Google Provider)
*   **Database:** Cloud Firestore
*   **Storage:** Firebase Storage
*   **AI:** Google GenAI SDK (`@google/genai`)

---

## 📦 Instalace a Nastavení

### Prerekvizity
1.  **Node.js** (v18+)
2.  **Firebase CLI**: `npm install -g firebase-tools`
3.  **Google Cloud Project** s povoleným Gemini API.

### 1. Klonování a Instalace
```bash
git clone [url-repozitare]
cd MedVoice-Ai
npm install
cd functions && npm install && cd ..
```

### 2. Konfigurace Firebase
1.  Vytvořte projekt v [Firebase Console](https://console.firebase.google.com/).
2.  Vytvořte webovou aplikaci a získejte konfigurační objekt.
3.  Vytvořte soubor `.env` v kořenovém adresáři s konfigurací Firebase:
    ```env
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    VITE_FIREBASE_STORAGE_BUCKET=...
    VITE_FIREBASE_MESSAGING_SENDER_ID=...
    VITE_FIREBASE_APP_ID=...
    ```

### 3. Konfigurace Cloud Functions (Backend)
### 3. Konfigurace Cloud Functions (Backend)
1.  **Lokální Vývoj:** Vytvořte soubor `functions/.env.local` (tento soubor je ignorován Gitem) podle vzoru `functions/.env.example`:
    ```env
    GOOGLE_GENAI_KEY=vas_gemini_api_klic
    ```
2.  **Produkce:** Pro nasazení použijte Firebase Secrets (vyžaduje Blaze plán):
    ```bash
    firebase functions:secrets:set GOOGLE_GENAI_KEY
    ```

### 4. Spuštění (Lokální Vývoj)
Pro plnou funkčnost (včetně AI) je třeba spustit emulátory funkcí:

1.  **Terminál 1 - Emulátory:**
    ```bash
    firebase emulators:start --only functions
    ```
    *(Ujistěte se, že máte povolené emulátory v `firebase.json`. Port 5001 je výchozí pro funkce).*

2.  **Terminál 2 - Frontend:**
    ```bash
    npm run dev
    ```

Aplikace poběží na `http://localhost:5173` a bude se připojovat k lokálnímu backendu.

---

## 🚢 Nasazení (Deployment)

Aplikace je připravena pro nasazení na **Firebase Hosting**.

```bash
# Sestavení frontendu i backendu
npm run build
cd functions && npm run build && cd ..

# Nasazení (vyžaduje Blaze plán pro Functions)
firebase deploy
```

---

## ⚠️ Legislativní Upozornění
*Aplikace MedVoice AI slouží jako podpůrný nástroj. Výstupy musí být vždy validovány lékařem před vložením do NIS. Aplikace splňuje technické předpoklady pro vedení zdravotnické dokumentace dle vyhlášky č. 444/2024 Sb., ale nenahrazuje lékařský úsudek.*