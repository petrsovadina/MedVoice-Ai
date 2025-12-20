
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Headphones, Clock, Info, Shield, Pill, Activity, Stethoscope, Volume2, Anchor, MousePointer2 } from 'lucide-react';
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
  const [followAudio, setFollowAudio] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentsContainerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();

  // Synchronizace času a aktivního segmentu
  const updateStatus = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);

      // Najdeme nejvhodnější segment (ten, který právě probíhá nebo poslední proběhlý)
      let currentIndex = -1;
      for (let i = 0; i < segments.length; i++) {
        if (time >= segments[i].start && time <= segments[i].end) {
          currentIndex = i;
          break;
        }
        // Pokud jsme v mezeře mezi segmenty, označíme ten předchozí jako doznívající
        if (i < segments.length - 1 && time > segments[i].end && time < segments[i+1].start) {
            currentIndex = i;
        }
      }

      if (currentIndex !== -1 && currentIndex !== activeSegmentIndex) {
        setActiveSegmentIndex(currentIndex);
        
        if (followAudio) {
          const element = segmentsContainerRef.current?.children[currentIndex] as HTMLElement;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(updateStatus);
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateStatus);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, activeSegmentIndex, followAudio, segments]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const onLoadedMetadata = () => setDuration(audio.duration);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onEnded = () => {
        setIsPlaying(false);
        setActiveSegmentIndex(null);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('play', onPlay);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
      };
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play().catch(console.error);
    }
  };

  const seekTo = (time: number, index: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setActiveSegmentIndex(index);
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
              className={`px-1 rounded-md border-b-2 border-transparent font-bold transition-all cursor-pointer
              ${match.category === 'SYMPTOM' ? 'bg-orange-100 text-orange-900 border-orange-300' : 
                match.category === 'MEDICATION' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 
                match.category === 'DIAGNOSIS' ? 'bg-blue-100 text-blue-900 border-blue-300' : 
                'bg-slate-100 text-slate-900 border-slate-300'}
              hover:shadow-md hover:-translate-y-0.5 active:scale-95`}
            >
              {part}
            </span>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 shadow-xl flex items-center gap-1">
              <Icon size={10} className="text-white/70" />
              {meta.label}
            </span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
              <Headphones size={12} className="text-primary-600" /> Karaoke Přepis
          </h3>
          <button 
            onClick={() => setFollowAudio(!followAudio)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${followAudio ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'}`}
          >
            {followAudio ? <Anchor size={10} /> : <MousePointer2 size={10} />}
            {followAudio ? 'Sledovat audio' : 'Volný posun'}
          </button>
        </div>
        
        {audioUrl && (
            <div className="bg-white p-3 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-sm">
                <audio ref={audioRef} src={audioUrl} preload="auto" />
                <button onClick={togglePlay} className={`w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all shadow-lg active:scale-95 shrink-0 ${isPlaying ? 'bg-primary-600' : 'bg-slate-900'}`}>
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative cursor-pointer" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = x / rect.width;
                        if (audioRef.current) audioRef.current.currentTime = pct * duration;
                    }}>
                        <div className="absolute top-0 left-0 h-full bg-primary-500 transition-none" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-slate-400 font-mono">
                        <span className={isPlaying ? "text-primary-600" : ""}>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      <div ref={segmentsContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-white scroll-smooth pb-20">
        {segments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-20 text-center">
            <Clock size={32} className="mb-2 opacity-20" />
            <p className="text-[9px] uppercase tracking-widest font-black">Čekám na přepis...</p>
          </div>
        ) : (
          segments.map((seg, idx) => {
              const isActive = activeSegmentIndex === idx;
              const isDoctor = seg.speaker === 'Lékař';
              return (
                  <div key={idx} onClick={() => seekTo(seg.start, idx)} className={`flex flex-col cursor-pointer transition-all duration-300 ${isDoctor ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-primary-600' : (isDoctor ? 'text-slate-400' : 'text-emerald-500')}`}>
                            {seg.speaker}
                        </span>
                        <span className="text-[7px] font-bold text-slate-300 font-mono">[{formatTime(seg.start)}]</span>
                        {isActive && isPlaying && <div className="flex gap-0.5 h-2 items-end">
                            <div className="w-0.5 bg-primary-400 animate-[bounce_0.6s_infinite_0ms]"></div>
                            <div className="w-0.5 bg-primary-400 animate-[bounce_0.6s_infinite_100ms]"></div>
                            <div className="w-0.5 bg-primary-400 animate-[bounce_0.6s_infinite_200ms]"></div>
                        </div>}
                      </div>
                      <div className={`p-3.5 rounded-2xl max-w-[92%] text-xs leading-relaxed transition-all duration-300 border ${isActive ? 'border-primary-300 bg-primary-50/50 text-slate-900 shadow-md ring-2 ring-primary-50 scale-[1.01] z-10' : 'border-slate-50 bg-slate-50/30 text-slate-500'} ${isDoctor ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
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
