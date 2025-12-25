# MedVoice AI 🩺

**Inteligentní dokumentační platforma pro moderní zdravotnictví**

MedVoice AI je komplexní ekosystém využívající generativní umělou inteligenci (Google Gemini) k automatizaci tvorby zdravotnické dokumentace. Platforma se skládá z veřejné prezentace (Landing Page), samotné lékařské aplikace (Doctor Dashboard) a zabezpečeného cloudu.

---

## 🏛️ Architektura Projektu

Projekt je spravován jako **monorepo**, které sjednocuje tři klíčové komponenty:

| Komponenta | Cesta | Technologie | Popis |
| :--- | :--- | :--- | :--- |
| **Hlavní Aplikace (Dashboard)** | `/apps/dashboard` | React 19, Vite | Nástroj pro lékaře: nahrávání, diktování, správa pacientů. |
| **Landing Page** | `/apps/landing` | React 19, Tailwind v4 | Veřejný web s prezentací a AI asistentem. |
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

### 2. Instalace Závislostí (Standardizováno)
Díky **NPM Workspaces** stačí instalovat závislosti pouze jednou v kořenovém adresáři:

```bash
npm install
```
*Tento příkaz automaticky nainstaluje balíčky pro Dashboard, Landing Page i Backend.*

### 3. Konfigurace Prostředí (.env)
Pro běh celého ekosystému je potřeba vytvořit tři konfigurační soubory:

#### A. Hlavní Aplikace (`apps/dashboard/.env`)
V adresáři `apps/dashboard` vytvořte `.env`:
```env
VITE_FIREBASE_API_KEY=vase_api_key
VITE_FIREBASE_AUTH_DOMAIN=vas_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=vas_project
VITE_FIREBASE_STORAGE_BUCKET=vas_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

#### B. Landing Page (`apps/landing/.env.local`)
V adresáři `apps/landing` vytvořte `.env.local`:
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

### 💻 Standardizovaný Vývoj (Turborepo)

Díky nasazení **Turborepo** můžete spouštět vývojové prostředí pro všechny aplikace jedním příkazem.

#### 1. Spuštění Frontendů (Dashboard + Landing)
```bash
npm run dev
# nebo
npx turbo run dev
```
> *   Dashboard: **http://localhost:5173**
> *   Landing Page: **http://localhost:3000**

#### 2. Spuštění Backendu (Firebase Emulators)
Emulátory se spouští separátně, protože blokují terminál a vyžadují specifické prostředí.

```bash
# 1. Build backendu (jednorázově nebo při změně)
cd functions && npm run build

# 2. Start emulátorů
firebase emulators:start --only functions
```

---

## 🚢 Nasazení (Deployment)

Projekt je konfigurován pro nasazení na **Firebase Hosting** a **Cloud Functions**.

### 1. Build (Turborepo)
Sestavení celého projektu (všech aplikací) najednou:

```bash
npm run build
# nebo
npx turbo run build
```
*Tento příkaz paralelně sestaví Dashboard, Landing Page i Backend (transpilaci TS).*

### 2. Deploy
Nasazení celého projektu do cloudu:

```bash
firebase deploy
```

> **Poznámka k Hostingu:** Výchozí konfigurace nasazuje Landing Page (`apps/landing/dist`) jako veřejný web. Dashboard (`apps/dashboard/dist`) není ve výchozím nastavení nasazen na veřejnou URL, pokud nezměníte `firebase.json`.

---

## ⚠️ Právní Vyloučení Odpovědnosti
*Aplikace MedVoice AI slouží výhradně jako administrativní nástroj pro podporu dokumentace. Výstupy generované umělou inteligencí musí být vždy ověřeny kvalifikovaným zdravotnickým pracovníkem. Nástroj nenahrazuje lékařský úsudek.*