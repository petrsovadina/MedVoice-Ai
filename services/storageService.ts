
import { ProcessingResult, StructuredReport } from "../types";

const STORAGE_KEY = 'MEDVOICE_STATE_V1';

export const saveState = (result: ProcessingResult): void => {
  try {
    // Ukládáme pouze textová data, ne audio bloby
    const stateToSave = {
      rawTranscript: result.rawTranscript,
      segments: result.segments,
      entities: result.entities,
      report: result.report,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (e) {
    console.warn('Failed to save state to localStorage', e);
  }
};

export const loadState = (): ProcessingResult | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    
    // Validace stáří dat (např. 24 hodin)
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > ONE_DAY) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    return {
        rawTranscript: parsed.rawTranscript,
        segments: parsed.segments,
        entities: parsed.entities,
        report: parsed.report
    };
  } catch (e) {
    console.error('Failed to load state', e);
    return null;
  }
};

export const clearState = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const downloadJSON = (report: StructuredReport, filename: string) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};
