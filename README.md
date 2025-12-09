# MedVoice AI 🩺

**Inteligentní dokumentační asistent pro moderní zdravotnictví**

MedVoice AI je webová aplikace nové generace, která využívá generativní umělou inteligenci (Google Gemini) k automatizaci tvorby zdravotnické dokumentace. Transformuje hlasový záznam konzultace (prezenční i distanční) na strukturované lékařské záznamy v souladu s platnou legislativou ČR.

---

## ⚖️ Legislativní Rámec a Standardy

Aplikace je navržena tak, aby generované výstupy splňovaly požadavky na vedení zdravotnické dokumentace dle platných norem:

*   **Vyhláška č. 444/2024 Sb.** o zdravotnické dokumentaci (struktura záznamů).
*   **Zákon č. 372/2011 Sb.** o zdravotních službách (informovaný souhlas, negativní revers, poučení).
*   **Standardy NCEZ** (Národní centrum elektronického zdravotnictví).

---

## 📋 Podporované Typy Dokumentace

Systém automaticky rozpozná kontext rozhovoru a vytvoří příslušný typ dokumentu:

### 1. Záznam o poskytnuté zdravotní službě (Ambulantní záznam)
*   **Dle:** §3–§6 Vyhlášky 444/2024 Sb.
*   **Funkce:** Automatická strukturace do formátu SOAP (Subjektivní, Objektivní, Hodnocení, Plán).
*   **Obsah:** Identifikace, důvod návštěvy, fyzikální nález, diagnostický závěr, terapeutický plán.

### 2. Výpis ze zdravotnické dokumentace
*   **Dle:** Standardů pro předávání péče (zaměstnavatel, pojišťovna, PL).
*   **Funkce:** Agregace historie, chronických onemocnění a medikace do přehledného souhrnu.

### 3. Konziliární zpráva / Žádanka
*   **Dle:** Metodiky pro sdílení péče mezi specialisty.
*   **Funkce:** Extrakce klíčové klinické otázky a relevantní anamnézy pro konzultujícího lékaře.

### 4. Záznam o distanční konzultaci (Telemedicína)
*   **Dle:** §5 odst. 1 písm. e) Vyhlášky 444/2024 Sb.
*   **Funkce:** Přepis telefonických hovorů s identifikací volajícího, důvodu kontaktu a doporučeného postupu.

### 5. Pracovní neschopnost a Potvrzení
*   **Funkce:** Generování podkladů pro ČSSZ a zaměstnavatele na základě diagnózy a prognózy.

---

## 🚀 Klíčové Funkce Aplikace

### 🎙️ Inteligentní Zpracování Hlasu
*   **Diarizace Mluvčích:** Automatické rozlišení řeči mezi **Lékařem** a **Pacientem**.
*   **Multimodální Vstup:** Podpora nahrávání v reálném čase i uploadu existujících souborů (WAV, MP3, M4A).
*   **Karaoke Mód:** Interaktivní přehrávání, kdy kliknutí na text v editoru přeskočí na přesný čas v audiu.

### 🧠 AI Analýza (Google Gemini)
*   **Medical Reasoning:** Model `gemini-2.5-flash` trénovaný na pochopení lékařského kontextu.
*   **Strukturovaná Data:** Automatická extrakce entit:
    *   **Diagnózy** (návrh ICD-10 kódů)
    *   **Medikace** (dávkování, interakce)
    *   **Symptomy**
    *   **Osobní údaje** (PII)

### ✍️ WYSIWYG Editor
*   Plnohodnotný textový editor (postavený na Tiptap).
*   Možnost manuálních úprav vygenerovaného textu před finalizací.
*   Export do PDF.

---

## 🛠️ Technický Stack

*   **Frontend:** React 18, TypeScript, Tailwind CSS
*   **AI Engine:** Google Gen AI SDK (`@google/genai`)
*   **Audio:** Web Audio API (MediaRecorder)
*   **Editor:** Tiptap Headless Editor
*   **Architektura:** Client-side SPA (Single Page Application) bez nutnosti backendu pro zpracování audia (vše přes API).

## 📦 Instalace a Spuštění

1.  **Klonování repozitáře:**
    ```bash
    git clone [url-repozitare]
    ```
2.  **Konfigurace:**
    *   Aplikace vyžaduje API klíč pro Google Gemini.
    *   Nastavte proměnnou prostředí `API_KEY` v `services/geminiService.ts` nebo použijte `.env` soubor (dle vašeho build procesu).
3.  **Spuštění:**
    *   Otevřete v prohlížeči přes lokální server (např. `Live Server` ve VS Code nebo `npx serve`).

## ⚠️ Upozornění (Disclaimer)

*Aplikace MedVoice AI slouží jako podpůrný nástroj pro zdravotnické pracovníky. Výstupy z umělé inteligence musí být vždy zkontrolovány a validovány lékařem před vložením do oficiální zdravotnické dokumentace (NIS). Poskytovatel nenese odpovědnost za případné nepřesnosti v automatickém přepisu.*