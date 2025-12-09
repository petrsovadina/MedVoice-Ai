
import { GoogleGenAI, Type } from "@google/genai";
import { MedicalEntity, StructuredReport, TranscriptSegment, ReportType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Helper to convert Blob to Base64
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Helper to safely parse JSON from LLM response
 * Robustly handles markdown code blocks and surrounding text.
 */
const cleanAndParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  
  try {
    // 1. Attempt to extract from Markdown code blocks (most common LLM pattern)
    // Matches ```json ... ``` or just ``` ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]) as T;
    }

    // 2. Attempt to find the first valid JSON structure (Object or Array)
    // This handles cases where the model adds "Here is the JSON:" prefix without code blocks
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');

    let start = -1;
    let end = -1;

    // Detect if Object or Array starts first
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
        const potentialJson = text.substring(start, end + 1);
        return JSON.parse(potentialJson) as T;
    }

    // 3. Fallback: Try direct parse (unlikely to succeed if above failed, but worth a shot)
    return JSON.parse(text) as T;

  } catch (e) {
    console.warn("JSON Parse Warning - attempting raw parse failed, returning fallback:", e);
    return fallback;
  }
};

/**
 * 1. Transcribe Audio with Speaker Diarization and Timestamps
 */
export const transcribeAudio = async (audioBlob: Blob, mimeType: string): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  if (!apiKey) throw new Error("API Key chybí");

  const base64Data = await blobToBase64(audioBlob);

  const model = "gemini-2.5-flash"; // Optimized for speed and audio
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `Jsi profesionální lékařský zapisovatel. Tvým úkolem je vytvořit přesný přepis lékařské konzultace z přiloženého audia s časovými značkami.

POVINNÉ ROZLIŠENÍ MLUVČÍCH (DIARIZACE) A ČASOVÁNÍ:
1. Rozděl audio na logické segmenty podle mluvčích.
2. Identifikuj mluvčího (Lékař/Pacient).
3. Odhadni čas začátku a konce každého segmentu v sekundách.
4. Přepisuj doslovně v českém jazyce.

Vrať JSON pole objektů s touto strukturou:
{
  "speaker": "Lékař" | "Pacient",
  "text": "text segmentu",
  "start": číslo (sekundy),
  "end": číslo (sekundy)
}`
        }
      ]
    },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, enum: ["Lékař", "Pacient"] },
                    text: { type: Type.STRING },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER }
                },
                required: ["speaker", "text", "start", "end"]
            }
        }
    }
  });

  const segments = cleanAndParseJSON<TranscriptSegment[]>(response.text, []);
  
  if (segments.length === 0) {
      return { text: "Nepodařilo se zpracovat přepis nebo je záznam prázdný.", segments: [] };
  }

  // Construct raw text from segments for backward compatibility and fallback display
  const text = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
  
  return { text, segments };
};

/**
 * 2. Extract Entities
 */
export const extractEntities = async (transcript: string): Promise<MedicalEntity[]> => {
  if (!apiKey || !transcript) return [];

  const prompt = `Analyzuj následující lékařský přepis a extrahuj klíčové entity. 
  Hledej:
  - SYMPTOM (subjektivní potíže pacienta)
  - DIAGNOSIS (zmíněné diagnózy nebo podezření)
  - MEDICATION (léky a dávkování)
  - PII (osobní údaje - jména, data, adresy)
  
  Vrať JSON pole.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { text: prompt },
        { text: `TRANSCRIPT:\n${transcript}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["SYMPTOM", "MEDICATION", "DIAGNOSIS", "PII", "OTHER"] },
            text: { type: Type.STRING }
          },
          required: ["category", "text"]
        }
      }
    }
  });

  return cleanAndParseJSON<MedicalEntity[]>(response.text, []);
};

/**
 * 3. Generate Structured Report based on Type
 */
const REPORT_PROMPTS: Record<string, string> = {
  [ReportType.VYPIS]: `Vytvoř "VÝPIS ZE ZDRAVOTNICKÉ DOKUMENTACE".
Formát musí vypadat přesně takto:

VÝPIS ZE ZDRAVOTNICKÉ DOKUMENTACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jméno: [Doplň z textu nebo nevyplněno]
RČ: [Doplň z textu nebo nevyplněno]
Registrován od: [Doplň z textu nebo nevyplněno]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OSOBNÍ ANAMNÉZA (SOUHRN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[AI agreguje z historie, pokud je zmíněna]

Chronická onemocnění:
- [ICD-10] - [název]
(pokud není zmíněno, napiš "Bez záznamu v přepisu")

Operace:
- [datum/rok] - [typ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AKTUÁLNÍ STAV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trvale užívané léky:
[Seznam léků z přepisu]

Alergie: [Seznam]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRŮBĚH LÉČBY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Shrnutí aktuální návštěvy]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZÁVĚR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Shrnutí aktuálního zdravotního stavu]

Datum: [Dnešní datum]
Lékař: [MUDr. Jan Novák]`,

  [ReportType.KONZILIUM]: `Vytvoř "KONZILIÁRNÍ ZPRÁVU / ŽÁDOST O KONZILIUM".
Formát:

KONZILIÁRNÍ ZPRÁVA / ŽÁDOST O KONZILIUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ODESÍLAJÍCÍ LÉKAŘ: MUDr. Jan Novák
Datum: [Dnešní datum]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Jméno: [Doplň]
Věk: [Doplň]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DŮVOD KONZILIA (OTÁZKA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Extrahuj klíčovou otázku nebo důvod odeslání]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANAMNÉZA A NYNĚJŠÍ STAV
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Souhrn relevantní pro odborníka]

Hlavní diagnózy: [ICD-10]

Aktuální medikace: [Seznam]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOSAVADNÍ VYŠETŘENÍ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Laboratorní, zobrazovací metody zmíněné v textu]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NALÉHAVOST: [Odhadni: Akutní / Urgentní / Plánované]`,

  [ReportType.ZADANKA]: `Vytvoř "ŽÁDANKU NA VYŠETŘENÍ".
Formát:

ŽÁDANKA NA LABORATORNÍ/ZOBRAZOVACÍ VYŠETŘENÍ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACIENT: [Jméno]
RČ: [Doplň]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TYP VYŠETŘENÍ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Zaškrtni nebo vypiš typ: Laboratorní, RTG, UZ, CT, MR...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POŽADOVANÉ VYŠETŘENÍ (kódy VZP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Navrhni kódy výkonů pokud je lze odvodit, jinak vypiš slovně]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KLINICKÁ OTÁZKA / INDIKACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Diagnóza: [ICD-10] - [Název]
Důvod: [Vysvětlení]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NALÉHAVOST: [Akutně / Urgentně / Plánovaně]`,

  [ReportType.PN]: `Vytvoř "ROZHODNUTÍ O DOČASNÉ PRACOVNÍ NESCHOPNOSTI (PN)".
Formát:

ROZHODNUTÍ O DOČASNÉ PRACOVNÍ NESCHOPNOSTI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZAMĚSTNANEC: [Jméno]
RČ: [Doplň]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRACOVNÍ NESCHOPNOST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Typ: [Nová PN / Prodloužení / Ukončení]

Trvání:
Od: [Datum začátku]
Do: [Odhad datum konce]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNÓZA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ICD-10] - [Název]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REŽIM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Domácí / Ambulantní]
Vycházky: [Ano/Ne]
Kontrola: [Datum kontroly]`,

  [ReportType.POTVRZENI]: `Vytvoř "POTVRZENÍ O NEMOCI".
Formát:

POTVRZENÍ O NEMOCI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Potvrzuji, že
[Jméno], nar. [Datum]

byl/a dne [Dnešní datum] vyšetřen/a pro akutní onemocnění
a nebyl/a způsobilý/á k práci/škole.

Doporučuji vyloučení z kolektivu / domácí režim.

V [Město] dne [Dnešní datum]
MUDr. Jan Novák`,

  [ReportType.HOSPITALIZACE]: `Vytvoř "DOPORUČENÍ K HOSPITALIZACI".
Formát:

DOPORUČENÍ K HOSPITALIZACI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRO ODDĚLENÍ: [Navrhni vhodné oddělení]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACIENT: [Jméno]
RČ: [Doplň]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DŮVOD K HOSPITALIZACI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Hlavní důvod]
Diagnóza: [ICD-10]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANAMNÉZA (SOUHRN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Stručný souhrn]
Medikace: [Seznam]
Alergie: [Seznam]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AKTUÁLNÍ STAV A NÁLEZY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Popis stavu, vitální funkce]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NALÉHAVOST: [Akutní / Urgentní / Plánovaná]`
};

export const generateMedicalReport = async (transcript: string, type: ReportType = ReportType.AMBULANTNI_ZAZNAM): Promise<StructuredReport> => {
  if (!apiKey || !transcript) throw new Error("Missing input");

  // 1. STANDARD SOAP REPORT
  if (type === ReportType.AMBULANTNI_ZAZNAM) {
    const prompt = `Na základě následujícího přepisu konzultace vygeneruj "DENNÍ AMBULANTNÍ ZÁZNAM" ve formátu SOAP (Subjektivní, Objektivní, Hodnocení, Plán) a stručné shrnutí. 
    
    Výstup musí být v češtině. Zahrň navrhované ICD-10 kódy do sekce Assessment.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: prompt },
          { text: `TRANSCRIPT:\n${transcript}` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjective: { type: Type.STRING, description: "Subjektivní potíže pacienta, anamnéza" },
            objective: { type: Type.STRING, description: "Objektivní nález, měření, pozorování" },
            assessment: { type: Type.STRING, description: "Zhodnocení stavu, diagnóza a kód ICD-10" },
            plan: { type: Type.STRING, description: "Terapeutický plán, recepty, režim, kontrola" },
            summary: { type: Type.STRING, description: "Krátké shrnutí" }
          },
          required: ["subjective", "objective", "assessment", "plan", "summary"]
        }
      }
    });

    const result = cleanAndParseJSON<StructuredReport>(response.text, {
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        summary: ""
    });
    return { ...result, reportType: type };
  } 
  
  // 2. SPECIALIZED REPORTS (Markdown/Text based)
  else {
    const promptTemplate = REPORT_PROMPTS[type] || "";
    const prompt = `${promptTemplate}
    
    Vycházej POUZE z informací v přepisu. Pokud informace chybí, použij "[Doplň]" nebo "[?]"
    Výstup vrať jako prostý text uvnitř JSON objektu pod klíčem 'content'.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { text: prompt },
            { text: `TRANSCRIPT:\n${transcript}` }
          ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING, description: "The full text content of the medical document" }
                },
                required: ["content"]
            }
        }
    });

    const result = cleanAndParseJSON<{content: string}>(response.text, { content: "" });
    return { 
        reportType: type,
        content: result.content
    };
  }
};
