import { GoogleGenAI, Type, Schema } from "@google/genai";
import { 
  MedicalEntity, 
  TranscriptSegment, 
  ReportType, 
  StructuredReport,
  MedicalDocumentData
} from "../types";

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

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key chybí. Ujistěte se, že je nastavena proměnná prostředí process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * 1. Transcribe Audio
 */
export const transcribeAudio = async (audioBlob: Blob, mimeType: string): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  const ai = getAIClient();
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
  const ai = getAIClient();
  if (!transcript) return [];
  
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
    const ai = getAIClient();
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
    const ai = getAIClient();
    let schema: Schema;
    let promptInstruction: string;

    const medEntities = entities.filter(e => e.category === 'MEDICATION').map(e => e.text).join(", ");
    const diagEntities = entities.filter(e => e.category === 'DIAGNOSIS').map(e => e.text).join(", ");
    const piiEntities = entities.filter(e => e.category === 'PII').map(e => e.text).join(", ");
    
    const contextPrompt = `
    POUŽIJ EXTRAHOVANÉ ENTITY PRO PŘESNOST:
    - Medikace zmíněná v textu: ${medEntities || "Žádná"}
    - Diagnózy zmíněné v textu: ${diagEntities || "Žádné"}
    - Osobní údaje (PII) z textu: ${piiEntities || "Nenalezeny"}
    
    Vyplň pole 'identifikace' a 'poskytovatel' na základě kontextu rozhovoru (pokud zazní jméno pacienta nebo lékaře). Pokud nevíš, nech prázdné nebo použij zástupný text.
    Při vyplňování buď maximálně přesný.`;

    // Common properties definition for Identification
    const identificationProps = {
        identifikace: {
            type: Type.OBJECT,
            properties: {
                jmeno: { type: Type.STRING, description: "Jméno a příjmení pacienta" },
                rodne_cislo_datum_nar: { type: Type.STRING, description: "RČ nebo datum narození" },
                pojistovna: { type: Type.STRING, description: "Kód pojišťovny" }
            },
            required: ["jmeno"]
        },
        poskytovatel: {
            type: Type.OBJECT,
            properties: {
                lekar: { type: Type.STRING, description: "Jméno lékaře" },
                odbornost: { type: Type.STRING },
                datum_cas: { type: Type.STRING, description: "Datum a čas vyšetření" }
            },
            required: ["lekar", "datum_cas"]
        }
    };

    switch (type) {
        case ReportType.AMBULANTNI_ZAZNAM:
            promptInstruction = "Vytvoř detailní Ambulantní záznam (SOAP) dle vyhlášky 444/2024 Sb. Zahrň identifikaci, anamnézu, objektivní nález, diagnózu, plán a povinné poučení pacienta.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    ...identificationProps,
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
                            pouceni: { type: Type.STRING, description: "Informace předaná pacientovi o stavu a léčbě" },
                            kontrola: { type: Type.STRING }
                        }
                    }
                },
                required: ["identifikace", "poskytovatel", "subjektivni", "objektivni", "hodnoceni", "plan"]
            };
            break;

        case ReportType.OSETR_ZAZNAM:
            promptInstruction = "Vytvoř Záznam ošetřovatelské péče.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    ...identificationProps,
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
                required: ["identifikace", "poskytovatel", "subjektivni_potize", "vitalni_funkce"]
            };
            break;

        case ReportType.KONZILIARNI_ZPRAVA:
            promptInstruction = "Vytvoř Konziliární zprávu.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    ...identificationProps,
                    odesilajici_lekar: { type: Type.STRING }, // Duplicate in structure but kept for specific logic if needed, ideally mapped to poskytovatel
                    cilova_odbornost: { type: Type.STRING },
                    duvod_konzilia: { type: Type.STRING },
                    nynnejsi_onemocneni: { type: Type.STRING },
                    dosavadni_lecba: { type: Type.STRING },
                    urgentnost: { type: Type.STRING, enum: ["Běžná", "Akutní", "Neodkladná"] }
                },
                required: ["identifikace", "poskytovatel", "duvod_konzilia", "urgentnost"]
            };
            break;

        case ReportType.POTVRZENI_VYSETRENI:
            promptInstruction = "Vytvoř Potvrzení o návštěvě.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    ...identificationProps,
                    ucel_vysetreni: { type: Type.STRING },
                    doprovod: { type: Type.STRING },
                    doporuceni_rezim: { type: Type.STRING }
                },
                required: ["identifikace", "poskytovatel", "ucel_vysetreni"]
            };
            break;

        case ReportType.DOPORUCENI_LECBY:
            promptInstruction = "Vytvoř Doporučení k léčbě.";
            schema = {
                type: Type.OBJECT,
                properties: {
                    ...identificationProps,
                    diagnoza_hlavni: { type: Type.STRING },
                    navrhovana_terapie: { type: Type.STRING },
                    procedury: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nazev: {type: Type.STRING}, frekvence: {type: Type.STRING} } } },
                    cil_lecby: { type: Type.STRING }
                },
                required: ["identifikace", "poskytovatel", "diagnoza_hlavni"]
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
    
    // Safety check for empty arrays/objects
    if (type === ReportType.AMBULANTNI_ZAZNAM) {
        const d = data as any;
        if (!d.hodnoceni) d.hodnoceni = { diagnozy: [], zaver: "" };
        if (!d.plan) d.plan = { medikace: [], doporuceni: "", pouceni: "", kontrola: "" };
        if (!d.hodnoceni.diagnozy) d.hodnoceni.diagnozy = [];
        if (!d.plan.medikace) d.plan.medikace = [];
    }
    
    // Ensure identification block exists if model hallucinated omitting it
    if (!data.identifikace) {
        data.identifikace = { jmeno: "", rodne_cislo_datum_nar: "" };
    }
    if (!data.poskytovatel) {
        data.poskytovatel = { lekar: "MUDr. Jan Novák", odbornost: "Všeobecné lékařství", datum_cas: new Date().toLocaleString('cs-CZ') };
    }

    const rawTextContent = JSON.stringify(data, null, 2);

    return {
        reportType: type,
        data: data,
        rawTextContent
    };
};