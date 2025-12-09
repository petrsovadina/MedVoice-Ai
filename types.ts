
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  ERROR = 'ERROR'
}

export enum ReportType {
  AMBULANTNI_ZAZNAM = 'AMBULANTNI_ZAZNAM', // Default SOAP
  VYPIS = 'VYPIS',
  KONZILIUM = 'KONZILIUM',
  ZADANKA = 'ZADANKA',
  PN = 'PN',
  POTVRZENI = 'POTVRZENI',
  HOSPITALIZACE = 'HOSPITALIZACE'
}

export interface MedicalEntity {
  category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER';
  text: string;
  confidence?: number;
}

export interface StructuredReport {
  reportType?: ReportType;
  // Standard SOAP fields (used for AMBULANTNI_ZAZNAM)
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  summary?: string;
  // Fallback for other document types (Single text blob)
  content?: string;
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
