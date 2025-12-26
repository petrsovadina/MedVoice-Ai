"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStorageConfig = exports.generateStructuredDocument = exports.detectIntents = exports.extractEntities = exports.summarizeTranscript = exports.transcribeAudio = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
const types_1 = require("./types");
const prompts_1 = require("./prompts");
const v2_1 = require("firebase-functions/v2");
// Set global options for all functions
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
admin.initializeApp();
// Initialize Gemini Client
const getAIClient = () => {
    const apiKey = process.env.GOOGLE_GENAI_KEY;
    if (!apiKey) {
        logger.error("Gemini API Key is not configured in the Backend Environment.");
        throw new https_1.HttpsError('failed-precondition', 'Gemini API Key is not configured in the Backend Environment.');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
};
const handleError = (error, context) => {
    logger.error(`[${context}] Error:`, error);
    // Check for resource exhaustion (Quota exceeded)
    if (error.status === 429 || error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED')) {
        return new https_1.HttpsError('resource-exhausted', `Quota exceeded for Gemini API in ${context}.`);
    }
    if (error instanceof https_1.HttpsError) {
        return error;
    }
    return new https_1.HttpsError('internal', `An unexpected error occurred in ${context}: ${error.message || String(error)}`);
};
const assertAuth = (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    return request.auth;
};
const cleanAndParseJSON = (text, fallback) => {
    if (!text)
        return fallback;
    try {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        return JSON.parse(codeBlockMatch ? codeBlockMatch[1] : text);
    }
    catch (e) {
        logger.warn("Failed to parse JSON, returning fallback.", { text });
        return fallback;
    }
};
const safetySettings = [
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE },
    { category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: generative_ai_1.HarmBlockThreshold.BLOCK_NONE },
];
// 1. Transcribe Audio
exports.transcribeAudio = (0, https_1.onCall)({ timeoutSeconds: 300, memory: '1GiB' }, async (request) => {
    assertAuth(request);
    const { storagePath, mimeType } = request.data;
    if (!storagePath || !mimeType) {
        throw new https_1.HttpsError('invalid-argument', 'Missing storagePath or mimeType');
    }
    try {
        logger.info(`[transcribeAudio] Started with storagePath: ${storagePath}, mimeType: ${mimeType}`);
        const genAI = getAIClient();
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            logger.error(`[transcribeAudio] File not found: ${storagePath}`);
            throw new https_1.HttpsError('not-found', 'Audio file not found in storage');
        }
        const [buffer] = await file.download();
        const audioBase64 = buffer.toString('base64');
        logger.info(`[transcribeAudio] Converted to base64. Calling Gemini...`);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent([
            prompts_1.PROMPTS.TRANSCRIBE_SYSTEM,
            { inlineData: { mimeType, data: audioBase64 } },
        ]);
        const response = result.response;
        const parsed = cleanAndParseJSON(response.text(), { segments: [] });
        return {
            text: parsed.segments.map(s => `${s.speaker}: ${s.text}`).join('\n\n'),
            segments: parsed.segments
        };
    }
    catch (error) {
        throw handleError(error, "transcribeAudio");
    }
});
// 2. Summarize
exports.summarizeTranscript = (0, https_1.onCall)(async (request) => {
    assertAuth(request);
    const { transcript, useThinking } = request.data;
    const modelName = useThinking ? "gemini-1.5-pro" : "gemini-1.5-flash";
    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
        const result = await model.generateContent(`${prompts_1.PROMPTS.SUMMARIZE_SYSTEM}\n${transcript}`);
        const response = result.response;
        return { summary: response.text() || "" };
    }
    catch (error) {
        throw handleError(error, "summarizeTranscript");
    }
});
// 3. Extract Entities
exports.extractEntities = (0, https_1.onCall)(async (request) => {
    assertAuth(request);
    const { transcript } = request.data;
    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${prompts_1.PROMPTS.EXTRACT_ENTITIES_SYSTEM}\n${transcript}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = result.response;
        const parsed = cleanAndParseJSON(response.text(), { entities: [] });
        return { entities: parsed.entities || [] };
    }
    catch (error) {
        throw handleError(error, "extractEntities");
    }
});
// 4. Detect Intents
exports.detectIntents = (0, https_1.onCall)(async (request) => {
    assertAuth(request);
    const { summary } = request.data;
    try {
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${prompts_1.PROMPTS.DETECT_INTENTS_SYSTEM}\n${summary}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = result.response;
        const parsed = cleanAndParseJSON(response.text(), { intents: [types_1.ReportType.AMBULATORY_RECORD] });
        return { intents: parsed.intents };
    }
    catch (error) {
        throw handleError(error, "detectIntents");
    }
});
// 5. Generate Report
exports.generateStructuredDocument = (0, https_1.onCall)(async (request) => {
    assertAuth(request);
    const { summary, type, entities, useThinking } = request.data;
    const modelName = useThinking ? "gemini-1.5-pro" : "gemini-1.5-flash";
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
        const genAI = getAIClient();
        const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `${prompts_1.PROMPTS.GENERATE_REPORT_SYSTEM(type, JSON.stringify(entities), schema)}\n${summary}` }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        const response = result.response;
        const reportData = cleanAndParseJSON(response.text(), {});
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
        throw handleError(error, "generateStructuredDocument");
    }
});
// 6. Check Storage Config
exports.checkStorageConfig = (0, https_1.onCall)(async (request) => {
    var _a;
    assertAuth(request);
    try {
        const bucket = admin.storage().bucket();
        const [exists] = await bucket.exists();
        const projectId = ((_a = admin.app().options.credential) === null || _a === void 0 ? void 0 : _a.projectId) || process.env.GCLOUD_PROJECT;
        const storageBucketOption = (admin.app().options.storageBucket);
        return {
            bucketName: bucket.name,
            exists: exists,
            projectId: projectId,
            storageBucketOption: storageBucketOption,
            message: "Bucket configuration info"
        };
    }
    catch (error) {
        logger.error("Storage check failed", error);
        throw handleError(error, "checkStorageConfig");
    }
});
//# sourceMappingURL=index.js.map