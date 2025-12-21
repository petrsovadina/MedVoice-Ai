
export interface TranscriptSegment {
    speaker: string;
    text: string;
    start: number;
    end: number;
}

export interface MedicalEntity {
    category: "DIAGNOSIS" | "MEDICATION" | "SYMPTOM" | "PII" | "OTHER";
    text: string;
}

export enum ReportType {
    AMBULATORY_RECORD = "AMBULATORY_RECORD",
    PRESCRIPTION_DRAFT = "PRESCRIPTION_DRAFT",
    REFERRAL_REQUEST = "REFERRAL_REQUEST",
    SICK_LEAVE_DRAFT = "SICK_LEAVE_DRAFT",
    OTHER = "OTHER"
}

export interface StructuredReport {
    id: string;
    reportType: ReportType;
    data: any;
}
