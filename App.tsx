
import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptEditor } from './components/TranscriptEditor';
import { WorkspaceEditor } from './components/WorkspaceEditor';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { SettingsModal } from './components/SettingsModal';
import { AppState, AudioFile, ProcessingResult, StructuredReport, ReportType, ValidationResult, ProviderConfig, MedicalEntity } from './types';
import { transcribeAudio, summarizeTranscript, extractEntities, detectIntents, generateStructuredDocument } from './services/geminiService';
import { validateReport } from './services/validationService';
import { RotateCcw, AlertTriangle, Key } from 'lucide-react';

const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  name: "MUDr. Jan Novák",
  address: "Nemocniční 12, 110 00 Praha",
  ico: "12345678",
  icp: "88812345",
  specializationCode: "001",
  contact: "+420 123 456 789",
  useThinkingMode: false
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastAudioFile, setLastAudioFile] = useState<AudioFile | null>(null);
  const [result, setResult] = useState<ProcessingResult>({
    rawTranscript: '',
    summary: '',
    segments: [],
    entities: [],
    reports: []
  });
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [progress, setProgress] = useState<string>("");
  const [isProcessingFinal, setIsProcessingFinal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(DEFAULT_PROVIDER_CONFIG);
  const [errorDetails, setErrorDetails] = useState<{message: string, isQuota: boolean} | null>(null);

  const handleAudioReady = async (file: AudioFile) => {
    setLastAudioFile(file);
    const url = URL.createObjectURL(file.blob);
    setAudioUrl(url);
    setAppState(AppState.PROCESSING_AUDIO);
    setErrorDetails(null);
    
    try {
      setProgress("Přepisuji nahrávku pomocí AI...");
      const { text, segments } = await transcribeAudio(file.blob, file.mimeType);
      
      setAppState(AppState.ANALYZING);
      setProgress(providerConfig.useThinkingMode ? "Hloubková AI analýza (může trvat až 1 minutu)..." : "Extrahuje klinická data a vytvářím souhrn...");
      
      const [summary, entities] = await Promise.all([
        summarizeTranscript(text, providerConfig.useThinkingMode),
        extractEntities(text)
      ]);

      setResult(prev => ({
        ...prev,
        rawTranscript: text,
        segments,
        summary,
        entities
      }));
      
      setAppState(AppState.INTERMEDIATE_REVIEW);

    } catch (error: any) {
      console.error("Workflow failed", error);
      const isQuota = error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      setErrorDetails({
        message: isQuota ? "Byla překročena kvóta API. Zkuste to za chvíli nebo použijte vlastní klíč." : (error.message || "Nastala neočekávaná chyba."),
        isQuota
      });
      setAppState(AppState.ERROR);
    }
  };

  const handleFinalizeDocuments = async (updatedSummary: string, updatedEntities: MedicalEntity[]) => {
      setIsProcessingFinal(true);
      setErrorDetails(null);
      setProgress(providerConfig.useThinkingMode ? "Generování s hloubkovou úvahou (Gemini Pro Thinking)..." : "Generuji strukturované dokumenty dle specifikace...");
      try {
          const intents = await detectIntents(updatedSummary);
          const reports = await Promise.all(
            intents.map(type => generateStructuredDocument(updatedSummary, type, updatedEntities, providerConfig.useThinkingMode))
          );

          const validations: Record<string, ValidationResult> = {};
          reports.forEach(r => validations[r.id] = validateReport(r));

          setResult(prev => ({ 
            ...prev, 
            summary: updatedSummary, 
            entities: updatedEntities, 
            reports 
          }));
          
          setValidationResults(validations);
          setAppState(AppState.REVIEW);
      } catch (error: any) {
          console.error(error);
          const isQuota = error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
          setErrorDetails({
            message: isQuota ? "Byla překročena kvóta API při generování dokumentů." : (error.message || "Chyba při finalizaci."),
            isQuota
          });
          setAppState(AppState.ERROR);
      } finally {
          setIsProcessingFinal(false);
      }
  };

  const handleOpenKeySelection = async () => {
    try {
      // @ts-ignore
      if (window.aistudio?.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Po úspěšném výběru klíče zkusíme akci znovu pokud máme data
        if (lastAudioFile && appState === AppState.ERROR) {
           handleAudioReady(lastAudioFile);
        }
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setResult({ rawTranscript: '', summary: '', segments: [], entities: [], reports: [] });
    setAudioUrl(null);
    setLastAudioFile(null);
    setErrorDetails(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-inter bg-slate-50">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} doctorName={providerConfig.name} specialization={providerConfig.specializationCode} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={providerConfig} onSave={setProviderConfig} />

      <main className="flex-1 w-full mx-auto px-6 py-4 overflow-hidden">
        {(appState === AppState.IDLE || appState === AppState.RECORDING || appState === AppState.PROCESSING_AUDIO || appState === AppState.ANALYZING) && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <AudioRecorder onAudioReady={handleAudioReady} appState={appState} progress={progress} />
          </div>
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white p-10 rounded-[40px] border border-red-100 shadow-2xl shadow-red-500/10 text-center max-w-md">
                <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tight">Ups, něco se nepovedlo</h2>
                <p className="text-slate-500 mb-8 font-medium">{errorDetails?.message}</p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => lastAudioFile && handleAudioReady(lastAudioFile)}
                        className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all active:scale-95"
                    >
                        Zkusit znovu
                    </button>
                    
                    {errorDetails?.isQuota && (
                        <button 
                            onClick={handleOpenKeySelection}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            <Key size={18} /> Použít vlastní API klíč
                        </button>
                    )}

                    <button 
                        onClick={reset}
                        className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:text-slate-600 transition-all"
                    >
                        Zrušit a začít znovu
                    </button>
                </div>
                
                {errorDetails?.isQuota && (
                   <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      Pro bezlimitní provoz doporučujeme použít vlastní API klíč z placeného projektu Google Cloud. 
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-primary-500 block underline mt-1">Dokumentace k platbám</a>
                   </p>
                )}
            </div>
          </div>
        )}

        {appState === AppState.INTERMEDIATE_REVIEW && (
           <WorkspaceEditor 
              transcript={result.rawTranscript}
              segments={result.segments}
              summary={result.summary}
              entities={result.entities}
              onFinalize={handleFinalizeDocuments}
              isProcessing={isProcessingFinal}
              audioUrl={audioUrl}
           />
        )}

        {appState === AppState.REVIEW && (
          <div className="h-full flex flex-col gap-3 animate-in fade-in duration-500">
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                   <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Finalizace Dokumentace</h2>
                   <div className="flex gap-2">
                      {result.reports.map(r => (
                        <span key={r.id} className="text-[8px] font-black bg-slate-200 px-2 py-0.5 rounded uppercase">{r.reportType}</span>
                      ))}
                   </div>
                </div>
                <button onClick={reset} className="flex items-center gap-1.5 text-primary-600 font-bold text-[9px] uppercase tracking-widest hover:text-primary-700 transition-colors">
                    <RotateCcw size={12} strokeWidth={3} /> Nový Pacient / Session
                </button>
             </div>
             
             <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                <div className="col-span-3 h-full min-h-0">
                    <TranscriptEditor transcript={result.rawTranscript} segments={result.segments} entities={result.entities} audioUrl={audioUrl} />
                </div>
                <div className="col-span-9 h-full min-h-0">
                    <AnalysisDisplay 
                        entities={result.entities} 
                        reports={result.reports}
                        validationResults={validationResults}
                        onReportChange={(id, nr) => setResult(p => ({...p, reports: p.reports.map(r => r.id === id ? nr : r)}))}
                        onEntitiesChange={(ents) => setResult(p => ({...p, entities: ents}))}
                        onRegenerateReports={async () => handleFinalizeDocuments(result.summary, result.entities)}
                        isRegenerating={isProcessingFinal}
                        providerConfig={providerConfig}
                    />
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
