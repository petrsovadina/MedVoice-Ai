
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Square, AlertCircle, Sparkles, Volume2 } from 'lucide-react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startVisualizer = (stream: MediaStream) => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for(let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(92, 215, 185)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startVisualizer(stream);
      
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }
      
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
        const timeStr = new Date().toLocaleTimeString('cs-CZ').replace(/:/g, '-');
        
        onAudioReady({
            blob,
            mimeType: actualMimeType,
            name: `Nahravka_${timeStr}.webm`
        });
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      recorder.start();
      setIsRecording(true);
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err) {
      alert("Nelze přistupovat k mikrofonu.");
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isBusy = appState === AppState.PROCESSING_AUDIO || appState === AppState.ANALYZING;

  if (isBusy) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-[40px] shadow-2xl border border-slate-100 p-16 text-center">
        <div className="flex flex-col items-center">
            <div className="relative mb-10">
                <div className="absolute inset-0 bg-primary-100 rounded-full animate-ping opacity-20 scale-150"></div>
                <div className="relative bg-white p-8 rounded-full shadow-xl border border-slate-50 z-10 text-primary-600">
                    <Sparkles size={48} className="animate-pulse" />
                </div>
                <div className="absolute inset-0 -m-3 border-4 border-primary-100 rounded-full"></div>
                <div className="absolute inset-0 -m-3 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight italic">
               {appState === AppState.PROCESSING_AUDIO ? 'Slyším tě, zpracovávám...' : 'AI Medicínské Uvažování...'}
            </h3>
            <div className="w-64 h-1.5 bg-slate-100 rounded-full mt-6 mb-4 overflow-hidden relative">
               <div className="absolute top-0 left-0 h-full bg-primary-500 rounded-full animate-indeterminate w-1/3"></div>
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">{progress || "Inicializace algoritmů..."}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[40px] shadow-2xl border border-slate-100 p-10 text-center">
      <div className="mb-10 text-left">
        <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tighter uppercase">Nová Konzultace</h2>
        <p className="text-slate-400 font-medium">Spusťte záznam pro automatickou tvorbu dokumentace dle vyhlášky.</p>
      </div>

      <div className={`relative p-10 rounded-[32px] border-2 transition-all overflow-hidden ${isRecording ? 'border-red-500 bg-red-50/30' : 'border-slate-100 bg-slate-50'}`}>
          {isRecording && (
              <canvas ref={canvasRef} className="absolute bottom-0 left-0 w-full h-24 opacity-30 pointer-events-none" width={400} height={100} />
          )}

          {isRecording ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">{formatTime(recordingTime)}</span>
                  </div>
                  <p className="text-red-500 font-black text-[10px] uppercase tracking-[0.3em] mb-8">Záznam probíhá (Live Processing)</p>
                  <button onClick={stopRecording} className="flex items-center gap-4 px-10 py-5 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95">
                      <Square size={20} fill="currentColor" /> Ukončit a analyzovat
                  </button>
              </div>
          ) : (
              <div className="flex flex-col items-center">
                  <button onClick={startRecording} className="mb-6 h-28 w-28 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-2xl shadow-primary-200 transition-all transform hover:scale-110 active:scale-90">
                      <Mic size={48} />
                  </button>
                  <p className="text-lg font-black text-slate-800 uppercase tracking-tight mb-1">Spustit diktát</p>
                  <p className="text-sm font-bold text-slate-400">Automaticky rozpozná diagnózy a léky</p>
              </div>
          )}

          {!isRecording && (
              <div className="mt-10 pt-8 border-t border-slate-200 w-full">
                  <label className="flex items-center justify-center gap-3 text-slate-400 hover:text-primary-600 cursor-pointer transition-colors group">
                      <Upload size={20} className="group-hover:scale-125 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">Nahrát audio soubor</span>
                      <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && onAudioReady({blob: e.target.files[0], mimeType: e.target.files[0].type, name: e.target.files[0].name})} className="hidden" />
                  </label>
              </div>
          )}
      </div>
    </div>
  );
};
