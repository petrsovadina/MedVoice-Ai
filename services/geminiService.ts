
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { 
  MedicalEntity, TranscriptSegment, ReportType, StructuredReport
} from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try { return await fn(); } catch (error: any) {
      lastError = error;
      const isRateLimit = error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED');
      if (isRateLimit && i < maxRetries - 1) { await sleep(Math.pow(2, i) * 1000); continue; }
      throw error;
    }
  }
  throw lastError;
}

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
const cleanAndParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(codeBlockMatch ? codeBlockMatch[1] : text) as T;
  } catch (e) { return fallback; }
};

export const transcribeAudio = async (audioBlob: Blob, mimeType: string): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  const reader = new FileReader();
  const base64Data = await new Promise<string>(r => { reader.onloadend = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(audioBlob); });
  const ai = getAIClient();
  const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Jsi lékařský zapisovatel. Proveď doslovný přepis v JSON: {segments: [{speaker, text, start, end}]}" }] },
    config: { responseMimeType: "application/json" }
  }));
  const data = cleanAndParseJSON<{segments: TranscriptSegment[]}>(response.text, { segments: [] });
  return { text: data.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n'), segments: data.segments };
};

export const summarizeTranscript = async (transcript: string, useThinking: boolean = false): Promise<string> => {
    const model = useThinking ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model,
        contents: `
          Vytvoř profesionální, EXTRÉMNĚ KOMPAKTNÍ klinický souhrn. Používej telegrafický styl.
          Cílem je maximum informací na minimální ploše. Žádné úvodní věty, žádná vata.

          STRUKTURA:
          ### **[S] Subjektivně**
          - Telegrafický výčet potíží a anamnézy (např. "2m insomnie, anhedonie, pracovní stres").
          
          ### **[O] Objektivně**
          - Klinický nález, stav vědomí, orientace. 
          - Vitální funkce pokud jsou zmíněny.

          ### **[Dg] Diagnóza**
          - Seznam diagnóz vč. MKN-10 kódů.

          ### **[P] Plán**
          - Medikace (název, síla, schéma).
          - Doporučení a termín kontroly.

          Pravidla:
          - Používej lékařskou terminologii a zkratky.
          - Vše v odrážkách pro rychlou orientaci.

          PŘEPIS:
          ${transcript}
        `,
        config: { thinkingConfig: useThinking ? { thinkingBudget: 32768 } : { thinkingBudget: 0 } }
    });
    return response.text || "";
};

export const extractEntities = async (transcript: string): Promise<MedicalEntity[]> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Z textu extrahuj entity do JSON formátu.
      Kategorie: DIAGNOSIS, MEDICATION, SYMPTOM, PII, OTHER.
      Extrahuj pouze klinicky významná slova.
      JSON: {"entities": [{"category": "...", "text": "..."}]}
      TEXT:
      ${transcript}
    `,
    config: { responseMimeType: "application/json" }
  });
  return cleanAndParseJSON<{entities: MedicalEntity[]}>(response.text, { entities: [] }).entities || [];
};

export const detectIntents = async (summary: string): Promise<ReportType[]> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Urči dokumenty k vygenerování. Vždy zahrň AMBULATORY_RECORD.
          Léky -> PRESCRIPTION_DRAFT. Neschopenka -> SICK_LEAVE_DRAFT.
          JSON {intents: []}. 
          TEXT:
          ${summary}`,
        config: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON<{intents: ReportType[]}>(response.text, { intents: [ReportType.AMBULATORY_RECORD] }).intents;
};

export const generateStructuredDocument = async (summary: string, type: ReportType, entities: MedicalEntity[], useThinking: boolean = false): Promise<StructuredReport> => {
    const model = useThinking ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    const ai = getAIClient();
    let schema = "";
    switch(type) {
      case ReportType.AMBULATORY_RECORD: schema = `{"subjective_notes":"", "objective_notes":"", "vitals":{"bp":"", "pulse":"", "temp":"", "spo2":"", "weight":""}, "diagnosis_text":"", "icd_10_code":"", "plan_text":""}`; break;
      case ReportType.PRESCRIPTION_DRAFT: schema = `{"items":[{"medication_name":"", "strength":"", "dosage_text":"", "dosage_structured":"", "quantity":1}]}`; break;
      case ReportType.REFERRAL_REQUEST: schema = `{"target_specialty":"", "urgency":"routine", "clinical_question":"", "anamnesis_summary":"", "diagnosis_code":""}`; break;
      case ReportType.SICK_LEAVE_DRAFT: schema = `{"diagnosis_code":"", "start_date":"2025-01-01", "regime_notes":""}`; break;
      default: schema = `{"notes":""}`;
    }
    const response = await ai.models.generateContent({
        model,
        contents: `Vygeneruj strukturovaný dokument ${type} v JSON. 
          Dodržuj věcnost a kompaktnost.
          Entity: ${JSON.stringify(entities)}
          Schéma: ${schema}
          Souhrn: ${summary}`,
        config: { responseMimeType: "application/json" }
    });
    return { id: Math.random().toString(36).substr(2, 9), reportType: type, data: cleanAndParseJSON<any>(response.text, {}) };
};
