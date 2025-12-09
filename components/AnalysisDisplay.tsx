import React, { useState, useRef, useEffect } from 'react';
import { MedicalEntity, StructuredReport, ChatMessage } from '../types';
import { FileText, Tags, Activity, Shield, Pill, Stethoscope, Copy, Check, Download, Bot, Send, User, Sparkles } from 'lucide-react';
import { jsPDF } from "jspdf";
import { askMedicalAssistant } from '../services/geminiService';

interface AnalysisDisplayProps {
  entities: MedicalEntity[];
  report: StructuredReport;
  rawTranscript?: string; // Needed for Chat context
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ entities, report, rawTranscript = "" }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'entities' | 'chat'>('report');
  const [copied, setCopied] = useState<string | null>(null);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !rawTranscript) return;

    const newUserMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, newUserMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const responseText = await askMedicalAssistant(rawTranscript, chatHistory, newUserMsg.text);
      setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (e) {
      console.error(e);
      setChatHistory(prev => [...prev, { role: 'model', text: "Omlouvám se, ale nastala chyba při komunikaci se serverem." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopied(section);
    setTimeout(() => setCopied(null), 2000);
  };

  const getEntityIcon = (category: string) => {
    switch (category) {
      case 'SYMPTOM': return <Activity size={14} className="text-orange-600" />;
      case 'MEDICATION': return <Pill size={14} className="text-blue-600" />;
      case 'DIAGNOSIS': return <Stethoscope size={14} className="text-purple-600" />;
      case 'PII': return <Shield size={14} className="text-red-600" />;
      default: return <Tags size={14} className="text-gray-500" />;
    }
  };

  const getEntityColor = (category: string) => {
    switch (category) {
      case 'SYMPTOM': return 'bg-orange-50 text-orange-900 border-orange-200';
      case 'MEDICATION': return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'DIAGNOSIS': return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'PII': return 'bg-red-50 text-red-900 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Lékařská Zpráva", 20, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    let y = 40;
    
    const addSection = (title: string, content: string) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(title, 20, y);
        y += 7;
        doc.setFont("helvetica", "normal");
        
        // Simple text wrapping
        const splitText = doc.splitTextToSize(content, 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 7) + 10;
    };

    addSection("Subjektivně (S)", report.subjective);
    addSection("Objektivně (O)", report.objective);
    addSection("Hodnocení (A)", report.assessment);
    addSection("Plán (P)", report.plan);
    addSection("Shrnutí", report.summary);

    doc.save("lekarska_zprava.pdf");
  };

  const ReportSection = ({ title, content, id }: { title: string, content: string, id: string }) => (
    <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-colors group relative shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
        <button 
          onClick={() => copyToClipboard(content, id)}
          className="text-slate-300 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Kopírovat sekci"
        >
          {copied === id ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">{content || "Žádná data."}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button 
          onClick={() => setActiveTab('report')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'report' ? 'border-primary-600 text-primary-700 bg-primary-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18} /> Zpráva
        </button>
        <button 
          onClick={() => setActiveTab('entities')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'entities' ? 'border-primary-600 text-primary-700 bg-primary-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Tags size={18} /> Entity
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'chat' ? 'border-primary-600 text-primary-700 bg-primary-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Bot size={18} /> Asistent
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'report' && (
          <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">SOAP Zpráva</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                    >
                        <Download size={14} /> PDF
                    </button>
                    <button 
                        onClick={() => copyToClipboard(`${report.subjective}\n${report.objective}\n${report.assessment}\n${report.plan}`, 'full')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        {copied === 'full' ? <Check size={14} /> : <Copy size={14} />}
                        Kopírovat vše
                    </button>
                </div>
            </div>
            
            <ReportSection title="Subjektivní (Anamnéza)" content={report.subjective} id="sub" />
            <ReportSection title="Objektivní (Nález)" content={report.objective} id="obj" />
            <ReportSection title="Hodnocení (Diagnóza)" content={report.assessment} id="ass" />
            <ReportSection title="Plán (Terapie)" content={report.plan} id="pla" />
            
            <div className="mt-8 pt-6 border-t border-slate-200">
               <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Shrnutí</h4>
               <p className="text-slate-700 italic bg-white p-4 rounded-lg border border-slate-200">{report.summary}</p>
            </div>
          </div>
        )}

        {activeTab === 'entities' && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-6">Detekovaná Klinická Data</h3>
            
            <div className="mb-8">
                <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                    <Shield size={16} /> Osobní Údaje (PII)
                </h4>
                <div className="flex flex-wrap gap-2">
                    {entities.filter(e => e.category === 'PII').length > 0 ? 
                        entities.filter(e => e.category === 'PII').map((e, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getEntityColor(e.category)}`}>
                                {getEntityIcon(e.category)} {e.text}
                            </span>
                        )) : <span className="text-slate-400 text-sm italic">Nenalezeny žádné citlivé údaje.</span>
                    }
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-3">Diagnózy</h4>
                    <ul className="space-y-2">
                        {entities.filter(e => e.category === 'DIAGNOSIS').map((e, i) => (
                             <li key={i} className="p-3 bg-purple-50 rounded border border-purple-100 flex items-start gap-3">
                                <Stethoscope className="text-purple-600 mt-1 shrink-0" size={16} />
                                <span className="text-slate-900">{e.text}</span>
                             </li>
                        ))}
                         {entities.filter(e => e.category === 'DIAGNOSIS').length === 0 && (
                            <li className="text-slate-400 text-sm italic">Žádné diagnózy.</li>
                        )}
                    </ul>
                </div>
                
                <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-3">Medikace</h4>
                    <ul className="space-y-2">
                        {entities.filter(e => e.category === 'MEDICATION').map((e, i) => (
                             <li key={i} className="p-3 bg-blue-50 rounded border border-blue-100 flex items-start gap-3">
                                <Pill className="text-blue-600 mt-1 shrink-0" size={16} />
                                <span className="text-slate-900">{e.text}</span>
                             </li>
                        ))}
                         {entities.filter(e => e.category === 'MEDICATION').length === 0 && (
                            <li className="text-slate-400 text-sm italic">Žádná medikace.</li>
                        )}
                    </ul>
                </div>
            </div>

            <div className="mt-8">
                <h4 className="text-sm font-semibold text-slate-500 mb-3">Symptomy a Potíže</h4>
                <div className="flex flex-wrap gap-2">
                    {entities.filter(e => e.category === 'SYMPTOM').map((e, i) => (
                        <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-2 ${getEntityColor(e.category)}`}>
                            {e.text}
                        </span>
                    ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4 mb-4 min-h-0 overflow-y-auto">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-slate-400 mt-8">
                            <Bot size={48} className="mx-auto mb-3 opacity-20" />
                            <p>Zeptejte se AI asistenta na detaily z vyšetření.</p>
                            <p className="text-xs mt-2">Např: "Jaké léky pacient bere?", "Zmínil pacient bolest hlavy?"</p>
                        </div>
                    )}
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isChatLoading && (
                         <div className="flex justify-start">
                             <div className="bg-white text-slate-500 rounded-2xl rounded-bl-none px-4 py-2 text-sm flex items-center gap-2 border border-slate-100 shadow-sm">
                                <Sparkles size={14} className="text-primary-500 animate-pulse" />
                                <span className="text-xs font-medium text-slate-500 animate-pulse">AI přemýšlí...</span>
                             </div>
                         </div>
                    )}
                    <div ref={chatEndRef}></div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-200 mt-auto">
                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Zeptejte se na obsah vyšetření..."
                        className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-900 text-sm shadow-sm"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};