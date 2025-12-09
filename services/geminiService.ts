import { GoogleGenAI, Type } from "@google/genai";
import { MedicalEntity, StructuredReport, TranscriptSegment } from "../types";

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
 * 3. Generate Structured Report (SOAP Note)
 */
export const generateMedicalReport = async (transcript: string): Promise<StructuredReport> => {
  if (!apiKey || !transcript) throw new Error("Missing input");

  const prompt = `Na základě následujícího přepisu konzultace vygeneruj strukturovanou lékařskou zprávu ve formátu SOAP (Subjektivní, Objektivní, Hodnocení, Plán) a stručné shrnutí. Výstup musí být v češtině, profesionálním lékařském stylu.`;

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
          assessment: { type: Type.STRING, description: "Zhodnocení stavu, diagnóza" },
          plan: { type: Type.STRING, description: "Terapeutický plán, medikace, další postup" },
          summary: { type: Type.STRING, description: "Krátké shrnutí pro rychlý přehled" }
        },
        required: ["subjective", "objective", "assessment", "plan", "summary"]
      }
    }
  });

  return cleanAndParseJSON<StructuredReport>(response.text, {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      summary: ""
  });
};