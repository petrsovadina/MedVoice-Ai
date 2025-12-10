
import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { AppState, AudioFile, ProcessingResult, StructuredReport, ReportType, ValidationResult } from './types';
import { transcribeAudio, extractEntities, classifyDocument, generateStructuredDocument } from './services/geminiService';
import { validateReport } from './services/validationService';
import { RotateCcw } from 'lucide-react';

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

  const handleAudioReady = async (file: AudioFile) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file.blob);
    setAudioUrl(url);

    setAppState(AppState.PROCESSING_AUDIO);
    
    try {
      // 1. Transcribe
      setProgress("Nahrávám audio a zpracovávám přepis...");
      const { text, segments } = await transcribeAudio(file.blob, file.mimeType);
      
      setResult(prev => ({ ...prev, rawTranscript: text, segments }));
      setAppState(AppState.ANALYZING);

      // 2. Extract Entities (Parallel) & Classify Document
      setProgress("Analyzuji entity a klasifikuji typ dokumentu...");
      
      const [entities, detectedType] = await Promise.all([
        extractEntities(text),
        classifyDocument(text)
      ]);

      // 3. Generate Specific Report
      setProgress(`Generuji dokument typu: ${detectedType}...`);
      const report = await generateStructuredDocument(text, detectedType, entities);
      
      // 4. Validate Initial Report
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
    // Real-time validation on change
    const validation = validateReport(newReport);
    setValidationResult(validation);
  };

  const handleRegenerateReport = async (type: ReportType) => {
      if (!result.rawTranscript) return;
      setIsRegeneratingReport(true);
      try {
          const newReport = await generateStructuredDocument(result.rawTranscript, type, result.entities);
          setResult(prev => ({ ...prev, report: newReport }));
          const validation = validateReport(newReport);
          setValidationResult(validation);
      } catch (error) {
          console.error("Failed to regenerate", error);
          alert("Chyba při regeneraci.");
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {appState !== AppState.REVIEW ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AudioRecorder onAudioReady={handleAudioReady} appState={appState} progress={progress} />
          </div>
        ) : null}

        {appState === AppState.REVIEW && result.report && (
          <div className="h-[calc(100vh-140px)] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        Hotovo
                    </span>
                    <span className="text-slate-500 text-sm font-medium">{audioFile?.name}</span>
                </div>
                <button onClick={reset} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-sm font-medium">
                    <RotateCcw size={16} /> Nový záznam
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                 <div className="h-full min-h-0">
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
                        onRegenerateReport={handleRegenerateReport}
                        isRegenerating={isRegeneratingReport}
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
