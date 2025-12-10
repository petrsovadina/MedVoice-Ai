import { 
  ReportType, 
  StructuredReport, 
  ValidationResult, 
  ValidationError, 
  ValidationSeverity,
  AmbulantniZaznamData,
  OsetrovatelskyZaznamData,
  KonziliarniZpravaData,
  PotvrzeniVysetreniData,
  DoporuceniLecbyData
} from '../types';

export const validateReport = (report: StructuredReport): ValidationResult => {
  const errors: ValidationError[] = [];
  const data = report.data;

  // Helper pro přidání chyby
  const addError = (field: string, message: string) => {
    errors.push({ field, message, severity: ValidationSeverity.ERROR });
  };
  
  // Helper pro varování
  const addWarning = (field: string, message: string) => {
    errors.push({ field, message, severity: ValidationSeverity.WARNING });
  };

  switch (report.reportType) {
    case ReportType.AMBULANTNI_ZAZNAM: {
      const d = data as AmbulantniZaznamData;
      if (!d.subjektivni?.trim()) addError('Subjektivně', 'Chybí subjektivní stížnosti pacienta.');
      if (!d.objektivni?.trim()) addError('Objektivně', 'Chybí objektivní nález.');
      
      // Diagnóza je povinná pro vykázání péče
      if (!d.hodnoceni?.diagnozy || d.hodnoceni.diagnozy.length === 0) {
        addWarning('Hodnocení', 'Není uvedena žádná diagnóza (ICD-10).');
      } else {
        d.hodnoceni.diagnozy.forEach(dg => {
           if (!dg.kod) addError('Diagnóza', 'Chybí kód diagnózy.');
        });
      }
      
      if (!d.plan?.doporuceni?.trim() && (!d.plan?.medikace || d.plan.medikace.length === 0)) {
         addWarning('Plán', 'Plán je prázdný (žádná medikace ani doporučení).');
      }
      break;
    }

    case ReportType.OSETR_ZAZNAM: {
      const d = data as OsetrovatelskyZaznamData;
      if (!d.subjektivni_potize?.trim()) addError('Subjektivní', 'Chybí záznam subjektivních potíží.');
      
      // Sestra musí změřit alespoň jednu vitální funkci nebo uvést důvod
      const hasVitals = d.vitalni_funkce?.tk || d.vitalni_funkce?.p || d.vitalni_funkce?.tt;
      if (!hasVitals) {
        addWarning('Vitální funkce', 'Nejsou vyplněny žádné vitální funkce.');
      }
      
      if (!d.provedene_vykony || d.provedene_vykony.length === 0) {
         addWarning('Výkony', 'Nejsou uvedeny žádné provedené ošetřovatelské výkony.');
      }
      break;
    }

    case ReportType.KONZILIARNI_ZPRAVA: {
      const d = data as KonziliarniZpravaData;
      if (!d.cilova_odbornost?.trim()) addError('Adresát', 'Chybí cílová odbornost/lékař.');
      if (!d.duvod_konzilia?.trim()) addError('Klinická otázka', 'Chybí důvod konzilia (položená otázka).');
      if (!d.odesilajici_lekar?.trim()) addError('Odesílatel', 'Chybí identifikace odesílajícího lékaře.');
      break;
    }

    case ReportType.POTVRZENI_VYSETRENI: {
      const d = data as PotvrzeniVysetreniData;
      if (!d.datum_cas_navstevy?.trim()) addError('Datum', 'Chybí datum a čas návštěvy.');
      if (!d.ucel_vysetreni?.trim()) addError('Účel', 'Chybí účel vyšetření.');
      break;
    }

    case ReportType.DOPORUCENI_LECBY: {
      const d = data as DoporuceniLecbyData;
      if (!d.diagnoza_hlavni?.trim()) addError('Diagnóza', 'Chybí hlavní diagnóza pro indikaci léčby.');
      if (!d.navrhovana_terapie?.trim() && (!d.procedury || d.procedury.length === 0)) {
        addError('Terapie', 'Musí být uvedena navrhovaná terapie nebo procedury.');
      }
      break;
    }
  }

  return {
    isValid: errors.filter(e => e.severity === ValidationSeverity.ERROR).length === 0,
    errors
  };
};