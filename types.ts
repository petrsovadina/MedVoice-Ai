
export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
  ERROR = 'ERROR'
}

// 5 Klíčových typů dokumentů pro MVP
export enum ReportType {
  AMBULANTNI_ZAZNAM = 'AMBULANTNI_ZAZNAM',      // Dekurs (SOAP)
  OSETR_ZAZNAM = 'OSETR_ZAZNAM',                // Sestra
  KONZILIARNI_ZPRAVA = 'KONZILIARNI_ZPRAVA',    // Žádanka/Konzilium
  POTVRZENI_VYSETRENI = 'POTVRZENI_VYSETRENI',  // Potvrzení pro pacienta/zaměstnavatele
  DOPORUCENI_LECBY = 'DOPORUCENI_LECBY'         // Lázně, RHB, Domácí péče
}

export interface MedicalEntity {
  category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER';
  text: string;
  confidence?: number;
}

// --- VALIDACE ---
export enum ValidationSeverity {
  ERROR = 'ERROR',     // Blokuje (legislativní nutnost)
  WARNING = 'WARNING', // Upozornění (doporučení)
  INFO = 'INFO'        // Informace
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

// --- 1. AMBULANTNÍ ZÁZNAM (SOAP) ---
export interface AmbulantniZaznamData {
  subjektivni: string;
  objektivni: string;
  hodnoceni: {
    diagnozy: Array<{ kod: string; nazev: string }>;
    zaver: string;
  };
  plan: {
    medikace: Array<{ nazev: string; davkovani: string }>;
    doporuceni: string;
    kontrola: string;
  };
}

// --- 2. OŠETŘOVATELSKÝ ZÁZNAM ---
export interface OsetrovatelskyZaznamData {
  subjektivni_potize: string;
  vitalni_funkce: {
    tk: string; // Tlak
    p: string;  // Pulz
    tt: string; // Teplota
    spo2?: string;
  };
  provedene_vykony: Array<{ nazev: string; cas?: string }>;
  ordinace_lekare: string;
  poznamka_sestry: string;
}

// --- 3. KONZILIÁRNÍ ZPRÁVA ---
export interface KonziliarniZpravaData {
  odesilajici_lekar: string;
  cilova_odbornost: string;
  duvod_konzilia: string; // Otázka
  nynnejsi_onemocneni: string;
  dosavadni_lecba: string;
  urgentnost: 'Běžná' | 'Akutní' | 'Neodkladná';
}

// --- 4. POTVRZENÍ O VYŠETŘENÍ ---
export interface PotvrzeniVysetreniData {
  datum_cas_navstevy: string;
  ucel_vysetreni: string; // např. "Akutní ošetření", "Preventivní prohlídka"
  doprovod?: string; // např. "v doprovodu matky"
  doporuceni_rezim: string; // např. "Klidový režim 3 dny"
}

// --- 5. DOPORUČENÍ K LÉČBĚ (RHB/Lázně) ---
export interface DoporuceniLecbyData {
  diagnoza_hlavni: string;
  navrhovana_terapie: string; // Textový popis
  procedury: Array<{ nazev: string; frekvence: string }>;
  cil_lecby: string;
}

// Union typ pro data reportu
export type MedicalDocumentData = 
  | AmbulantniZaznamData 
  | OsetrovatelskyZaznamData 
  | KonziliarniZpravaData 
  | PotvrzeniVysetreniData 
  | DoporuceniLecbyData;

export interface StructuredReport {
  reportType: ReportType;
  data: MedicalDocumentData;
  rawTextContent?: string; // Pro fallback zobrazení nebo editaci celku
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