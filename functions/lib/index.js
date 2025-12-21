"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStructuredDocument = exports.detectIntents = exports.extractEntities = exports.summarizeTranscript = exports.transcribeAudio = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const genai_1 = require("@google/genai");
const types_1 = require("./types");
admin.initializeApp();
// Initialize Gemini Client
// Requires GOOGLE_GENAI_KEY in environment variables
const getAIClient = () => {
    const apiKey = process.env.GOOGLE_GENAI_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'API Key not configured on server.');
    }
    return new genai_1.GoogleGenAI({ apiKey });
};
const assertAuth = (context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    return context.auth;
};
const cleanAndParseJSON = (text, fallback) => {
    if (!text)
        return fallback;
    try {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        return JSON.parse(codeBlockMatch ? codeBlockMatch[1] : text);
    }
    catch (e) {
        return fallback;
    }
};
// 1. Transcribe Audio
exports.transcribeAudio = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
    assertAuth(context);
    const { audio, mimeType } = data; // audio is base64 string
    if (!audio || !mimeType) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing audio or mimeType');
    }
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType, data: audio } },
                    { text: "Jsi lékařský zapisovatel. Proveď doslovný přepis v JSON: {segments: [{speaker, text, start, end}]}" }
                ]
            },
            config: { responseMimeType: "application/json" }
        });
        const parsed = cleanAndParseJSON(response.text, { segments: [] });
        return {
            text: parsed.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n'),
            segments: parsed.segments
        };
    }
    catch (error) {
        console.error("Transcription failed", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 2. Summarize
exports.summarizeTranscript = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { transcript, useThinking } = data;
    // Using 2.5 Flash as standard, 2.5 Pro for thinking if needed (though mapping logic simplified here)
    const model = useThinking ? "gemini-2.5-pro" : "gemini-2.5-flash";
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model,
            contents: `
              Vytvoř profesionální, EXTRÉMNĚ KOMPAKTNÍ klinický souhrn. Používej telegrafický styl.
              Cílem je maximum informací na minimální ploše. Žádné úvodní věty, žádná vata.
              
              STRUKTURA:
              ### **[S] Subjektivně**
              - Telegrafický výčet potíží a anamnézy.
              ### **[O] Objektivně**
              - Klinický nález, stav vědomí.
              ### **[Dg] Diagnóza**
              - Seznam diagnóz vč. MKN-10.
              ### **[P] Plán**
              - Medikace, doporučení, kontrola.
              
              PŘEPIS:
              ${transcript}
            `,
        });
        return { summary: response.text || "" };
    }
    catch (error) {
        console.error("Summarization failed", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 3. Extract Entities
exports.extractEntities = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { transcript } = data;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
              Z textu extrahuj entity do JSON formátu.
              Kategorie: DIAGNOSIS, MEDICATION, SYMPTOM, PII, OTHER.
              JSON: {"entities": [{"category": "...", "text": "..."}]}
              TEXT:
              ${transcript}
            `,
            config: { responseMimeType: "application/json" }
        });
        const parsed = cleanAndParseJSON(response.text, { entities: [] });
        return { entities: parsed.entities || [] };
    }
    catch (error) {
        console.error("Extraction failed", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 4. Detect Intents
exports.detectIntents = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { summary } = data;
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Urči dokumenty k vygenerování. Vždy zahrň AMBULATORY_RECORD.
                  Léky -> PRESCRIPTION_DRAFT. Neschopenka -> SICK_LEAVE_DRAFT.
                  JSON {intents: []}. 
                  TEXT:
                  ${summary}`,
            config: { responseMimeType: "application/json" }
        });
        const parsed = cleanAndParseJSON(response.text, { intents: [types_1.ReportType.AMBULATORY_RECORD] });
        return { intents: parsed.intents };
    }
    catch (error) {
        console.error("Intent detection failed", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// 5. Generate Report
exports.generateStructuredDocument = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { summary, type, entities, useThinking } = data;
    const model = useThinking ? "gemini-2.5-pro" : "gemini-2.5-flash";
    let schema = "";
    switch (type) {
        case types_1.ReportType.AMBULATORY_RECORD:
            schema = `{"subjective_notes":"", "objective_notes":"", "vitals":{"bp":"", "pulse":"", "temp":"", "spo2":"", "weight":""}, "diagnosis_text":"", "icd_10_code":"", "plan_text":""}`;
            break;
        case types_1.ReportType.PRESCRIPTION_DRAFT:
            schema = `{"items":[{"medication_name":"", "strength":"", "dosage_text":"", "dosage_structured":"", "quantity":1}]}`;
            break;
        case types_1.ReportType.REFERRAL_REQUEST:
            schema = `{"target_specialty":"", "urgency":"routine", "clinical_question":"", "anamnesis_summary":"", "diagnosis_code":""}`;
            break;
        case types_1.ReportType.SICK_LEAVE_DRAFT:
            schema = `{"diagnosis_code":"", "start_date":"2025-01-01", "regime_notes":""}`;
            break;
        default: schema = `{"notes":""}`;
    }
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model,
            contents: `Vygeneruj strukturovaný dokument ${type} v JSON. 
                  Dodržuj věcnost a kompaktnost.
                  Entity: ${JSON.stringify(entities)}
                  Schéma: ${schema}
                  Souhrn: ${summary}`,
            config: { responseMimeType: "application/json" }
        });
        const reportData = cleanAndParseJSON(response.text, {});
        // Note: ID generation remains client-side or handled here, but we return data. 
        // We can generate ID here too.
        const id = Math.random().toString(36).substr(2, 9);
        return {
            report: {
                id,
                reportType: type,
                data: reportData
            }
        };
    }
    catch (error) {
        console.error("Report generation failed", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=index.js.map