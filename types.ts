
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  ANALYZING = 'ANALYZING',
  INTERMEDIATE_REVIEW = 'INTERMEDIATE_REVIEW',
  REVIEW = 'REVIEW',
  HISTORY = 'HISTORY',
  ERROR = 'ERROR'
}

export enum ReportType {
  AMBULATORY_RECORD = 'AMBULATORY_RECORD', // 1.1, 1.2
  NURSE_RECORD = 'NURSE_RECORD', // 2.0
  PRESCRIPTION_DRAFT = 'PRESCRIPTION_DRAFT', // 13.0, 5.3
  REFERRAL_REQUEST = 'REFERRAL_REQUEST', // 6.0, 5.1
  SICK_LEAVE_DRAFT = 'SICK_LEAVE_DRAFT', // 14.0
  VISIT_CONFIRMATION = 'VISIT_CONFIRMATION', // 7.0
  CONSENT_RECORD = 'CONSENT_RECORD', // 9.0
  SPA_PLAN = 'SPA_PLAN', // 3.1
  EPICRISIS = 'EPICRISIS', // 4.0
  TELEMEDICINE_NOTE = 'TELEMEDICINE_NOTE' // 12.0
}

export interface ProviderConfig {
  name: string;
  address: string;
  ico: string;
  icp: string;
  specializationCode: string;
  contact: string;
  useThinkingMode?: boolean;
}

export interface MedicalEntity {
  category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER';
  text: string;
  isManual?: boolean;
}

export interface AmbulatoryRecord {
  doc_type: 'AMBULATORY_RECORD';
  subjective_notes: string;
  objective_notes: string;
  vitals: { bp?: string; pulse?: string; temp?: string; spo2?: string; weight?: string; };
  diagnosis_text: string;
  icd_10_code: string;
  plan_text: string;
}

export interface PrescriptionDraft {
  doc_type: 'PRESCRIPTION_DRAFT';
  items: Array<{
    medication_name: string;
    strength: string;
    dosage_text: string;
    dosage_structured: string;
    quantity: number;
  }>;
}

export interface ReferralRequest {
  doc_type: 'REFERRAL_REQUEST';
  target_specialty: string;
  urgency: 'routine' | 'urgent' | 'cito';
  clinical_question: string;
  anamnesis_summary: string;
  diagnosis_code: string;
}

export interface Epicrisis {
  doc_type: 'EPICRISIS';
  admission_reason: string;
  hospitalization_summary: string;
  discharge_condition: string;
  discharge_medication: string;
  follow_up_recommendations: string;
}

export interface TelemedicineNote {
  doc_type: 'TELEMEDICINE_NOTE';
  caller_identity: string;
  communication_channel: string;
  reason_for_contact: string;
  provided_advice: string;
}

export interface ConsentRecord {
  doc_type: 'CONSENT_RECORD';
  procedure_name: string;
  risks_discussed: string[];
  alternatives_discussed: string[];
  consent_given: boolean;
}

export interface NurseRecord {
  doc_type: 'NURSE_RECORD';
  patient_state: string;
  vitals: { bp?: string; pulse?: string; temp?: string; weight?: string };
  interventions: string[];
  notes: string;
}

export interface SickLeaveDraft {
  doc_type: 'SICK_LEAVE_DRAFT';
  diagnosis_code: string;
  start_date: string;
  regime_notes: string;
}

export interface VisitConfirmation {
  doc_type: 'VISIT_CONFIRMATION';
  visit_date: string;
  visit_purpose: string;
}

export interface SpaPlan {
  doc_type: 'SPA_PLAN';
  indication_group: string;
  planned_procedures: string[];
  diet_regime: string;
}

export type MedicalDocumentData =
  | AmbulatoryRecord
  | PrescriptionDraft
  | ReferralRequest
  | NurseRecord
  | SickLeaveDraft
  | VisitConfirmation
  | ConsentRecord
  | Epicrisis
  | TelemedicineNote
  | SpaPlan;

export interface StructuredReport {
  id: string;
  reportType: ReportType;
  data: MedicalDocumentData;
}

export interface TranscriptSegment {
  speaker: 'Lékař' | 'Pacient' | 'Sestra';
  text: string;
  start: number;
  end: number;
}

export interface ProcessingResult {
  rawTranscript: string;
  summary: string;
  segments: TranscriptSegment[];
  entities: MedicalEntity[];
  reports: StructuredReport[];
}

export interface AudioFile {
  blob: Blob;
  mimeType: string;
  name: string;
}

export enum ValidationSeverity { ERROR = 'ERROR', WARNING = 'WARNING', INFO = 'INFO' }
export interface ValidationError { field: string; message: string; severity: ValidationSeverity; }
export interface ValidationResult { isValid: boolean; errors: ValidationError[]; }
