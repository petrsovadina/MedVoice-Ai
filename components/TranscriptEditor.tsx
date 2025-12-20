
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Headphones, Clock, Info, Shield, Pill, Activity, Stethoscope, Volume2 } from 'lucide-react';
import { TranscriptSegment, MedicalEntity } from '../types';

interface TranscriptViewerProps {
  transcript: string;
  segments?: TranscriptSegment[];
  entities?: MedicalEntity[];
  audioUrl?: string | null;
  onEntityClick?: (text: string) => void;
}

const CATEGORY_LABELS: Record<string, { label: string, icon: any, color: string, textColor: string }> = {
  DIAGNOSIS: { label: 'Diagnóza', icon: Activity, color: 'bg-blue-600', textColor: 'text-blue-800' },
  MEDICATION: { label: 'Medikace', icon: Pill, color: 'bg-emerald-600', textColor: 'text-emerald-800' },
  SYMPTOM: { label: 'Symptom', icon: Stethoscope, color: 'bg-orange-600', textColor: 'text-orange-800' },
  PII: { label: 'Osobní údaj', icon: Shield, color: 'bg-slate-700', textColor: 'text-slate-800' },
};

export const TranscriptEditor: React.FC<TranscriptViewerProps> = ({ 
    segments = [], entities = [], audioUrl, onEntityClick
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentsContainerRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef<number | null>(null);

  useEffect(() => {
    if (audioRef.current) {
        const audio = audioRef.current;
        const updateTime = () => {
            const time = audio.currentTime;
            if (Number.isFinite(time)) {
                setCurrentTime(time);
                const index = segments.findIndex(s => time >= s.start && time <= s.end);
                if (index !== -1 && index !== activeSegmentIndex) {
                    setActiveSegmentIndex(index);
                    if (index !== lastScrolledIndex.current) {
                        const element = segmentsContainerRef.current?.children[index] as HTMLElement;
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            lastScrolledIndex.current = index;
                        }
                    }
                } else if (index === -1) {
                    setActiveSegmentIndex(null);
                }
            }
        };

        const updateDuration = () => {
            if (Number.isFinite(audio.duration)) setDuration(audio.duration);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
        };
    }
  }, [audioUrl, segments, activeSegmentIndex]);

  const togglePlay = () => {
      if (audioRef.current) {
          if (isPlaying) audioRef.current.pause();
          else audioRef.current.play().catch(console.error);
      }
  };

  const seekTo = (time: number, index: number) => {
      if (audioRef.current && Number.isFinite(time)) {
          audioRef.current.currentTime = time;
          setActiveSegmentIndex(index);
          lastScrolledIndex.current = index;
          if (audioRef.current.paused) audioRef.current.play().catch(console.error);
      }
  };

  const formatTime = (time: number) => {
      if (!Number.isFinite(time)) return "0:00";
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightText = (text: string) => {
    if (!entities || entities.length === 0) return text;
    const sorted = [...entities].filter(e => e.text.length > 2).sort((a, b) => b.text.length - a.text.length);
    if (sorted.length === 0) return text;

    const escapedTerms = sorted.map(e => e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const match = sorted.find(e => e.text.toLowerCase() === part.toLowerCase());
      if (match) {
        const meta = CATEGORY_LABELS[match.category] || { label: 'Ostatní', icon: Info };
        const Icon = meta.icon;
        return (
          <span key={i} className="relative group inline-block mx-0.5">
            <span 
              onClick={(e) => { e.stopPropagation(); onEntityClick?.(part); }}
              className={`px-1.5 py-0.5 rounded-md border-b-2 border-transparent font-bold transition-all cursor-pointer
              ${match.category === 'SYMPTOM' ? 'bg-orange-100 text-orange-900 border-orange-300' : 
                match.category === 'MEDICATION' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 
                match.category === 'DIAGNOSIS' ? 'bg-blue-100 text-blue-900 border-blue-300' : 
                'bg-slate-100 text-slate-900 border-slate-300'}
              hover:shadow-md hover:-translate-y-0.5 active:scale-95`}
            >
              {part}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 shadow-xl flex items-center gap-1.5 translate-y-1 group-hover:translate-y-0">
              <Icon size={10} className="text-white/70" />
              {meta.label}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></span>
            </span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
              <Headphones size={14} className="text-primary-600" /> Přepis (Karaoke)
          </h3>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" title="Diagnózy"></div>
            <div className="w-2 h-2 rounded-full bg-emerald-400" title="Medikace"></div>
            <div className="w-2 h-2 rounded-full bg-orange-400" title="Symptomy"></div>
          </div>
        </div>
        
        {audioUrl && (
            <div className="bg-white p-3 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <audio ref={audioRef} src={audioUrl} />
                <button onClick={togglePlay} className={`w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all shadow-lg active:scale-95 shrink-0 ${isPlaying ? 'bg-primary-600 animate-pulse' : 'bg-slate-900'}`}>
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-primary-500 transition-all duration-300" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 font-mono">
                        <span className={isPlaying ? "text-primary-600" : ""}>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      <div ref={segmentsContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white scroll-smooth">
        {segments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-20 text-center">
            <Clock size={32} className="mb-2 opacity-20" />
            <p className="text-[10px] uppercase tracking-widest font-black">Čekám na data z mikrofonu...</p>
          </div>
        ) : (
          segments.map((seg, idx) => {
              const isActive = activeSegmentIndex === idx;
              const isDoctor = seg.speaker === 'Lékař';
              return (
                  <div key={idx} onClick={() => seekTo(seg.start, idx)} className={`flex flex-col cursor-pointer transition-all duration-300 ${isDoctor ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {isActive && isPlaying && <Volume2 size={10} className="text-primary-500 animate-bounce" />}
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-primary-600' : (isDoctor ? 'text-slate-400' : 'text-emerald-500')}`}>
                            {seg.speaker}
                        </span>
                        <span className="text-[7px] font-bold text-slate-300 font-mono">[{formatTime(seg.start)}]</span>
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[90%] text-sm leading-relaxed transition-all duration-300 border ${isActive ? 'border-primary-400 bg-primary-50 text-slate-900 shadow-lg ring-4 ring-primary-50 scale-[1.02] z-10' : 'border-slate-100 bg-slate-50/50 text-slate-600'} ${isDoctor ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                         {highlightText(seg.text)}
                      </div>
                  </div>
              );
          })
        )}
      </div>
    </div>
  );
};
