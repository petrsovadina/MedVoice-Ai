export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  ERROR = 'ERROR'
}

export interface MedicalEntity {
  category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER';
  text: string;
  confidence?: number;
}

export interface StructuredReport {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summary: string;
}

export interface TranscriptSegment {
  speaker: 'Lékař' | 'Pacient';
  text: string;
  start: number;
  end: number;
}

export interface ProcessingResult {
  rawTranscript: string;
  segments: TranscriptSegment[];
  entities: MedicalEntity[];
  report: StructuredReport;
}

export interface AudioFile {
  blob: Blob;
  mimeType: string;
  name: string;
}