import React, { useState } from 'react';
import { Header } from './components/Header';
import { AudioRecorder } from './components/AudioRecorder';
import { TranscriptEditor } from './components/TranscriptEditor';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { AppState, AudioFile, ProcessingResult, StructuredReport } from './types';
import { transcribeAudio, extractEntities, generateMedicalReport } from './services/geminiService';
import { RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null); // Store object URL for playback
  const [result, setResult] = useState<ProcessingResult>({
    rawTranscript: '',
    segments: [],
    entities: [],
    report: { subjective: '', objective: '', assessment: '', plan: '', summary: '' }
  });
  const [progress, setProgress] = useState<string>("");

  const handleAudioReady = async (file: AudioFile) => {
    setAudioFile(file);
    // Create an object URL for playback
    const url = URL.createObjectURL(file.blob);
    setAudioUrl(url);

    setAppState(AppState.PROCESSING_AUDIO);
    
    try {
      // 1. Transcribe
      setProgress("Příprava audia pro odeslání...");
      // Small delay to allow UI to render the initial state
      await new Promise(resolve => setTimeout(resolve, 100));

      setProgress("Nahrávám audio a zpracovávám přepis...");
      const { text, segments } = await transcribeAudio(file.blob, file.mimeType);
      
      setResult(prev => ({ ...prev, rawTranscript: text, segments }));
      setAppState(AppState.ANALYZING);

      // 2. Analyze & Generate Report (Parallel)
      setProgress("Analyzuji text a generuji lékařskou dokumentaci...");
      
      const [entities, report] = await Promise.all([
        extractEntities(text),
        generateMedicalReport(text)
      ]);

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

  const handleTranscriptUpdate = (newTranscript: string) => {
    setResult(prev => ({
        ...prev,
        rawTranscript: newTranscript,
        // Poznámka: Při manuální editaci textu se segments mohou rozcházet. 
        // Pro jednoduchost zde neměníme segments, což může ovlivnit karaoke mód,
        // ale text bude aktuální.
    }));
  };

  const handleReportUpdate = (newReport: StructuredReport) => {
    setResult(prev => ({
        ...prev,
        report: newReport
    }));
  };

  const reset = () => {
    // Revoke old URL to avoid memory leaks
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    setAppState(AppState.IDLE);
    setAudioFile(null);
    setResult({
        rawTranscript: '',
        segments: [],
        entities: [],
        report: { subjective: '', objective: '', assessment: '', plan: '', summary: '' }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* State: IDLE / Recording / Processing / Error */}
        {appState !== AppState.REVIEW ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AudioRecorder 
                onAudioReady={handleAudioReady} 
                appState={appState} 
                progress={progress}
            />
          </div>
        ) : null}

        {/* State: Review */}
        {appState === AppState.REVIEW && (
          <div className="h-[calc(100vh-140px)] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div> Hotovo
                    </span>
                    <span className="text-slate-500 text-sm font-medium">{audioFile?.name}</span>
                </div>
                <button 
                    onClick={reset}
                    className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors text-sm font-medium"
                >
                    <RotateCcw size={16} /> Nový záznam
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
                 {/* Left Column: Transcript */}
                 <div className="h-full min-h-0">
                    <TranscriptEditor 
                        transcript={result.rawTranscript}
                        segments={result.segments}
                        audioUrl={audioUrl}
                        onTranscriptChange={handleTranscriptUpdate}
                    />
                 </div>

                 {/* Right Column: Analysis */}
                 <div className="h-full min-h-0">
                    <AnalysisDisplay 
                        entities={result.entities} 
                        report={result.report}
                        onReportChange={handleReportUpdate}
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