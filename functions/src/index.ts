import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { TranscriptSegment, MedicalEntity, ReportType } from "./types";
import { PROMPTS } from "./prompts";

admin.initializeApp();

// Initialize Gemini Client
// Requires GOOGLE_GENAI_KEY in environment variables
const getAIClient = () => {
    const apiKey = process.env.GOOGLE_GENAI_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Gemini API Key is not configured in the Backend Environment.');
    }
    return new GoogleGenAI({ apiKey });
};

const handleError = (error: any, context: string): functions.https.HttpsError => {
    console.error(`[${context}] Error:`, error);

    // Check for resource exhaustion (Quota exceeded)
    if (error.status === 429 || error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED')) {
        return new functions.https.HttpsError('resource-exhausted', `Quota exceeded for Gemini API in ${context}.`);
    }

    if (error instanceof functions.https.HttpsError) {
        return error;
    }

    return new functions.https.HttpsError('internal', `An unexpected error occurred in ${context}: ${error.message || error}`);
};

const assertAuth = (context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    return context.auth;
};

const cleanAndParseJSON = <T>(text: string | undefined, fallback: T): T => {
    if (!text) return fallback;
    try {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        return JSON.parse(codeBlockMatch ? codeBlockMatch[1] : text) as T;
    } catch (e) { return fallback; }
};

// 1. Transcribe Audio
export const transcribeAudio = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).https.onCall(async (data, context) => {
    assertAuth(context);
    const { storagePath, mimeType } = data;

    if (!storagePath || !mimeType) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing storagePath or mimeType');
    }

    try {
        console.log(`[transcribeAudio] Started with storagePath: ${storagePath}, mimeType: ${mimeType}`);

        const bucket = admin.storage().bucket();
        console.log(`[transcribeAudio] Bucket name: ${bucket.name}`);

        const file = bucket.file(storagePath);
        console.log(`[transcribeAudio] Checking existence of file...`);
        const [exists] = await file.exists();
        console.log(`[transcribeAudio] File exists: ${exists}`);

        if (!exists) {
            console.error(`[transcribeAudio] File not found: ${storagePath}`);
            throw new functions.https.HttpsError('not-found', 'Audio file not found in storage');
        }

        console.log(`[transcribeAudio] Downloading file...`);
        const [buffer] = await file.download();
        console.log(`[transcribeAudio] Download complete. Buffer size: ${buffer.length}`);

        const audioBase64 = buffer.toString('base64');
        console.log(`[transcribeAudio] Converted to base64. Calling Gemini...`);

        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType, data: audioBase64 } },
                    { text: PROMPTS.TRANSCRIBE_SYSTEM }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const parsed = cleanAndParseJSON<{ segments: TranscriptSegment[] }>(response.text, { segments: [] });
        return {
            text: parsed.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n'),
            segments: parsed.segments
        };
    } catch (error: any) {
        throw handleError(error, "transcribeAudio");
    }
});

// 2. Summarize
export const summarizeTranscript = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { transcript, useThinking } = data;
    // Using 2.5 Flash as standard, 2.5 Pro for thinking if needed (though mapping logic simplified here)
    const model = useThinking ? "gemini-2.5-pro" : "gemini-2.5-flash";

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model,
            contents: `${PROMPTS.SUMMARIZE_SYSTEM}\n${transcript}`,
        });
        return { summary: response.text || "" };
    } catch (error: any) {
        throw handleError(error, "summarizeTranscript");
    }
});

// 3. Extract Entities
export const extractEntities = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { transcript } = data;

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${PROMPTS.EXTRACT_ENTITIES_SYSTEM}\n${transcript}`,
            config: { responseMimeType: "application/json" }
        });
        const parsed = cleanAndParseJSON<{ entities: MedicalEntity[] }>(response.text, { entities: [] });
        return { entities: parsed.entities || [] };
    } catch (error: any) {
        throw handleError(error, "extractEntities");
    }
});

// 4. Detect Intents
export const detectIntents = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { summary } = data;

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${PROMPTS.DETECT_INTENTS_SYSTEM}\n${summary}`,
            config: { responseMimeType: "application/json" }
        });
        const parsed = cleanAndParseJSON<{ intents: ReportType[] }>(response.text, { intents: [ReportType.AMBULATORY_RECORD] });
        return { intents: parsed.intents };
    } catch (error: any) {
        throw handleError(error, "detectIntents");
    }
});

// 5. Generate Report
export const generateStructuredDocument = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    const { summary, type, entities, useThinking } = data;
    const model = useThinking ? "gemini-2.5-pro" : "gemini-2.5-flash";

    let schema = "";
    switch (type) {
        case ReportType.AMBULATORY_RECORD: schema = `{"subjective_notes":"", "objective_notes":"", "vitals":{"bp":"", "pulse":"", "temp":"", "spo2":"", "weight":""}, "diagnosis_text":"", "icd_10_code":"", "plan_text":""}`; break;
        case ReportType.PRESCRIPTION_DRAFT: schema = `{"items":[{"medication_name":"", "strength":"", "dosage_text":"", "dosage_structured":"", "quantity":1}]}`; break;
        case ReportType.REFERRAL_REQUEST: schema = `{"target_specialty":"", "urgency":"routine", "clinical_question":"", "anamnesis_summary":"", "diagnosis_code":""}`; break;
        case ReportType.SICK_LEAVE_DRAFT: schema = `{"diagnosis_code":"", "start_date":"2025-01-01", "regime_notes":""}`; break;
        default: schema = `{"notes":""}`;
    }

    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model,
            contents: `${PROMPTS.GENERATE_REPORT_SYSTEM(type, JSON.stringify(entities), schema)}\n${summary}`,
            config: { responseMimeType: "application/json" }
        });

        const reportData = cleanAndParseJSON<any>(response.text, {});
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
    } catch (error: any) {
        throw handleError(error, "generateStructuredDocument");
    }
});

export const checkStorageConfig = functions.https.onCall(async (data, context) => {
    assertAuth(context);
    try {
        const bucket = admin.storage().bucket(); // Gets default bucket
        const [exists] = await bucket.exists();
        return {
            bucketName: bucket.name,
            exists: exists,
            projectId: (admin.app().options.credential as any)?.projectId || process.env.GCLOUD_PROJECT,
            storageBucketOption: admin.instanceId().app.options.storageBucket,
            message: "Bucket configuration info"
        };
    } catch (error: any) {
        console.error("Storage check failed", error);
        return { error: error.message };
    }
});
