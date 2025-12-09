import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
    Eye, Edit2, Check, Play, Pause, 
    Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered 
} from 'lucide-react';
import { TranscriptSegment } from '../types';

interface TranscriptEditorProps {
  transcript: string;
  segments?: TranscriptSegment[];
  audioUrl?: string | null;
  onTranscriptChange: (newTranscript: string) => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ 
    transcript, 
    segments = [], 
    audioUrl,
    onTranscriptChange 
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Editor Setup
  const editor = useEditor({
    extensions: [
        StarterKit,
        Placeholder.configure({
            placeholder: 'Začněte psát...',
        }),
    ],
    content: transcript,
    editorProps: {
        attributes: {
            class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px]',
        },
    },
    onUpdate: ({ editor }) => {
        // Optional: auto-save logic could go here
    }
  });

  // Sync editor content if transcript changes externally
  useEffect(() => {
    if (editor && transcript !== editor.getText()) {
        if (!isEditing) {
             editor.commands.setContent(transcript);
        }
    }
  }, [transcript, editor, isEditing]);

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
      if (isPlaying && !isEditing) {
          const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime <= s.end);
          if (activeIndex !== -1 && segmentRefs.current[activeIndex]) {
              segmentRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }
  }, [currentTime, isPlaying, segments, isEditing]);


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

  const toggleEditMode = () => {
      if (isEditing) {
          // Saving changes
          if (editor) {
              const text = editor.getText(); // Get plain text for analysis
              onTranscriptChange(text);
          }
      } else {
          // Entering edit mode
          if (editor) {
              // Ensure editor has latest content before editing
              editor.commands.setContent(transcript);
          }
      }
      setIsEditing(!isEditing);
  };

  const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderSegments = () => {
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
                        onClick={() => isEditing && toggleEditMode()}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${!isEditing ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Eye size={12} /> Číst
                    </button>
                    <button
                        onClick={() => !isEditing && toggleEditMode()}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${isEditing ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Edit2 size={12} /> Upravit
                    </button>
                </div>
            </div>

            {/* Edit Mode Save Button */}
            {isEditing && (
                 <button 
                    onClick={toggleEditMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm"
                 >
                    <Check size={14} /> Uložit úpravy
                 </button>
            )}
        </div>

        {/* FORMATTING TOOLBAR (Visible only in Edit Mode) */}
        {isEditing && editor && (
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bold') ? 'is-active' : 'text-slate-600'}`}
                    title="Tučně"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('italic') ? 'is-active' : 'text-slate-600'}`}
                    title="Kurzíva"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('strike') ? 'is-active' : 'text-slate-600'}`}
                    title="Přeškrtnuté"
                >
                    <Strikethrough size={16} />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1"></div>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'is-active' : 'text-slate-600'}`}
                    title="Nadpis 1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'is-active' : 'text-slate-600'}`}
                    title="Nadpis 2"
                >
                    <Heading2 size={16} />
                </button>
                <div className="w-px h-5 bg-slate-300 mx-1"></div>
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('bulletList') ? 'is-active' : 'text-slate-600'}`}
                    title="Seznam"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${editor.isActive('orderedList') ? 'is-active' : 'text-slate-600'}`}
                    title="Číslovaný seznam"
                >
                    <ListOrdered size={16} />
                </button>
            </div>
        )}

        {/* Audio Player Bar - Only visible in Read Mode or if we want it during edit (optional, usually hide during edit to focus) */}
        {!isEditing && audioUrl && (
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
        {isEditing ? (
             <div className="h-full overflow-y-auto p-4 cursor-text">
                <EditorContent editor={editor} />
             </div>
        ) : (
            <div className="w-full h-full p-6 overflow-y-auto bg-slate-50/30 scroll-smooth">
                {transcript.trim() ? renderSegments() : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                        <p>Zatím žádný přepis.</p>
                    </div>
                )}
            </div>
        )}
      </div>
      
      <div className="p-2 bg-slate-50 border-t border-slate-200 text-right">
        <span className="text-xs text-slate-400 mr-2">{transcript.length} znaků</span>
      </div>
    </div>
  );
};