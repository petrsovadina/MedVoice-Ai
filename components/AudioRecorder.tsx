import React, { useState, useRef } from 'react';
import { Mic, Upload, Square, AlertCircle, Sparkles } from 'lucide-react';
import { AppState, AudioFile } from '../types';

interface AudioRecorderProps {
  onAudioReady: (file: AudioFile) => void;
  appState: AppState;
  progress?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAudioReady, appState, progress }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine the best supported mime type for the browser
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
      // Fallback to browser default if no specific type matches
      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const actualMimeType = mediaRecorderRef.current?.mimeType || selectedMimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        
        // Determine appropriate extension
        let ext = 'webm';
        if (actualMimeType.includes('mp4') || actualMimeType.includes('aac')) ext = 'm4a';
        if (actualMimeType.includes('wav')) ext = 'wav';

        // Sanitize filename
        const timeStr = new Date().toLocaleTimeString('cs-CZ').replace(/:/g, '-');

        onAudioReady({
            blob,
            mimeType: actualMimeType,
            name: `Nahravka_${timeStr}.${ext}`
        });
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      
      // Timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Nelze přistupovat k mikrofonu. Zkontrolujte oprávnění.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioReady({
        blob: file,
        mimeType: file.type || "audio/mp3", // fallback
        name: file.name
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isBusy = appState === AppState.PROCESSING_AUDIO || appState === AppState.ANALYZING;

  // Render Loading State
  if (isBusy) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center transition-all">
        <div className="flex flex-col items-center justify-center">
            {/* Animated Icon Circle */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-20"></div>
                <div className="relative bg-white p-6 rounded-full shadow-lg border border-slate-100 z-10">
                    {appState === AppState.PROCESSING_AUDIO ? (
                        <Mic size={32} className="text-primary-600 animate-pulse" />
                    ) : (
                        <Sparkles size={32} className="text-purple-600 animate-pulse" />
                    )}
                </div>
                {/* Spinner Ring */}
                <div className="absolute inset-0 -m-2 border-4 border-primary-100 rounded-full"></div>
                <div className="absolute inset-0 -m-2 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">
               {appState === AppState.PROCESSING_AUDIO ? 'Zpracování Záznamu' : 'AI Analýza'}
            </h3>
            
            {/* Progress Bar */}
            <div className="w-64 h-2 bg-slate-200 rounded-full mt-4 mb-4 overflow-hidden relative">
               <div className="absolute top-0 left-0 h-full bg-primary-500 rounded-full animate-indeterminate w-1/2"></div>
            </div>
            
            <p className="text-slate-500 font-medium text-sm animate-pulse text-center max-w-xs">{progress || "Prosím čekejte..."}</p>
         </div>
      </div>
    );
  }

  // Render Recording/Idle State
  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Nová Konzultace</h2>
        <p className="text-slate-500">Nahrajte rozhovor s pacientem nebo vložte audio soubor.</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Recorder Area */}
        <div className={`relative p-8 rounded-xl border-2 border-dashed transition-all ${isRecording ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:border-primary-400 bg-slate-50'}`}>
            
            {isRecording ? (
                <div className="flex flex-col items-center animate-pulse">
                    <div className="h-4 w-24 bg-red-400 rounded-full mb-4"></div>
                    <span className="text-4xl font-mono text-slate-800 mb-2">{formatTime(recordingTime)}</span>
                    <p className="text-red-600 font-medium mb-6">Nahrávání probíhá...</p>
                    <button 
                        onClick={stopRecording}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold shadow-lg transition-all transform hover:scale-105"
                    >
                        <Square size={20} fill="currentColor" /> Ukončit nahrávání
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <button 
                        onClick={startRecording}
                        disabled={isBusy}
                        className={`mb-4 h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 ${isBusy ? 'bg-slate-300 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                        <Mic size={32} />
                    </button>
                    <p className="text-lg font-medium text-slate-700 mb-1">Klikněte pro nahrávání</p>
                    <p className="text-sm text-slate-500">nebo</p>
                </div>
            )}

            {!isRecording && (
                <div className="mt-6 pt-6 border-t border-slate-200 w-full">
                    <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${isBusy ? 'text-slate-400 cursor-not-allowed' : 'text-primary-600 hover:bg-primary-50'}`}>
                        <Upload size={20} />
                        <span className="font-medium">Nahrát soubor (MP3, WAV, M4A)</span>
                        <input 
                            type="file" 
                            accept="audio/*" 
                            onChange={handleFileUpload}
                            disabled={isBusy}
                            className="hidden" 
                        />
                    </label>
                </div>
            )}
        </div>
      </div>
      
      {appState === AppState.ERROR && (
         <div className="mt-6 flex items-center justify-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
             <AlertCircle size={20} />
             <span>Nastala chyba při zpracování. Zkuste to prosím znovu.</span>
         </div>
      )}
    </div>
  );
};