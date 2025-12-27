import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { TranscriptSegment, MedicalEntity, ReportType } from "./types";
import { PROMPTS } from "./prompts";
import { setGlobalOptions } from "firebase-functions/v2";

// Set global options for all functions
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();

// Initialize Gemini Client
const getAIClient = () => {
    const apiKey = process.env.GOOGLE_GENAI_KEY;
    if (!apiKey) {
        logger.error("Gemini API Key is not configured in the Backend Environment.");
        throw new HttpsError('failed-precondition', 'Gemini API Key is not configured in the Backend Environment.');
    }
    return new GoogleGenerativeAI(apiKey);
};

const handleError = (error: any, context: string): HttpsError => {
    logger.error(`[${context}] Error:`, error);

    // Check for resource exhaustion (Quota exceeded)
    if (error.status === 429 || error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED')) {
        return new HttpsError('resource-exhausted', `Quota exceeded for Gemini API in ${context}.`);
    }

    if (error instanceof HttpsError) {
        return error;
    }

    return new HttpsError('internal', `An unexpected error occurred in ${context}: ${error.message || String(error)}`);
};

const assertAuth = (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    return request.auth;
};

const cleanAndParseJSON = <T>(text: string | undefined, fallback: T): T => {
    if (!text) return fallback;
    try {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        return JSON.parse(codeBlockMatch ? codeBlockMatch[1] : text) as T;
    } catch (e) {
        logger.warn("Failed to parse JSON, returning fallback.", { text });
        return fallback;
    }
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// 1. Transcribe Audio
export const transcribeAudio = onCall({ timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
    assertAuth(request);
    const { storagePath, mimeType } = request.data;

    if (!storagePath || !mimeType) {
        throw new HttpsError('invalid-argument', 'Missing storagePath or mimeType');
    }

    try {
        logger.info(`[transcribeAudio] Started with storagePath: ${storagePath}, mimeType: ${mimeType}`);
        const genAI = getAIClient();

        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();

        if (!exists) {
            logger.error(`[transcribeAudio] File not found: ${storagePath}`);
            throw new HttpsError('not-found', 'Audio file not found in storage');
        }

        const [buffer] = await file.download();
        const audioBase64 = buffer.toString('base64');
        logger.info(`[transcribeAudio] Converted to base64. Calling Gemini...`);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent([
             PROMPTS.TRANSCRIBE_SYSTEM,
            { inlineData: { mimeType, data: audioBase64 } },
        ]);

        const response = result.response;
        const parsed = cleanAndParseJSON<{ segments: TranscriptSegment[] }>(response.text(), { segments: [] });
        return {
            text: parsed.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n'),
            segments: parsed.segments
        };
    } catch (error: any) {
        throw handleError(error, "transcribeAudio");
    }
});


// 2. Summarize
export const summarizeTranscript = onCall(async (request) => {
    assertAuth(request);
    const { transcript, useThinking } = request.data;
    const modelName = useThinking ? "gemini-1.5-pro" : "gemini-1.5-flash";

    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
        const result = await model.generateContent(`${PROMPTS.SUMMARIZE_SYSTEM}\n${transcript}`);
        const response = result.response;
        return { summary: response.text() || "" };
    } catch (error: any) {
        throw handleError(error, "summarizeTranscript");
    }
});

// 3. Extract Entities
export const extractEntities = onCall(async (request) => {
    assertAuth(request);
    const { transcript } = request.data;

    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent({
            contents: [{role: "user", parts: [{text: `${PROMPTS.EXTRACT_ENTITIES_SYSTEM}\n${transcript}`}]}],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const parsed = cleanAndParseJSON<{ entities: MedicalEntity[] }>(response.text(), { entities: [] });
        return { entities: parsed.entities || [] };
    } catch (error: any) {
        throw handleError(error, "extractEntities");
    }
});

// 4. Detect Intents
export const detectIntents = onCall(async (request) => {
    assertAuth(request);
    const { summary } = request.data;

    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent({
            contents: [{role: "user", parts: [{text: `${PROMPTS.DETECT_INTENTS_SYSTEM}\n${summary}`}]}],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const parsed = cleanAndParseJSON<{ intents: ReportType[] }>(response.text(), { intents: [ReportType.AMBULATORY_RECORD] });
        return { intents: parsed.intents };
    } catch (error: any) {
        throw handleError(error, "detectIntents");
    }
});

// 5. Generate Report
export const generateStructuredDocument = onCall(async (request) => {
    assertAuth(request);
    const { summary, type, entities, useThinking } = request.data;
    const modelName = useThinking ? "gemini-1.5-pro" : "gemini-1.5-flash";

    let schema = "";
    switch (type) {
        case ReportType.AMBULATORY_RECORD: schema = `{"subjective_notes":"", "objective_notes":"", "vitals":{"bp":"", "pulse":"", "temp":"", "spo2":"", "weight":""}, "diagnosis_text":"", "icd_10_code":"", "plan_text":""}`; break;
        case ReportType.PRESCRIPTION_DRAFT: schema = `{"items":[{"medication_name":"", "strength":"", "dosage_text":"", "dosage_structured":"", "quantity":1}]}`; break;
        case ReportType.REFERRAL_REQUEST: schema = `{"target_specialty":"", "urgency":"routine", "clinical_question":"", "anamnesis_summary":"", "diagnosis_code":""}`; break;
        case ReportType.SICK_LEAVE_DRAFT: schema = `{"diagnosis_code":"", "start_date":"2025-01-01", "regime_notes":""}`; break;
        default: schema = `{"notes":""}`;
    }

    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
        const result = await model.generateContent({
            contents: [{role: "user", parts: [{text: `${PROMPTS.GENERATE_REPORT_SYSTEM(type, JSON.stringify(entities), schema)}\n${summary}`}]}],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const reportData = cleanAndParseJSON<any>(response.text(), {});
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

// 6. Check Storage Config
export const checkStorageConfig = onCall(async (request) => {
    assertAuth(request);
    try {
        const bucket = admin.storage().bucket();
        const [exists] = await bucket.exists();
        const projectId = (admin.app().options.credential as any)?.projectId || process.env.GCLOUD_PROJECT;
        const storageBucketOption = (admin.app().options.storageBucket);

        return {
            bucketName: bucket.name,
            exists: exists,
            projectId: projectId,
            storageBucketOption: storageBucketOption,
            message: "Bucket configuration info"
        };
    } catch (error: any) {
        logger.error("Storage check failed", error);
        throw handleError(error, "checkStorageConfig");
    }
});
