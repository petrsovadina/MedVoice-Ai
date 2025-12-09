import { GoogleGenAI, Type } from "@google/genai";
import { MedicalEntity, StructuredReport, ChatMessage, TranscriptSegment } from "../types";

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

  try {
    const segments: TranscriptSegment[] = JSON.parse(response.text || "[]");
    
    // Construct raw text from segments for backward compatibility and fallback display
    const text = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
    
    return { text, segments };
  } catch (e) {
    console.error("Failed to parse transcription json", e);
    // Fallback: If JSON parsing fails (unlikely with schema), return empty structure or try to extract text manually
    // Ideally, we would have a fallback non-JSON prompt, but for now we assume success or fail hard
    return { text: "Chyba při zpracování přepisu.", segments: [] };
  }
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

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse entities", e);
    return [];
  }
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

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse report", e);
    return {
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      summary: ""
    };
  }
};

/**
 * 4. AI Polish / Correction (Uses Gemini Flash for speed)
 */
export const correctTranscript = async (transcript: string): Promise<string> => {
  if (!apiKey || !transcript) return transcript;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Jsi lékařský editor. Oprav v následujícím textu gramatiku, překlepy a zkontroluj správnost lékařské terminologie. 
    
    DŮLEŽITÉ: 
    - Zachovej formátování diarizace (neměň "Lékař:" a "Pacient:").
    - Zachovej strukturu řádků.
    - Neměň význam textu, pouze opravuj chyby.
    
    Text k opravě:
    ${transcript}`
  });

  return response.text || transcript;
};

/**
 * 5. Chat with Context (Uses Gemini 3 Pro with Thinking for complex reasoning)
 */
export const askMedicalAssistant = async (transcript: string, history: ChatMessage[], question: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");

  // Construct context-aware prompt
  const prompt = `Jsi expertní lékařský asistent. Tvým úkolem je odpovídat na dotazy lékaře POUZE na základě níže uvedeného přepisu konzultace.
  
  Využij své schopnosti hlubokého uvažování (thinking) k analýze kontextu, souvislostí a nepřímých informací v textu.
  
  Pravidla:
  1. Odpovídej stručně, přesně a profesionálně česky.
  2. Pokud informace v přepisu chybí, jasně to uveď.
  3. Cituj konkrétní části přepisu, pokud je to relevantní pro potvrzení tvého tvrzení.
  
  PŘEPIS KONZULTACE:
  ${transcript}
  
  HISTORIE CHATU:
  ${history.map(h => `${h.role === 'user' ? 'Lékař' : 'AI'}: ${h.text}`).join('\n')}
  
  Lékař: ${question}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", 
    contents: prompt,
    config: {
      thinkingConfig: {
        thinkingBudget: 32768
      }
    }
  });

  return response.text || "Omlouvám se, ale nemohu na tento dotaz odpovědět.";
};