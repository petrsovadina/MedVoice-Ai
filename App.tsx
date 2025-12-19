import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { SettingsModal } from './components/SettingsModal';
import { AppState, AudioFile, ProcessingResult, StructuredReport, ReportType, ValidationResult, ProviderConfig, MedicalEntity } from './types';
import { transcribeAudio, extractEntities, classifyDocument, generateStructuredDocument } from './services/geminiService';
import { validateReport } from './services/validationService';
import { RotateCcw } from 'lucide-react';

const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  name: "MUDr. Jan Novák",
  address: "Nemocniční 12, 110 00 Praha",
  ico: "12345678",
  icp: "88812345",
  specializationCode: "001",
  contact: "+420 123 456 789"
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult>({
    rawTranscript: '',
    segments: [],
    entities: [],
    report: null
  });
  const [validationResult, setValidationResult] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [progress, setProgress] = useState<string>("");
  const [isRegeneratingReport, setIsRegeneratingReport] = useState(false);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(DEFAULT_PROVIDER_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem('medvoice_config');
    if (saved) {
      try {
        setProviderConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load config", e);
      }
    }
  }, []);

  const saveConfig = (newConfig: ProviderConfig) => {
    setProviderConfig(newConfig);
    localStorage.setItem('medvoice_config', JSON.stringify(newConfig));
  };

  const handleAudioReady = async (file: AudioFile) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file.blob);
    setAudioUrl(url);

    setAppState(AppState.PROCESSING_AUDIO);
    
    try {
      setProgress("Zpracovávám přepis pomocí AI...");
      const { text, segments } = await transcribeAudio(file.blob, file.mimeType);
      
      setResult(prev => ({ ...prev, rawTranscript: text, segments }));
      setAppState(AppState.ANALYZING);

      setProgress("Analyzuji klinické entity...");
      const [entities, detectedType] = await Promise.all([
        extractEntities(text),
        classifyDocument(text)
      ]);

      setProgress(`Generuji ${detectedType}...`);
      const report = await generateStructuredDocument(text, detectedType, entities);
      
      // Inject provider config into report data
      if (report.data.poskytovatel) {
        report.data.poskytovatel.lekar = providerConfig.name;
        report.data.poskytovatel.adresa = providerConfig.address;
        report.data.poskytovatel.ico = providerConfig.ico;
        report.data.poskytovatel.icp = providerConfig.icp;
        report.data.poskytovatel.odbornost = providerConfig.specializationCode;
      }

      const validation = validateReport(report);
      setValidationResult(validation);

      setResult(prev => ({
        ...prev,
        entities,
        report
      }));

      setAppState(AppState.REVIEW);

    } catch (error) {
      console.error("Workflow failed", error);
      setAppState(AppState.ERROR);
    }
  };

  const handleReportUpdate = (newReport: StructuredReport) => {
    setResult(prev => ({ ...prev, report: newReport }));
    const validation = validateReport(newReport);
    setValidationResult(validation);
  };

  const handleEntitiesUpdate = (newEntities: MedicalEntity[]) => {
      setResult(prev => ({ ...prev, entities: newEntities }));
  };

  const handleRegenerateReport = async (type: ReportType) => {
      if (!result.rawTranscript) return;
      setIsRegeneratingReport(true);
      try {
          // Vždy používáme aktuální entities ze stavu (které mohl lékař editovat)
          const newReport = await generateStructuredDocument(result.rawTranscript, type, result.entities);
          
          // Inject provider info
          if (newReport.data.poskytovatel) {
            newReport.data.poskytovatel.lekar = providerConfig.name;
            newReport.data.poskytovatel.odbornost = providerConfig.specializationCode;
            newReport.data.poskytovatel.adresa = providerConfig.address;
            newReport.data.poskytovatel.ico = providerConfig.ico;
            newReport.data.poskytovatel.icp = providerConfig.icp;
          }

          setResult(prev => ({ ...prev, report: newReport }));
          const validation = validateReport(newReport);
          setValidationResult(validation);
      } catch (error) {
          console.error("Failed to regenerate", error);
      } finally {
          setIsRegeneratingReport(false);
      }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAppState(AppState.IDLE);
    setAudioFile(null);
    setResult({ rawTranscript: '', segments: [], entities: [], report: null });
    setValidationResult({ isValid: true, errors: [] });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        doctorName={providerConfig.name}
        specialization={providerConfig.specializationCode}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        config={providerConfig}
        onSave={saveConfig}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {appState !== AppState.REVIEW ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh]">
            <AudioRecorder onAudioReady={handleAudioReady} appState={appState} progress={progress} />
          </div>
        ) : null}

        {appState === AppState.REVIEW && result.report && (
          <div className="h-[calc(100vh-160px)] flex flex-col animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-2xl text-[11px] font-bold uppercase tracking-widest border border-emerald-200 shadow-sm">
                        Klinická analýza dokončena
                    </span>
                    <span className="text-slate-400 text-xs font-mono">{audioFile?.name}</span>
                </div>
                <button onClick={reset} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-xs font-bold uppercase tracking-widest transition-all">
                    <RotateCcw size={16} /> Nový záznam
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
                 <div className="h-full min-h-0 shadow-2xl rounded-3xl overflow-hidden">
                    <TranscriptEditor 
                        transcript={result.rawTranscript}
                        segments={result.segments}
                        audioUrl={audioUrl}
                    />
                 </div>

                 <div className="h-full min-h-0">
                    <AnalysisDisplay 
                        entities={result.entities} 
                        report={result.report}
                        validationResult={validationResult}
                        onReportChange={handleReportUpdate}
                        onEntitiesChange={handleEntitiesUpdate}
                        onRegenerateReport={handleRegenerateReport}
                        isRegenerating={isRegeneratingReport}
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