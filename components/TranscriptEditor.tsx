
import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, Pause, Lock, FileAudio, Clock
} from 'lucide-react';
import { TranscriptSegment } from '../types';

interface TranscriptViewerProps {
  transcript: string;
  segments?: TranscriptSegment[];
  audioUrl?: string | null;
}

export const TranscriptEditor: React.FC<TranscriptViewerProps> = ({ 
    transcript, 
    segments = [], 
    audioUrl
}) => {
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Audio Event Handlers
  useEffect(() => {
    if (audioRef.current) {
        const audio = audioRef.current;
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        const onEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }
  }, [audioUrl]);

  // Auto-scroll to active segment
  useEffect(() => {
      if (isPlaying) {
          const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
          if (activeIndex !== -1 && segmentRefs.current[activeIndex]) {
              segmentRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentTime, isPlaying, segments]);

  const togglePlay = () => {
      if (audioRef.current) {
          if (isPlaying) {
              audioRef.current.pause();
          } else {
              audioRef.current.play();
          }
          setIsPlaying(!isPlaying);
      }
  };

  const seekTo = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (!isPlaying) {
             audioRef.current.play();
             setIsPlaying(true);
          }
      }
  };

  const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSegments = () => {
    if (segments && segments.length > 0) {
        return segments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isDoctor = seg.speaker === 'Lékař';

            return (
                <div 
                    key={idx} 
                    ref={el => {segmentRefs.current[idx] = el}}
                    onClick={() => seekTo(seg.start)}
                    className={`mb-4 flex flex-col cursor-pointer transition-all duration-300 group ${isDoctor ? 'items-start' : 'items-end'} ${isActive ? 'opacity-100 scale-[1.01]' : 'opacity-70 hover:opacity-100'}`}
                >
                     <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border shadow-sm flex items-center gap-1 ${
                            isDoctor 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                        {seg.speaker}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Clock size={10} /> {formatTime(seg.start)}
                        </span>
                     </div>
                    
                    <div className={`p-3.5 rounded-2xl max-w-[90%] text-sm leading-relaxed shadow-sm border transition-colors ${
                        isActive ? 'ring-2 ring-offset-1 ring-primary-300' : ''
                    } ${
                        isDoctor 
                        ? 'bg-white border-slate-200 text-slate-900 rounded-tl-none' 
                        : 'bg-emerald-50/50 border-emerald-100 text-slate-900 rounded-tr-none'
                    }`}>
                       {seg.text}
                    </div>
                </div>
            );
        });
    }

    // Fallback text view
    return (
        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-normal">
            {transcript || "Zatím žádný přepis."}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header / Info Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <FileAudio size={18} className="text-slate-500" />
                <h3 className="font-bold text-slate-700">Přepis Záznamu</h3>
            </div>
            
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs font-semibold text-slate-500" title="Přepis nelze editovat - slouží jako důkazní materiál">
                <Lock size={12} />
                <span>Oficiální záznam</span>
            </div>
        </div>

        {/* Audio Player Controls */}
        {audioUrl && (
            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                <button 
                    onClick={togglePlay}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm"
                >
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="text-xs font-mono text-slate-500 w-16 text-center">
                    {formatTime(currentTime)} / {formatTime(duration || 0)}
                </div>
                <input 
                    type="range" 
                    min={0} 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={(e) => {
                        const time = Number(e.target.value);
                        setCurrentTime(time);
                        if(audioRef.current) audioRef.current.currentTime = time;
                    }}
                    className="flex-1 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-slate-700 [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-slate-50/30">
        <div className="w-full h-full p-6 overflow-y-auto scroll-smooth">
            {renderSegments()}
        </div>
      </div>
      
      <div className="p-2 bg-slate-50 border-t border-slate-200 text-right">
        <span className="text-xs text-slate-400 mr-2 font-mono">
            {segments.length} segmentů • {transcript.length} znaků
        </span>
      </div>
    </div>
  );
};
