
import { 
  ReportType, StructuredReport, ValidationResult, MedicalEntity,
  ValidationSeverity, AmbulatoryRecord, ReferralRequest, ConsentRecord, SickLeaveDraft, 
  PrescriptionDraft, NurseRecord, Epicrisis, TelemedicineNote, VisitConfirmation, SpaPlan
} from '../types';

/**
 * Validuje seznam entit extrahovaných z textu.
 * Hledá duplicity, nesmyslné hodnoty a provádí základní sémantickou kontrolu.
 */
export const validateEntities = (entities: MedicalEntity[]): { isValid: boolean, issues: Array<{index: number, message: string, severity: ValidationSeverity}> } => {
  const issues: any[] = [];
  const seenTexts = new Set<string>();

  entities.forEach((ent, idx) => {
    const text = ent.text.toLowerCase().trim();
    
    // 1. Kontrola délky (nesmyslné jednoslovné zkratky nebo předložky)
    if (text.length < 3 && !['tk', 'p', 'df', 'ox'].includes(text)) {
      issues.push({ index: idx, message: 'Text entity je příliš krátký a může být šumem.', severity: ValidationSeverity.WARNING });
    }

    // 2. Kontrola duplicity
    if (seenTexts.has(text)) {
      issues.push({ index: idx, message: 'Duplicitní záznam.', severity: ValidationSeverity.INFO });
    }
    seenTexts.add(text);

    // 3. Sémantická kontrola kategorie (heuristika)
    if (ent.category === 'MEDICATION' && /\b(bolest|kašel|únava)\b/i.test(text)) {
      issues.push({ index: idx, message: 'Tento záznam vypadá spíše jako SYMPTOM než MEDIKACE.', severity: ValidationSeverity.WARNING });
    }
    
    if (ent.category === 'DIAGNOSIS' && text.includes('bolí')) {
      issues.push({ index: idx, message: 'Záznam obsahuje sloveso potíží, pravděpodobně patří do SYMPTOMŮ.', severity: ValidationSeverity.WARNING });
    }
  });

  return { isValid: issues.length === 0, issues };
};

export const validateReport = (report: StructuredReport): ValidationResult => {
  const errors: any[] = [];
  const add = (f: string, m: string, s: ValidationSeverity) => errors.push({ field: f, message: m, severity: s });

  if (!report.data) {
    add('Data', 'Dokument neobsahuje žádná data.', ValidationSeverity.ERROR);
    return { isValid: false, errors };
  }

  const d = report.data;

  switch (report.reportType) {
    case ReportType.AMBULATORY_RECORD:
      const amb = d as AmbulatoryRecord;
      if (!amb.subjective_notes) add('S', 'Chybí subjektivní potíže pacienta.', ValidationSeverity.WARNING);
      if (!amb.objective_notes) add('O', 'Chybí objektivní nález lékaře.', ValidationSeverity.ERROR);
      if (!amb.icd_10_code) add('Dg', 'Chybí kód diagnózy dle MKN-10.', ValidationSeverity.ERROR);
      if (!amb.plan_text) add('P', 'Chybí terapeutický plán.', ValidationSeverity.WARNING);
      break;

    case ReportType.PRESCRIPTION_DRAFT:
      const p = d as PrescriptionDraft;
      if (!p.items || p.items.length === 0) {
        add('Léčiva', 'Nebyla detekována žádná léčiva.', ValidationSeverity.ERROR);
      } else {
        p.items.forEach((it, i) => {
          if (!it.medication_name) add(`Lék ${i+1}`, 'Chybí název přípravku.', ValidationSeverity.ERROR);
          if (!it.dosage_text) add(`Dávkování ${i+1}`, 'Chybí slovní popis dávkování.', ValidationSeverity.WARNING);
        });
      }
      break;

    case ReportType.REFERRAL_REQUEST:
      const r = d as ReferralRequest;
      if (!r.target_specialty) add('Specializace', 'Chybí cílová odbornost.', ValidationSeverity.ERROR);
      if (!r.clinical_question) add('Otázka', 'Chybí klinický požadavek na konziliáře.', ValidationSeverity.ERROR);
      break;

    case ReportType.SICK_LEAVE_DRAFT:
      const s = d as SickLeaveDraft;
      if (!s.diagnosis_code) add('Dg', 'Chybí kód diagnózy pro neschopenku.', ValidationSeverity.ERROR);
      if (!s.start_date) add('Datum', 'Chybí datum zahájení neschopnosti.', ValidationSeverity.ERROR);
      break;

    case ReportType.CONSENT_RECORD:
      const c = d as ConsentRecord;
      if (!c.procedure_name) add('Výkon', 'Chybí název výkonu.', ValidationSeverity.ERROR);
      if (!c.consent_given) add('Souhlas', 'Záznam indikuje neudělení souhlasu.', ValidationSeverity.WARNING);
      break;

    case ReportType.EPICRISIS:
      const e = d as Epicrisis;
      if (!e.hospitalization_summary) add('Souhrn', 'Chybí průběh hospitalizace.', ValidationSeverity.ERROR);
      if (!e.discharge_condition) add('Stav', 'Chybí stav při propuštění.', ValidationSeverity.ERROR);
      break;

    case ReportType.TELEMEDICINE_NOTE:
      const t = d as TelemedicineNote;
      if (!t.caller_identity) add('Identifikace', 'Chybí ověření identity volajícího.', ValidationSeverity.ERROR);
      if (!t.provided_advice) add('Rada', 'Chybí záznam poskytnuté rady.', ValidationSeverity.ERROR);
      break;

    case ReportType.VISIT_CONFIRMATION:
      const v = d as VisitConfirmation;
      if (!v.visit_date) add('Datum', 'Chybí datum návštěvy.', ValidationSeverity.ERROR);
      break;

    case ReportType.NURSE_RECORD:
      const n = d as NurseRecord;
      if (!n.patient_state) add('Stav', 'Chybí popis stavu pacienta.', ValidationSeverity.ERROR);
      break;

    case ReportType.SPA_PLAN:
      const sp = d as SpaPlan;
      if (!sp.indication_group) add('Indikace', 'Chybí indikační skupina.', ValidationSeverity.ERROR);
      break;
  }

  return { 
    isValid: !errors.some(e => e.severity === ValidationSeverity.ERROR), 
    errors 
  };
};
