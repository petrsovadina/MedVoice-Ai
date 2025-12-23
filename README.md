# MedVoice AI 🩺

**Inteligentní dokumentační platforma pro moderní zdravotnictví**

MedVoice AI je komplexní ekosystém využívající generativní umělou inteligenci (Google Gemini) k automatizaci tvorby zdravotnické dokumentace. Platforma se skládá z veřejné prezentace (Landing Page), samotné lékařské aplikace (Doctor Dashboard) a zabezpečeného cloudu.

---

## 🏛️ Architektura Projektu

Projekt je spravován jako **monorepo**, které sjednocuje tři klíčové komponenty:

| Komponenta | Cesta | Technologie | Popis |
| :--- | :--- | :--- | :--- |
| **Hlavní Aplikace** | `/` (root) | React 19, Vite | Nástroj pro lékaře: nahrávání, diktování, správa pacientů. |
| **Landing Page** | `/landingpage-web` | React 19, Tailwind v4 | Veřejný web s prezentací a AI asistentem. |
| **Backend** | `/functions` | Firebase Functions, Node.js | Bezpečná cloudová logika, integrace s Gemini AI. |

Složka `/services` v rootu obsahuje sdílený kód a API integrace využívané hlavní aplikací.

---

## 🚀 Klíčové Funkce

### 🩺 Aplikace pro Lékaře (Dashboard)
*   **Ambient Scribe:** Pasivní poslech a automatický přepis konzultace lékař-pacient.
*   **Inteligentní Editor:** Interaktivní propojení textu se zvukovým záznamem.
*   **Generování Zpráv:** Automatická tvorba strukturovaných zpráv dle vyhlášky 444/2024 Sb. (Subjektivní, Objektivní, Diagnóza, Plán).
*   **Offline Režim:** Plná funkčnost bez internetu se synchronizací po připojení.

### 🌐 Veřejný Web (Landing Page)
*   **Showcase Technologií:** Interaktivní ukázky funkcí.
*   **AI Chatbot:** Asistent pro dotazy ohledně legislativy a bezpečnosti, poháněný Gemini SDK.

### 🔒 Backend & Bezpečnost
*   **HIPAA/GDPR Compliance:** Bezpečné zpracování a ukládání dat.
*   **Diarizace Mluvčích:** Automatické rozlišení hlasů (Lékař/Pacient).
*   **Gemini 2.0 Flash:** Nejnovější AI model optimalizovaný pro medicínskou analýzu.

---

## 🛠️ Technický Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS, Vite.
*   **Backend:** Firebase Cloud Functions (Node.js 20).
*   **Databáze & Storage:** Cloud Firestore, Firebase Storage.
*   **Autentizace:** Firebase Authentication.
*   **AI:** Google GenAI SDK (Gemini).

---

## 📦 Instalace a Nastavení

### Prerekvizity
*   **Node.js** (verze 20+)
*   **Firebase CLI**: Nainstalujte globálně pomocí `npm install -g firebase-tools`
*   **Google Cloud Project**: S aktivním Gemini API a Firebase službami.

### 1. Stažení Repozitáře
```bash
git clone [url-repozitare]
cd MedVoice-Ai
```

### 2. Instalace Závislostí
Projekt vyžaduje instalaci závislostí pro každou část zvlášť:

```bash
# 1. Hlavní Aplikace (Root)
npm install

# 2. Landing Page
cd landingpage-web && npm install && cd ..

# 3. Backend (Functions)
cd functions && npm install && cd ..
```

### 3. Konfigurace Prostředí (.env)
Pro běh celého ekosystému je potřeba vytvořit tři konfigurační soubory:

#### A. Hlavní Aplikace (`/.env`)
V kořenovém adresáři vytvořte `.env`:
```env
VITE_FIREBASE_API_KEY=vase_api_key
VITE_FIREBASE_AUTH_DOMAIN=vas_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vas_project
VITE_FIREBASE_STORAGE_BUCKET=vas_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

#### B. Landing Page (`/landingpage-web/.env.local`)
V adresáři `landingpage-web` vytvořte `.env.local`:
```env
GEMINI_API_KEY=vas_gemini_api_key_pro_chatbot
```

#### C. Backend (`/functions/.env.local`)
V adresáři `functions` vytvořte `.env.local` pro lokální testování:
```env
GOOGLE_GENAI_KEY=vas_gemini_api_key_pro_backend
```

---

## 💻 Vývoj (Development)

Můžete spouštět jednotlivé části nebo celý systém najednou. Doporučujeme otevřít 3 terminály:

### Terminál 1: Backend (Emulátory)
Spustí lokální Firebase emulátory pro Functions, Firestore a Auth.
```bash
firebase emulators:start --only functions
```

### Terminál 2: Hlavní Aplikace (Lékařský Dashboard)
```bash
npm run dev
```
> Běží na: **http://localhost:5173**

### Terminál 3: Landing Page (Veřejný Web)
```bash
npm run dev --prefix landingpage-web
# nebo cd landingpage-web && npm run dev
```
> Běží na: **http://localhost:3000** (nebo jiném portu, zkontrolujte konzoli)

---

## 🚢 Nasazení (Deployment)

Projekt je konfigurován pro nasazení na **Firebase Hosting** a **Cloud Functions**.

### 1. Build
Nejprve sestavte produkční verze:

```bash
# Sestavení Landing Page (Hlavní webová prezentace)
npm run build:landing

# Sestavení Hlavní Aplikace (volitelné, pokud ji nasazujete samostatně)
npm run build

# Příprava Backend Funkcí
cd functions && npm run build && cd ..
```

### 2. Deploy
Nasazení celého projektu do cloudu:

```bash
firebase deploy
```

> **Poznámka k Hostingu:** Výchozí konfigurace ve `firebase.json` nasazuje jako hlavní web (`public`) obsah z `landingpage-web/dist`. Pokud chcete nasadit Dashboard aplikaci, upravte nastavení hostingu ve `firebase.json`.

---

## ⚠️ Právní Vyloučení Odpovědnosti
*Aplikace MedVoice AI slouží výhradně jako administrativní nástroj pro podporu dokumentace. Výstupy generované umělou inteligencí musí být vždy ověřeny kvalifikovaným zdravotnickým pracovníkem. Nástroj nenahrazuje lékařský úsudek.*