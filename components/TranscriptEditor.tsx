import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, Check, Eye, Edit3, Play, Pause } from 'lucide-react';
import { correctTranscript } from '../services/geminiService';
import { TranscriptSegment } from '../types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface TranscriptEditorProps {
  transcript: string;
  segments?: TranscriptSegment[];
  onChange: (text: string) => void;
  audioUrl?: string | null;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ transcript, segments = [], onChange, audioUrl }) => {
  const [isPolishing, setIsPolishing] = useState(false);
  const [justPolished, setJustPolished] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  
  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Placeholder.configure({
        placeholder: 'Začněte psát nebo stiskněte "/" pro menu...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: transcript,
    editorProps: {
        attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px] max-w-none text-slate-800 leading-relaxed',
        },
    },
    onUpdate: ({ editor }) => {
        const text = editor.getText({ blockSeparator: "\n\n" });
        onChange(text);
    },
  });

  // Sync external transcript changes to editor
  useEffect(() => {
    if (editor && transcript && Math.abs(editor.getText().length - transcript.length) > 10) {
        // Prevent clearing content if it's just a small sync issue or cursor movement
        const currentContent = editor.getText({ blockSeparator: "\n\n" });
        if (currentContent !== transcript) {
             // Only update if difference is significant to avoid cursor jumps
             editor.commands.setContent(transcript);
        }
    }
  }, [transcript, editor]);

  // Automatically default to 'edit' if empty or no segments, otherwise 'preview'
  useEffect(() => {
    if (!transcript) {
        setViewMode('edit');
    } else if (segments.length > 0 && viewMode === 'edit') {
        // Only switch if we just got segments, but be careful not to override user choice too aggressively
        // For now, we respect the user unless it's the initial load
    }
  }, [transcript, segments.length]);

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
      if (viewMode === 'preview' && isPlaying) {
          const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
          if (activeIndex !== -1 && segmentRefs.current[activeIndex]) {
              segmentRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentTime, isPlaying, segments, viewMode]);


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

  // Full Document Polish
  const handleAiPolish = async () => {
    setIsPolishing(true);
    try {
      const polishedText = await correctTranscript(transcript);
      if (editor) {
          editor.commands.setContent(polishedText);
      }
      onChange(polishedText);
      setJustPolished(true);
      setTimeout(() => setJustPolished(false), 3000);
    } catch (error) {
      console.error("Polish failed", error);
    } finally {
      setIsPolishing(false);
    }
  };

  const renderPreview = () => {
    // If we have structured segments, use them for interactive playback
    if (segments && segments.length > 0) {
        return segments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isDoctor = seg.speaker === 'Lékař';

            return (
                <div 
                    key={idx} 
                    ref={el => {segmentRefs.current[idx] = el}}
                    onClick={() => seekTo(seg.start)}
                    className={`mb-4 flex flex-col cursor-pointer transition-all duration-300 ${isDoctor ? 'items-start' : 'items-end'} ${isActive ? 'opacity-100 scale-[1.01]' : 'opacity-70 hover:opacity-100'}`}
                >
                     <span className={`text-xs font-bold uppercase mb-1 px-2.5 py-0.5 rounded-full border shadow-sm ${
                        isDoctor 
                        ? 'bg-blue-100 text-blue-800 border-blue-200' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {seg.speaker} <span className="text-[10px] opacity-70 ml-1">({formatTime(seg.start)})</span>
                    </span>
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

    // Fallback parsing if segments are missing
    return transcript.split('\n').map((line, idx) => {
      const cleanLine = line.replace(/\*\*/g, '').trim(); 
      if (!cleanLine) return <div key={idx} className="h-2"></div>;

      const isDoctor = cleanLine.startsWith('Lékař:') || cleanLine.startsWith('Lékař');
      
      return (
        <div key={idx} className={`mb-2 p-2 rounded ${isDoctor ? 'bg-white' : 'bg-slate-100'}`}>
            {line}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header Toolbar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700 ml-2">Přepis Záznamu</h3>
                <div className="flex bg-slate-200 rounded-lg p-0.5 ml-4">
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Eye size={12} /> Číst
                    </button>
                    <button
                        onClick={() => setViewMode('edit')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Edit3 size={12} /> Upravit
                    </button>
                </div>
            </div>
            
            <button 
            onClick={handleAiPolish}
            disabled={isPolishing || transcript.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                ${justPolished 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="Opravit celý dokument"
            >
            {isPolishing ? <Loader2 size={14} className="animate-spin" /> : justPolished ? <Check size={14} /> : <Wand2 size={14} />}
            {isPolishing ? 'Opravuji...' : justPolished ? 'Hotovo' : 'AI Korektura'}
            </button>
        </div>

        {/* Audio Player Bar */}
        {audioUrl && (
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                <button 
                    onClick={togglePlay}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
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
                    className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary-600 [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {viewMode === 'edit' && editor ? (
             <div className="h-full w-full overflow-y-auto cursor-text text-sm">
                 <EditorContent editor={editor} className="h-full p-8 outline-none" />
             </div>
        ) : (
            <div className="w-full h-full p-6 overflow-y-auto bg-slate-50/30 scroll-smooth">
                {transcript.trim() ? renderPreview() : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <p>Zatím žádný přepis.</p>
                    </div>
                )}
            </div>
        )}

        {isPolishing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
             <div className="bg-white px-5 py-3 rounded-full shadow-xl border border-slate-200 flex items-center gap-3 animate-bounce-subtle">
                <Loader2 size={18} className="animate-spin text-primary-600" />
                <span className="text-sm font-medium text-slate-700">Gemini vylepšuje text...</span>
             </div>
          </div>
        )}
      </div>
      
      <div className="p-2 bg-slate-50 border-t border-slate-200 text-right">
        <span className="text-xs text-slate-400 mr-2">{editor?.storage.characterCount?.characters() || transcript.length} znaků</span>
      </div>
    </div>
  );
};