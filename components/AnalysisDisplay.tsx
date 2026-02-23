
import React, { useState, useEffect } from 'react';
import { 
    MedicalEntity, StructuredReport, ReportType, 
    AmbulatoryRecord, PrescriptionDraft, ReferralRequest,
    SickLeaveDraft, Epicrisis, TelemedicineNote, ConsentRecord,
    VisitConfirmation, NurseRecord, SpaPlan,
    ValidationResult, ProviderConfig, ValidationSeverity
} from '../types';
import { 
    FileText, Tags, Activity, Zap, Activity as VitalIcon, User, 
    ClipboardCheck, AlertCircle, Stethoscope, Download, Info, 
    PhoneIncoming, FileCheck, HeartPulse, History, MessageSquare,
    Pill, Calendar, ShieldCheck, Thermometer, Briefcase, Map,
    CheckCircle2, AlertTriangle, Plus, ClipboardList,
    MapPin, Hash, ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface AnalysisDisplayProps {
  entities: MedicalEntity[];
  reports: StructuredReport[];
  validationResults: Record<string, ValidationResult>;
  onReportChange: (id: string, report: StructuredReport) => void;
  onEntitiesChange: (entities: MedicalEntity[]) => void;
  onRegenerateReports: () => Promise<void>;
  isRegenerating: boolean;
  providerConfig: ProviderConfig;
}

const REPORT_LABELS: Record<string, string> = {
  [ReportType.AMBULATORY_RECORD]: "Ambulantní záznam",
  [ReportType.NURSE_RECORD]: "Ošetřovatelský záznam",
  [ReportType.PRESCRIPTION_DRAFT]: "Předpis léčiva",
  [ReportType.REFERRAL_REQUEST]: "Žádanka k vyšetření",
  [ReportType.SICK_LEAVE_DRAFT]: "eNeschopenka",
  [ReportType.VISIT_CONFIRMATION]: "Potvrzení návštěvy",
  [ReportType.CONSENT_RECORD]: "Informovaný souhlas",
  [ReportType.SPA_PLAN]: "Lázeňský plán",
  [ReportType.EPICRISIS]: "Propouštěcí zpráva",
  [ReportType.TELEMEDICINE_NOTE]: "Distanční konzultace"
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
    reports, onReportChange, providerConfig, entities, validationResults
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'entities'>('report');
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && reports.length > 0) setActiveId(reports[0].id);
  }, [reports, activeId]);

  const report = reports.find(r => r.id === activeId) || reports[0];
  if (!report) return null;

  const currentValidation = validationResults[report.id] || { isValid: true, errors: [] };

  const update = (path: string[], val: any) => {
    const newData = JSON.parse(JSON.stringify(report.data || {}));
    let cur = newData;
    for (let i = 0; i < path.length - 1; i++) {
        if (!cur[path[i]]) cur[path[i]] = {};
        cur = cur[path[i]];
    }
    cur[path[path.length - 1]] = val;
    onReportChange(report.id, { ...report, data: newData });
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const title = REPORT_LABELS[report.reportType];
    const d = report.data;

    const brandColor = [0, 84, 166];
    const textColor = [20, 20, 25];
    const mutedColor = [120, 120, 120];

    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 15, 15, 285);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(providerConfig.name.toUpperCase(), 20, 25);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`${providerConfig.address} | IČO: ${providerConfig.ico}`, 20, 30);
    
    doc.setFillColor(245, 245, 250);
    doc.rect(140, 18, 55, 18, "F");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(7);
    doc.text("DATUM", 145, 23);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(new Date().toLocaleDateString('cs-CZ'), 145, 28);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text(title.toUpperCase(), 20, 50);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 55, 195, 55);

    let y = 65;
    const addSection = (label: string, text: any) => {
        if (!text) return;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(label.toUpperCase(), 20, y);
        y += 4;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        const content = typeof text === 'object' ? JSON.stringify(text) : String(text);
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, 20, y);
        y += (lines.length * 5) + 6;
        if (y > 270) { doc.addPage(); y = 20; }
    };

    if (report.reportType === ReportType.AMBULATORY_RECORD) {
        const amb = d as AmbulatoryRecord;
        addSection("S - Anamnéza", amb.subjective_notes);
        addSection("O - Objektivní nález", amb.objective_notes);
        if (amb.vitals) {
            const v = amb.vitals;
            addSection("Vitální funkce", `TK: ${v.bp || '-'} | P: ${v.pulse || '-'} | TT: ${v.temp || '-'} | SpO2: ${v.spo2 || '-'}% | Hmotnost: ${v.weight || '-'}kg`);
        }
        addSection("Dg - Závěr", `${amb.icd_10_code} - ${amb.diagnosis_text}`);
        addSection("P - Plán", amb.plan_text);
    } else {
        addSection("Podrobnosti", d);
    }

    doc.setFontSize(6);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`MedVoice AI Clinical Output • Session: ${report.id}`, 105, 285, { align: "center" });
    doc.save(`${report.reportType}.pdf`);
  };

  const CompactSection = ({ title, children, icon: Icon, errorCount, className = "" }: any) => (
    <div className={`p-4 bg-white border ${errorCount > 0 ? 'border-red-200 bg-red-50/10' : 'border-slate-100'} rounded-2xl shadow-sm relative transition-all hover:border-slate-200 ${className}`}>
        <div className="flex justify-between items-center mb-3">
            <h3 className={`text-[8px] font-black uppercase flex items-center gap-1.5 tracking-widest ${errorCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                <Icon size={10} /> {title}
            </h3>
        </div>
        {children}
    </div>
  );

  const getVitalValue = (key: string): string => {
    const amb = report.data as AmbulatoryRecord;
    if (!amb.vitals) return '';
    const val = (amb.vitals as any)[key];
    return typeof val === 'string' ? val : '';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
      <div className="flex border-b border-slate-200 p-1.5 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => setActiveTab('report')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'report' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
          <FileText size={14}/> Záznam
        </button>
        <button onClick={() => setActiveTab('entities')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'entities' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
          <Tags size={14}/> Entity
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'report' && (
            <div className="space-y-4 animate-in fade-in duration-300">
               <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
                   <select value={report.id} onChange={e => setActiveId(e.target.value)} className="bg-white border border-slate-200 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-700 shadow-sm w-full sm:w-auto">
                        {reports.map(r => <option key={r.id} value={r.id}>{REPORT_LABELS[r.reportType]}</option>)}
                   </select>
                   <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-md w-full sm:w-auto justify-center">
                       <Download size={14} /> PDF Tisk
                   </button>
               </div>

               <div className="report-paper bg-white p-8 md:p-12 rounded shadow-2xl border border-slate-200 min-h-[297mm] text-slate-800 relative flex flex-col">
                  {/* Subtle Professional Grid */}
                  <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>
                  
                  <div className="grid grid-cols-2 border-b-2 border-slate-900 pb-6 mb-8 relative z-10">
                      <div>
                        <h2 className="font-black text-slate-900 text-lg uppercase tracking-tight">{providerConfig.name}</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{providerConfig.address}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-black text-slate-300 uppercase block">Dokument ID: {report.id.toUpperCase()}</span>
                        <span className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('cs-CZ')}</span>
                      </div>
                  </div>

                  <div className="mb-8 relative z-10">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{REPORT_LABELS[report.reportType]}</h1>
                  </div>

                  <div className="flex-1 space-y-6 relative z-10">
                    {report.reportType === ReportType.AMBULATORY_RECORD && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CompactSection title="Anamnéza a Subjektivně" icon={User} errorCount={currentValidation.errors.filter(e => e.field === 'S').length}>
                                    <textarea className="w-full bg-transparent outline-none text-xs leading-relaxed min-h-[60px] resize-none" value={(report.data as AmbulatoryRecord).subjective_notes} onChange={e => update(['subjective_notes'], e.target.value)} />
                                </CompactSection>
                                <CompactSection title="Objektivní nález" icon={Activity} errorCount={currentValidation.errors.filter(e => e.field === 'O').length}>
                                    <textarea className="w-full bg-transparent outline-none text-xs leading-relaxed min-h-[60px] resize-none" value={(report.data as AmbulatoryRecord).objective_notes} onChange={e => update(['objective_notes'], e.target.value)} />
                                </CompactSection>
                            </div>
                            
                            <div className="grid grid-cols-5 gap-2">
                                {['bp', 'pulse', 'temp', 'spo2', 'weight'].map(v => (
                                    <div key={v} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">{v === 'bp' ? 'TK' : v.toUpperCase()}</label>
                                        <input 
                                          className="w-full bg-transparent font-black text-[10px] text-slate-700 outline-none" 
                                          value={getVitalValue(v)} 
                                          onChange={e => update(['vitals', v], e.target.value)} 
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CompactSection title="Diagnóza" icon={Zap} errorCount={currentValidation.errors.filter(e => e.field === 'Dg').length}>
                                    <input className="w-full font-black text-[10px] bg-slate-50 p-1.5 rounded text-primary-700 mb-2 border-none outline-none" value={(report.data as AmbulatoryRecord).icd_10_code} onChange={e => update(['icd_10_code'], e.target.value)} placeholder="MKN-10" />
                                    <textarea className="w-full text-[10px] font-bold bg-transparent outline-none resize-none" value={(report.data as AmbulatoryRecord).diagnosis_text} onChange={e => update(['diagnosis_text'], e.target.value)} />
                                </CompactSection>
                                <CompactSection title="Plán a terapie" icon={ClipboardList} className="md:col-span-2" errorCount={currentValidation.errors.filter(e => e.field === 'P').length}>
                                    <textarea className="w-full bg-transparent outline-none text-xs leading-relaxed min-h-[80px] resize-none" value={(report.data as AmbulatoryRecord).plan_text} onChange={e => update(['plan_text'], e.target.value)} />
                                </CompactSection>
                            </div>
                        </>
                    )}
                  </div>

                  <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-end relative z-10">
                      <div className="text-[7px] font-bold text-slate-300 uppercase tracking-widest max-w-[50%]">
                        Tento výstup byl generován asistivním systémem MedVoice AI. Dokumentace byla validována ošetřujícím lékařem.
                      </div>
                      <div className="text-right">
                        <div className="w-40 h-12 border-b border-dashed border-slate-200 mb-1"></div>
                        <span className="text-[7px] font-black text-slate-400 uppercase">Podpis lékaře</span>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'entities' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-in zoom-in-95 duration-200">
                {['DIAGNOSIS', 'MEDICATION', 'SYMPTOM', 'PII'].map(cat => (
                  <div key={cat} className="p-4 bg-white rounded-2xl border border-slate-200">
                    <h4 className="text-[9px] font-black uppercase mb-3 text-slate-400">{cat}</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {entities.filter(e => e.category === cat).map((it, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-50 text-[10px] font-bold rounded-lg border border-slate-100 text-slate-600">{it.text}</span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
