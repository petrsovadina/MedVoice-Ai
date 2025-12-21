import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import {
  MedicalEntity, TranscriptSegment, ReportType, StructuredReport
} from "../types";

// Helper to call Cloud Functions
async function callFunction<T, R>(name: string, data: T): Promise<R> {
  try {
    const fn = httpsCallable<T, R>(functions, name);
    const result = await fn(data);
    return result.data;
  } catch (error: any) {
    console.error(`Error calling function ${name}:`, error);
    // Propagate error with meaningful message
    throw new Error(error.message || `Failed to call ${name}`);
  }
}

export const transcribeAudio = async (audioBlob: Blob, mimeType: string): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const result = await callFunction<{ audio: string, mimeType: string }, { text: string, segments: TranscriptSegment[] }>(
          'transcribeAudio',
          { audio: base64Data, mimeType }
        );
        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};

export const summarizeTranscript = async (transcript: string, useThinking: boolean = false): Promise<string> => {
  const result = await callFunction<{ transcript: string, useThinking: boolean }, { summary: string }>(
    'summarizeTranscript',
    { transcript, useThinking }
  );
  return result.summary;
};

export const extractEntities = async (transcript: string): Promise<MedicalEntity[]> => {
  const result = await callFunction<{ transcript: string }, { entities: MedicalEntity[] }>(
    'extractEntities',
    { transcript }
  );
  return result.entities;
};

export const detectIntents = async (summary: string): Promise<ReportType[]> => {
  const result = await callFunction<{ summary: string }, { intents: ReportType[] }>(
    'detectIntents',
    { summary }
  );
  return result.intents;
};

export const generateStructuredDocument = async (summary: string, type: ReportType, entities: MedicalEntity[], useThinking: boolean = false): Promise<StructuredReport> => {
  // Backend returns { report: StructuredReport }
  const result = await callFunction<{ summary: string, type: ReportType, entities: MedicalEntity[], useThinking: boolean }, { report: StructuredReport }>(
    'generateStructuredDocument',
    { summary, type, entities, useThinking }
  );
  return result.report;
};
