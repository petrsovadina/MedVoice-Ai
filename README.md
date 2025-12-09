# MedVoice AI 🩺

MedVoice AI je moderní webová aplikace navržená pro zdravotníky, která využívá sílu generativní umělé inteligence (Google Gemini) k automatizaci administrativy. Transformuje hlasové záznamy z konzultací na strukturovanou lékařskou dokumentaci, šetří čas lékařů a zvyšuje kvalitu záznamů.

## 🚀 Klíčové Funkce

### 🎙️ Inteligentní Zpracování Hlasu
*   **Nahrávání a Upload:** Možnost nahrávat konzultace přímo v prohlížeči nebo nahrát existující soubory (WAV, MP3, M4A).
*   **Pokročilý Přepis:** Využívá model `gemini-2.5-flash` pro přesný přepis češtiny s lékařskou terminologií.
*   **Diarizace Mluvčích:** Automaticky rozlišuje řeč mezi **Lékařem** a **Pacientem**.
*   **Časové Značky:** Každý segment textu je synchronizován s audiem.

### 📝 Automatizace Dokumentace
*   **SOAP Zprávy:** Automaticky generuje strukturovaný výstup:
    *   **S**ubjektivní (Anamnéza)
    *   **O**bjektivní (Nález)
    *   **A**ssessment (Hodnocení/Diagnóza)
    *   **P**lán (Terapie)
*   **Extrakce Entit:** Detekuje a kategorizuje symptomy, medikaci, diagnózy a osobní údaje (PII).

### ✍️ Interaktivní Práce s Textem
*   **Smart Editor:** Rich-text editor (postavený na Tiptap) s funkcemi inspirovanými aplikací Notion ("/" příkazy, bublinové menu).
*   **Synchronizované Přehrávání:** Kliknutím na text se audio přehrávač přesune na přesný čas (funkce karaoke).
*   **AI Korektura:** Jedním kliknutím opraví gramatiku a překlepy v celém dokumentu.

### 🧠 AI Asistent (Reasoning)
*   **Kontextový Chat:** Integrovaný chatbot využívající model `gemini-3-pro-preview` s funkcí **Thinking Mode**. Lékař se může doptávat na detaily z vyšetření (např. *"Zmínil pacient alergie?"*) a AI odpovídá na základě hluboké analýzy kontextu přepisu.

## 🛠️ Technický Stack

*   **Frontend:** React 18, TypeScript
*   **Styling:** Tailwind CSS, Lucide React (ikony)
*   **AI Engine:** Google Gen AI SDK (`@google/genai`)
*   **Editor:** Tiptap (Headless WYSIWYG)
*   **Build:** Native ES Modules via `esm.sh` (No-build setup)

## 📦 Instalace a Spuštění

Projekt je koncipován jako Single Page Application běžící přímo v prohlížeči.

1.  **Stáhněte repozitář.**
2.  **Nastavení API Klíče:**
    *   Aplikace vyžaduje API klíč pro Google Gemini.
    *   V aktuální verzi aplikace očekává klíč v `process.env.API_KEY`. Pro lokální spuštění si zajistěte, že je tento klíč dostupný (např. úpravou `services/geminiService.ts` pro dev účely nebo použitím prostředí, které env vars injektuje).
3.  **Spuštění:**
    *   Otevřete složku projektu pomocí lokálního serveru (kvůli CORS a ES modulům).
    *   Například pomocí `npx serve` nebo rozšíření "Live Server" ve VS Code.

## 📄 Struktura Projektu

*   `App.tsx` - Hlavní orchestrátor aplikace a stavů.
*   `services/geminiService.ts` - Vrstva pro komunikaci s AI modely (Prompty, JSON parsing).
*   `components/TranscriptEditor.tsx` - Komponenta editoru a přehrávače.
*   `components/AnalysisDisplay.tsx` - Vizualizace analýzy, entit a chat s asistentem.
*   `components/AudioRecorder.tsx` - Rozhraní pro nahrávání.

## ⚠️ Upozornění

MedVoice AI slouží jako asistenční nástroj pro zefektivnění práce lékaře. Veškeré výstupy generované umělou inteligencí musí být před uložením do zdravotnické dokumentace zkontrolovány a validovány kvalifikovaným zdravotníkem.

---
*Vyvinuto s důrazem na efektivitu a bezpečnost v rámci projektu MediAI MVP.*