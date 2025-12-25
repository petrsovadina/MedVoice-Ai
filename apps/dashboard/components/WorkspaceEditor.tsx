
import React, { useState, useEffect, useMemo } from 'react';
import { TranscriptSegment, MedicalEntity, ValidationSeverity } from '../types';
import { TranscriptEditor } from './TranscriptEditor';
import { 
    Zap, Trash2, Plus, Stethoscope, Pill, Activity, User, 
    ArrowRight, Sparkles, MessageSquare, Bold, Italic, List,
    X, Check, Search, Info, BrainCircuit, Eraser, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { validateEntities } from '../services/validationService';

interface WorkspaceEditorProps {
  transcript: string;
  segments: TranscriptSegment[];
  summary: string;
  entities: MedicalEntity[];
  onFinalize: (summary: string, entities: MedicalEntity[]) => void;
  isProcessing: boolean;
  audioUrl: string | null;
}

export const WorkspaceEditor: React.FC<WorkspaceEditorProps> = ({ 
    transcript, segments, summary: initialSummary, entities: initialEntities, onFinalize, isProcessing, audioUrl
}) => {
  const [entities, setEntities] = useState<MedicalEntity[]>(initialEntities.map(e => ({ ...e, isManual: e.isManual ?? false })));
  const [newEntityText, setNewEntityText] = useState<Record<string, string>>({});
  const [highlightedEntity, setHighlightedEntity] = useState<string | null>(null);

  const entityValidation = useMemo(() => validateEntities(entities), [entities]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Zde se objeví AI návrh klinického souhrnu...', }),
    ],
    content: initialSummary,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[400px] text-slate-700 leading-relaxed',
      },
    },
  });

  const handleUpdateEntity = (index: number, value: string) => {
    const newEnts = [...entities];
    newEnts[index].text = value;
    newEnts[index].isManual = true;
    setEntities(newEnts);
  };

  const handleMoveEntity = (index: number, newCategory: MedicalEntity['category']) => {
    const newEnts = [...entities];
    newEnts[index].category = newCategory;
    newEnts[index].isManual = true;
    setEntities(newEnts);
  };

  const handleRemoveEntity = (index: number) => {
    setEntities(entities.filter((_, i) => i !== index));
  };

  const handleAddEntity = (category: MedicalEntity['category'], text: string = "") => {
    const finalBin = text || newEntityText[category];
    if (!finalBin?.trim()) return;
    setEntities([...entities, { category, text: finalBin, isManual: true }]);
    setNewEntityText(prev => ({ ...prev, [category]: "" }));
  };

  const onTranscriptEntityClick = (text: string) => {
    setHighlightedEntity(text);
    setTimeout(() => setHighlightedEntity(null), 2000);
    const element = document.getElementById(`entity-${text}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const EntitySection = ({ title, category, icon: Icon, colorClass, borderColorClass }: { 
    title: string, category: MedicalEntity['category'], icon: any, colorClass: string, borderColorClass: string
  }) => {
    const filtered = entities.map((e, i) => ({...e, i})).filter(e => e.category === category);
    return (
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-md">
            <div className={`px-5 py-3 flex justify-between items-center ${colorClass} text-white`}>
                <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">{title}</h4>
                </div>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[9px] font-bold">{filtered.length}</span>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar bg-slate-50/30">
                {filtered.map((ent) => {
                    const issue = entityValidation.issues.find(i => i.index === ent.i);
                    return (
                        <div 
                            id={`entity-${ent.text}`}
                            key={ent.i} 
                            className={`flex flex-col gap-1 transition-all duration-500 ${highlightedEntity === ent.text ? 'scale-[1.02] z-10' : ''}`}
                        >
                            <div className={`flex items-center gap-2 bg-white border ${issue ? 'border-orange-300 ring-2 ring-orange-50' : borderColorClass} rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-offset-1 transition-all ${ent.isManual ? 'border-dashed border-slate-400' : ''}`}>
                                {ent.isManual ? <User size={10} className="text-slate-400 shrink-0" /> : <BrainCircuit size={10} className="text-primary-500 shrink-0" />}
                                <input 
                                    className="flex-1 text-xs font-bold text-slate-700 bg-transparent outline-none min-w-0"
                                    value={ent.text}
                                    onChange={(e) => handleUpdateEntity(ent.i, e.target.value)}
                                />
                                <div className="flex items-center gap-1">
                                    {issue && (
                                        <div className="group/issue relative">
                                            <AlertTriangle size={12} className="text-orange-500 cursor-help" />
                                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 text-white text-[9px] p-2 rounded-lg opacity-0 pointer-events-none group-hover/issue:opacity-100 transition-opacity z-50 shadow-xl">
                                                {issue.message}
                                                <div className="mt-1 flex gap-1 border-t border-white/10 pt-1">
                                                    <button onClick={() => handleMoveEntity(ent.i, category === 'SYMPTOM' ? 'DIAGNOSIS' : 'SYMPTOM')} className="text-primary-400 hover:text-primary-300">Změnit kategorii</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={() => handleRemoveEntity(ent.i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div className="pt-2">
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 text-[11px] p-2 bg-white border border-dashed border-slate-300 rounded-lg outline-none focus:border-solid focus:border-primary-400 transition-all italic"
                            placeholder="Nová položka..."
                            value={newEntityText[category] || ""}
                            onChange={(e) => setNewEntityText(prev => ({ ...prev, [category]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddEntity(category)}
                        />
                        <button onClick={() => handleAddEntity(category)} className={`p-2 rounded-lg transition-all ${newEntityText[category] ? `${colorClass} text-white` : 'bg-slate-100 text-slate-300'}`}><Plus size={14} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500">
        <style>{`
          .prose h3 {
            border-left: 4px solid #0ea5e9;
            padding-left: 12px;
            margin-top: 2rem;
            color: #1e293b;
            font-size: 0.875rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .prose h3:contains('O (Objektivně)') { border-left-color: #10b981; }
          .prose h3:contains('Dg') { border-left-color: #3b82f6; }
          .prose h3:contains('P (Plán)') { border-left-color: #f59e0b; }
          .prose p { margin-bottom: 1rem; }
          .prose strong { color: #0f172a; font-weight: 700; }
        `}</style>
        
        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-4">
                <div className="bg-primary-600 p-2.5 rounded-2xl text-white shadow-xl shadow-primary-500/20"><Sparkles size={24} /></div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5">Klinický Workspace</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-primary-100 text-primary-600 px-2 py-0.5 rounded uppercase">Verifikace dat</span>
                        <div className="h-1 w-1 bg-slate-300 rounded-full"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Zkontrolujte zvýrazněná varování</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {entityValidation.issues.filter(i => i.severity === ValidationSeverity.WARNING).length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-2xl text-orange-700 animate-pulse">
                        <AlertTriangle size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{entityValidation.issues.length} upozornění v datech</span>
                    </div>
                )}
                <button 
                    onClick={() => onFinalize(editor?.getHTML() || "", entities)}
                    disabled={isProcessing}
                    className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                >
                    {isProcessing ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <>Generovat Dokumentaci <ArrowRight size={18} strokeWidth={3} /></>}
                </button>
            </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            <div className="col-span-3 h-full min-h-0"><TranscriptEditor segments={segments} entities={entities} audioUrl={audioUrl} onEntityClick={onTranscriptEntityClick} transcript={transcript} /></div>
            <div className="col-span-6 flex flex-col bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden relative">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                      <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive('bold') ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-50'}`}><Bold size={16} /></button>
                      <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive('italic') ? 'bg-primary-50 text-primary-600' : 'text-slate-400 hover:bg-slate-50'}`}><Italic size={16} /></button>
                      <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg ${editor?.isActive('bulletList') ? 'bg-primary-50 text-primary-600' : 'text-slate-400'}`}><List size={16} /></button>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klinický Souhrn (AI Draft)</span>
                </div>
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
                    <EditorContent editor={editor} />
                </div>
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 italic flex items-center gap-2 justify-center">
                   <BrainCircuit size={12} /> Tento text je generován AI na základě nahrávky. Prosím o důkladnou kontrolu.
                </div>
            </div>
            <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-3 custom-scrollbar pb-10">
                <EntitySection title="Diagnózy" category="DIAGNOSIS" icon={Activity} colorClass="bg-blue-600" borderColorClass="border-blue-100 focus-within:border-blue-400" />
                <EntitySection title="Medikace" category="MEDICATION" icon={Pill} colorClass="bg-emerald-600" borderColorClass="border-emerald-100 focus-within:border-emerald-400" />
                <EntitySection title="Symptomy" category="SYMPTOM" icon={Stethoscope} colorClass="bg-orange-600" borderColorClass="border-orange-100 focus-within:border-orange-400" />
                <EntitySection title="Osobní údaje" category="PII" icon={User} colorClass="bg-slate-700" borderColorClass="border-slate-200 focus-within:border-slate-500" />
            </div>
        </div>
    </div>
  );
};
