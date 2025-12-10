
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { 
  MedicalEntity, 
  TranscriptSegment, 
  ReportType, 
  StructuredReport,
  MedicalDocumentData
} from "../types";

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
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const cleanAndParseJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]) as T;
    }
    
    try {
        return JSON.parse(text) as T;
    } catch (e) {
        // continue
    }

    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIdx = firstBrace;
        endIdx = text.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        startIdx = firstBracket;
        endIdx = text.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx !== -1) {
        return JSON.parse(text.substring(startIdx, endIdx + 1)) as T;
    }

    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("JSON Parse Warning:", e);
    return fallback;
  }
};

/**
 * 1. Transcribe Audio
 */
export const transcribeAudio = async (audioBlob: Blob, mimeType: string): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  if (!apiKey) throw new Error("API Key chybí");
  const base64Data = await blobToBase64(audioBlob);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: base64Data } },
        { text: `Jsi profesionální lékařský zapisovatel. Tvým úkolem je provést DOSLOVNÝ přepis audio záznamu.
        Pokud je nahrávka nekvalitní, snaž se zachytit maximum kontextu.
        
        Vrať výsledek POUZE jako JSON objekt.
        Formát: { "segments": [{ "speaker": "Lékař"|"Pacient"|"Sestra", "text": "...", "start": 0, "end": 0 }] }` }
      ]
    },
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                segments: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            speaker: { type: Type.STRING, enum: ["Lékař", "Pacient", "Sestra"] },
                            text: { type: Type.STRING },
                            start: { type: Type.NUMBER },
                            end: { type: Type.NUMBER }
                        },
                        required: ["speaker", "text", "start", "end"]
                    }
                }
            },
            required: ["segments"]
        }
    }
  });

  const data = cleanAndParseJSON<{segments: TranscriptSegment[]}>(response.text, { segments: [] });
  const segments = data.segments || [];
  
  const text = segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n');
  
  if (!text && segments.length === 0) {
      // Emergency fallback if JSON fails but model produced text
      if (response.text && !response.text.includes("{")) {
          return { text: response.text, segments: [] };
      }
      return { text: "Nepodařilo se přepsat audio. Zkuste to prosím znovu.", segments: [] };
  }

  return { text, segments };
};

/**
 * 2. Extract Entities
 */
export const extractEntities = async (transcript: string): Promise<MedicalEntity[]> => {
  if (!apiKey || !transcript) return [];
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { text: "Extrahuj entity: SYMPTOM, DIAGNOSIS (ICD-10 pokud zmíněno), MEDICATION (vč. dávkování), PII (osobní údaje)." },
        { text: `TRANSCRIPT:\n${transcript}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            entities: {
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
      }
    }
  });
  
  const data = cleanAndParseJSON<{entities: MedicalEntity[]}>(response.text, { entities: [] });
  return data.entities || [];
};

/**
 * 3. Classify Document Type
 */
export const classifyDocument = async (transcript: string): Promise<ReportType> => {
    const prompt = `Analyzuj přepis lékařské konzultace a urči nejvhodnější typ dokumentu.
    
    1. AMBULANTNI_ZAZNAM: Standardní vyšetření, SOAP.
    2. OSETR_ZAZNAM: Sestra, měření vitálů, podání léků.
    3. KONZILIARNI_ZPRAVA: Žádost jinému specialistovi.
    4. POTVRZENI_VYSETRENI: Potvrzení návštěvy.
    5. DOPORUCENI_LECBY: RHB, Lázně.

    Vrať enum hodnotu.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ text: prompt }, { text: transcript }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        enum: [
                            ReportType.AMBULANTNI_ZAZNAM,
                            ReportType.OSETR_ZAZNAM,
                            ReportType.KONZILIARNI_ZPRAVA,
                            ReportType.POTVRZENI_VYSETRENI,
                            ReportType.DOPORUCENI_LECBY
                        ]
                    }
                }
            }
        }
    });

    const data = cleanAndParseJSON<{type: ReportType}>(response.text, { type: ReportType.AMBULANTNI_ZAZNAM });
    return data.type;
};

/**
 * 4. Generate Structured Document (Schema-Driven + Entity-Aware)
 */
export const generateStructuredDocument = async (transcript: string, type: ReportType, entities: MedicalEntity[] = []): Promise<StructuredReport> => {
    let schema: Schema;
    let promptInstruction: string;

    // Build context from entities to ground the model
    const medEntities = entities.filter(e => e.category === 'MEDICATION').map(e => e.text).join(", ");
    const diagEntities = entities.filter(e => e.category === 'DIAGNOSIS').map(e => e.text).join(", ");
    
    const contextPrompt = `
    POUŽIJ EXTRAHOVANÉ ENTITY PRO PŘESNOST:
    - Medikace zmíněná v textu: ${medEntities || "Žádná"}
    - Diagnózy zmíněné v textu: ${diagEntities || "Žádné"}
    
    Při vyplňování schématu buď maximálně přesný. Nevymýšlej si léky, které nezazněly.`;

    switch (type) {
        case ReportType.AMBULANTNI_ZAZNAM:
            promptInstruction = "Vytvoř detailní Ambulantní záznam (SOAP). Do 'subjektivni' dej stížnosti pacienta. Do 'objektivni' dej nálezy lékaře. Rozepiš medikaci do pole 'plan.medikace'.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    subjektivni: { type: Type.STRING },
                    objektivni: { type: Type.STRING },
                    hodnoceni: { 
                        type: Type.OBJECT, 
                        properties: {
                            diagnozy: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { kod: {type: Type.STRING}, nazev: {type: Type.STRING} } } },
                            zaver: { type: Type.STRING }
                        }
                    },
                    plan: { 
                        type: Type.OBJECT, 
                        properties: {
                            medikace: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nazev: {type: Type.STRING}, davkovani: {type: Type.STRING} } } },
                            doporuceni: { type: Type.STRING },
                            kontrola: { type: Type.STRING }
                        }
                    }
                },
                required: ["subjektivni", "objektivni", "hodnoceni", "plan"]
            };
            break;

        case ReportType.OSETR_ZAZNAM:
            promptInstruction = "Vytvoř Záznam ošetřovatelské péče. Extrahuj vitální funkce (TK, P, TT) pokud zazněly.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    subjektivni_potize: { type: Type.STRING },
                    vitalni_funkce: {
                        type: Type.OBJECT,
                        properties: {
                            tk: { type: Type.STRING },
                            p: { type: Type.STRING },
                            tt: { type: Type.STRING },
                            spo2: { type: Type.STRING }
                        }
                    },
                    provedene_vykony: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nazev: {type: Type.STRING}, cas: {type: Type.STRING} } } },
                    ordinace_lekare: { type: Type.STRING },
                    poznamka_sestry: { type: Type.STRING }
                },
                required: ["subjektivni_potize", "vitalni_funkce"]
            };
            break;

        case ReportType.KONZILIARNI_ZPRAVA:
            promptInstruction = "Vytvoř Konziliární zprávu. Jasně formuluj klinickou otázku v 'duvod_konzilia'.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    odesilajici_lekar: { type: Type.STRING },
                    cilova_odbornost: { type: Type.STRING },
                    duvod_konzilia: { type: Type.STRING },
                    nynnejsi_onemocneni: { type: Type.STRING },
                    dosavadni_lecba: { type: Type.STRING },
                    urgentnost: { type: Type.STRING, enum: ["Běžná", "Akutní", "Neodkladná"] }
                },
                required: ["duvod_konzilia", "urgentnost"]
            };
            break;

        case ReportType.POTVRZENI_VYSETRENI:
            promptInstruction = "Vytvoř Potvrzení o návštěvě. Datum a čas musí odpovídat kontextu.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    datum_cas_navstevy: { type: Type.STRING },
                    ucel_vysetreni: { type: Type.STRING },
                    doprovod: { type: Type.STRING },
                    doporuceni_rezim: { type: Type.STRING }
                },
                required: ["datum_cas_navstevy"]
            };
            break;

        case ReportType.DOPORUCENI_LECBY:
            promptInstruction = "Vytvoř Doporučení k léčbě. Pokud zazněly procedury (např. 'vířivka', 'masáž'), dej je do seznamu.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    diagnoza_hlavni: { type: Type.STRING },
                    navrhovana_terapie: { type: Type.STRING },
                    procedury: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nazev: {type: Type.STRING}, frekvence: {type: Type.STRING} } } },
                    cil_lecby: { type: Type.STRING }
                },
                required: ["diagnoza_hlavni"]
            };
            break;

        default: 
             return generateStructuredDocument(transcript, ReportType.AMBULANTNI_ZAZNAM, entities);
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { text: `Jsi lékařský asistent. ${promptInstruction} ${contextPrompt}` },
                { text: `TRANSCRIPT:\n${transcript}` }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    });

    const data = cleanAndParseJSON<MedicalDocumentData>(response.text, {} as any);
    
    // Safety check for empty arrays to prevent UI crashes
    if (type === ReportType.AMBULANTNI_ZAZNAM) {
        const d = data as any;
        if (!d.hodnoceni) d.hodnoceni = { diagnozy: [], zaver: "" };
        if (!d.plan) d.plan = { medikace: [], doporuceni: "", kontrola: "" };
        if (!d.hodnoceni.diagnozy) d.hodnoceni.diagnozy = [];
        if (!d.plan.medikace) d.plan.medikace = [];
    }

    const rawTextContent = JSON.stringify(data, null, 2);

    return {
        reportType: type,
        data: data,
        rawTextContent
    };
};
