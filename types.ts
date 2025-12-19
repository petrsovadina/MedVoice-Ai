
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  ERROR = 'ERROR'
}

export enum ReportType {
  AMBULANTNI_ZAZNAM = 'AMBULANTNI_ZAZNAM',
  OSETR_ZAZNAM = 'OSETR_ZAZNAM',
  KONZILIARNI_ZPRAVA = 'KONZILIARNI_ZPRAVA',
  POTVRZENI_VYSETRENI = 'POTVRZENI_VYSETRENI',
  DOPORUCENI_LECBY = 'DOPORUCENI_LECBY'
}

export interface ProviderConfig {
  name: string;
  address: string;
  ico: string;
  icp: string;
  specializationCode: string;
  contact: string;
}

export interface MedicalEntity {
  category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER';
  text: string;
  confidence?: number;
}

export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export interface ValidationError {
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface IdentifikacePacienta {
  jmeno: string;
  rodne_cislo_datum_nar: string;
  pojistovna?: string;
}

export interface IdentifikacePoskytovatele {
  lekar: string;
  odbornost: string;
  datum_cas: string;
  adresa?: string;
  ico?: string;
  icp?: string;
}

export interface AmbulantniZaznamData {
  identifikace: IdentifikacePacienta;
  poskytovatel: IdentifikacePoskytovatele;
  subjektivni: string;
  objektivni: string;
  hodnoceni: {
    diagnozy: Array<{ kod: string; nazev: string }>;
    zaver: string;
  };
  plan: {
    medikace: Array<{ nazev: string; davkovani: string }>;
    doporuceni: string;
    pouceni: string;
    kontrola: string;
  };
}

export interface OsetrovatelskyZaznamData {
  identifikace: IdentifikacePacienta;
  poskytovatel: IdentifikacePoskytovatele;
  subjektivni_potize: string;
  vitalni_funkce: {
    tk: string;
    p: string;
    tt: string;
    spo2?: string;
  };
  provedene_vykony: Array<{ nazev: string; cas?: string }>;
  ordinace_lekare: string;
  poznamka_sestry: string;
}

export interface KonziliarniZpravaData {
  identifikace: IdentifikacePacienta;
  poskytovatel: IdentifikacePoskytovatele;
  cilova_odbornost: string;
  duvod_konzilia: string;
  nynnejsi_onemocneni: string;
  dosavadni_lecba: string;
  urgentnost: 'Běžná' | 'Akutní' | 'Neodkladná';
}

export interface PotvrzeniVysetreniData {
  identifikace: IdentifikacePacienta;
  poskytovatel: IdentifikacePoskytovatele;
  ucel_vysetreni: string;
  doprovod?: string;
  doporuceni_rezim: string;
}

export interface DoporuceniLecbyData {
  identifikace: IdentifikacePacienta;
  poskytovatel: IdentifikacePoskytovatele;
  diagnoza_hlavni: string;
  navrhovana_terapie: string;
  procedury: Array<{ nazev: string; frekvence: string }>;
  cil_lecby: string;
}

export type MedicalDocumentData = 
  | AmbulantniZaznamData 
  | OsetrovatelskyZaznamData 
  | KonziliarniZpravaData 
  | PotvrzeniVysetreniData 
  | DoporuceniLecbyData;

export interface StructuredReport {
  reportType: ReportType;
  data: MedicalDocumentData;
  rawTextContent?: string;
}

export interface TranscriptSegment {
  speaker: 'Lékař' | 'Pacient' | 'Sestra';
  text: string;
  start: number;
  end: number;
}

export interface ProcessingResult {
  rawTranscript: string;
  segments: TranscriptSegment[];
  entities: MedicalEntity[];
  report: StructuredReport | null;
}

export interface AudioFile {
  blob: Blob;
  mimeType: string;
  name: string;
}
