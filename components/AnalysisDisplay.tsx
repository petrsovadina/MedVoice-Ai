
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
    // Fix: Added missing icons
    MapPin, Hash
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
  [ReportType.AMBULATORY_RECORD]: "Ambulantní záznam (Dekurs)",
  [ReportType.NURSE_RECORD]: "Ošetřovatelský záznam",
  [ReportType.PRESCRIPTION_DRAFT]: "Návrh eReceptu",
  [ReportType.REFERRAL_REQUEST]: "Žádanka k vyšetření",
  [ReportType.SICK_LEAVE_DRAFT]: "Návrh eNeschopenky",
  [ReportType.VISIT_CONFIRMATION]: "Potvrzení o návštěvě",
  [ReportType.CONSENT_RECORD]: "Záznam o poučení a souhlasu",
  [ReportType.SPA_PLAN]: "Lázeňský léčebný plán",
  [ReportType.EPICRISIS]: "Závěrečná zpráva (Epikríza)",
  [ReportType.TELEMEDICINE_NOTE]: "Záznam distanční konzultace"
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

    // Design Tokens pro PDF
    const brandColor = [92, 215, 185]; // MedVoice Green
    const textColor = [33, 33, 57];
    const mutedColor = [100, 100, 100];

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(providerConfig.name.toUpperCase(), 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(`${providerConfig.address} | IČO: ${providerConfig.ico} | Tel: ${providerConfig.contact}`, 20, 32);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 42, 190, 42);

    // Metadata Right Side
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DATUM VYSTAVENÍ", 190, 25, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString('cs-CZ'), 190, 30, { align: "right" });
    doc.text(`KÓD ODB.: ${providerConfig.specializationCode}`, 190, 35, { align: "right" });

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.text(title.toUpperCase(), 105, 65, { align: "center" });
    
    doc.setDrawColor(brandColor[0], brandColor[1], brandColor[2]);
    doc.setLineWidth(1);
    doc.line(80, 72, 130, 72);
    
    let y = 90;
    const addSection = (label: string, text: string | string[]) => {
        if (!text || (Array.isArray(text) && text.length === 0)) return;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
        doc.text(label.toUpperCase(), 20, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        const content = Array.isArray(text) ? text.join(', ') : text;
        const lines = doc.splitTextToSize(content, 170);
        doc.text(lines, 20, y);
        y += (lines.length * 6) + 12;
        
        if (y > 270) { doc.addPage(); y = 20; }
    };

    // Advanced Export Switch for all 10 types
    switch(report.reportType) {
        case ReportType.AMBULATORY_RECORD:
            const amb = d as AmbulatoryRecord;
            addSection("Subjektivně (S)", amb.subjective_notes);
            addSection("Objektivně (O)", amb.objective_notes);
            if (amb.vitals) {
                const vitalsText = Object.entries(amb.vitals).filter(([_, v]) => !!v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' | ');
                addSection("Vitální funkce", vitalsText);
            }
            addSection("Diagnostický závěr (A)", `${amb.icd_10_code} - ${amb.diagnosis_text}`);
            addSection("Terapeutický plán (P)", amb.plan_text);
            break;

        case ReportType.PRESCRIPTION_DRAFT:
            (d as PrescriptionDraft).items?.forEach((it, i) => {
                addSection(`eRecept - Položka ${i+1}`, `${it.medication_name} ${it.strength}\nDávkování: ${it.dosage_text} (${it.dosage_structured})\nBalení: ${it.quantity}x`);
            });
            break;

        case ReportType.REFERRAL_REQUEST:
            const ref = d as ReferralRequest;
            addSection("Cílová odbornost", ref.target_specialty);
            addSection("Klinický požadavek", ref.clinical_question);
            addSection("Základní diagnóza", ref.diagnosis_code);
            addSection("Souhrn dosavadního vývoje", ref.anamnesis_summary);
            break;

        case ReportType.SICK_LEAVE_DRAFT:
            const sic = d as SickLeaveDraft;
            addSection("Diagnóza pracovní neschopnosti", sic.diagnosis_code);
            addSection("Zahájení neschopnosti od", sic.start_date);
            addSection("Léčebný režim", sic.regime_notes);
            break;

        case ReportType.EPICRISIS:
            const epi = d as Epicrisis;
            addSection("Důvod hospitalizace", epi.admission_reason);
            addSection("Průběh hospitalizace", epi.hospitalization_summary);
            addSection("Stav při propuštění", epi.discharge_condition);
            addSection("Medikace a doporučení", epi.discharge_medication);
            addSection("Následná péče", epi.follow_up_recommendations);
            break;

        case ReportType.TELEMEDICINE_NOTE:
            const tel = d as TelemedicineNote;
            addSection("Identifikace volajícího", tel.caller_identity);
            addSection("Kanál komunikace", tel.communication_channel);
            addSection("Důvod kontaktu", tel.reason_for_contact);
            addSection("Poskytnuté poradenství", tel.provided_advice);
            break;

        case ReportType.CONSENT_RECORD:
            const con = d as ConsentRecord;
            addSection("Předmět poučení", con.procedure_name);
            addSection("Projednaná rizika", con.risks_discussed);
            addSection("Zvažované alternativy", con.alternatives_discussed);
            addSection("Výsledek poučení", con.consent_given ? "PACIENT UDĚLIL SOUHLAS" : "PACIENT SOUHLAS NEUDĚLIL");
            break;

        case ReportType.NURSE_RECORD:
            const nur = d as NurseRecord;
            addSection("Stav pacienta", nur.patient_state);
            addSection("Provedené intervence", nur.interventions);
            addSection("Poznámky sestry", nur.notes);
            break;

        case ReportType.SPA_PLAN:
            const spa = d as SpaPlan;
            addSection("Indikační skupina", spa.indication_group);
            addSection("Plánované procedury", spa.planned_procedures);
            addSection("Dietní režim", spa.diet_regime);
            break;

        case ReportType.VISIT_CONFIRMATION:
            const vis = d as VisitConfirmation;
            addSection("Datum návštěvy", vis.visit_date);
            addSection("Účel návštěvy", vis.visit_purpose);
            break;

        default:
            addSection("Záznam", JSON.stringify(d, null, 2));
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.line(20, 280, 190, 280);
    doc.text("MedVoice AI v2.5 Final MVP | Shoda s Vyhláškou č. 444/2024 Sb. | Záznam je součástí zdravotnické dokumentace.", 105, 285, { align: "center" });
    doc.text(`Identifikátor session: ${report.id}`, 20, 290);
    doc.text(`Razítko a podpis lékaře: ________________________________`, 190, 290, { align: "right" });

    doc.save(`${report.reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const Section = ({ title, children, icon: Icon, color, errorCount }: any) => (
    <div className={`p-8 bg-white border ${errorCount > 0 ? 'border-red-200 bg-red-50/10' : 'border-slate-200'} rounded-[32px] shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
        <div className={`absolute top-0 left-0 w-2 h-full ${errorCount > 0 ? 'bg-red-500' : `bg-${color}-500`}`} />
        <div className="flex justify-between items-center mb-6">
            <h3 className={`text-[11px] font-black uppercase ${errorCount > 0 ? 'text-red-600' : `text-${color}-600`} flex items-center gap-2 tracking-widest`}>
                <Icon size={14} /> {title}
            </h3>
            {errorCount > 0 && <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><AlertTriangle size={10}/> VYŽADUJE POZORNOST</span>}
        </div>
        {children}
    </div>
  );

  const renderAmbulatory = (d: AmbulatoryRecord) => (
    <div className="space-y-8">
        <Section title="Subjektivně (S)" icon={User} color="primary" errorCount={currentValidation.errors.filter(e => e.field === 'S').length}>
            <textarea className="w-full bg-transparent outline-none text-base leading-relaxed text-slate-800 min-h-[100px] font-medium" value={d.subjective_notes} onChange={e => update(['subjective_notes'], e.target.value)} placeholder="Zadejte subjektivní potíže..." />
        </Section>
        <Section title="Objektivně (O)" icon={Activity} color="emerald" errorCount={currentValidation.errors.filter(e => e.field === 'O').length}>
            <textarea className="w-full bg-transparent outline-none text-base leading-relaxed text-slate-800 min-h-[100px] font-medium" value={d.objective_notes} onChange={e => update(['objective_notes'], e.target.value)} placeholder="Zadejte objektivní nález..." />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {['bp', 'pulse', 'temp', 'spo2'].map(v => (
                    <div key={v} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 focus-within:border-primary-300 transition-colors">
                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">{v === 'bp' ? 'TK' : v.toUpperCase()}</label>
                        <input className="w-full bg-transparent font-black text-sm text-slate-700 outline-none" value={d.vitals?.[v as keyof typeof d.vitals] || ''} onChange={e => update(['vitals', v], e.target.value)} />
                    </div>
                ))}
            </div>
        </Section>
        <Section title="Diagnóza a Plán (A/P)" icon={Zap} color="blue" errorCount={currentValidation.errors.filter(e => ['Dg', 'P'].includes(e.field)).length}>
            <div className="flex gap-4 mb-6">
                <input className="flex-1 font-black text-lg border-b-2 border-blue-100 bg-transparent outline-none text-slate-800 focus:border-blue-400" value={d.diagnosis_text} onChange={e => update(['diagnosis_text'], e.target.value)} placeholder="Textová diagnóza..." />
                <input className="w-24 text-center font-black bg-white rounded-xl border border-blue-200 p-2 text-blue-700 shadow-inner" value={d.icd_10_code} onChange={e => update(['icd_10_code'], e.target.value)} placeholder="MKN-10" />
            </div>
            <textarea className="w-full bg-blue-50/30 p-5 rounded-2xl outline-none text-sm italic text-slate-600 font-medium" value={d.plan_text} onChange={e => update(['plan_text'], e.target.value)} placeholder="Další postup a terapie..." />
        </Section>
    </div>
  );

  // Fix: Implemented missing renderPrescription function
  const renderPrescription = (d: PrescriptionDraft) => (
    <div className="space-y-6">
        {d.items?.map((item, idx) => (
            <Section key={idx} title={`Položka eReceptu ${idx + 1}`} icon={Pill} color="emerald">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Název léku a síla</label>
                        <input className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-black text-emerald-700" value={item.medication_name} onChange={e => {
                            const newItems = [...d.items];
                            newItems[idx] = { ...item, medication_name: e.target.value };
                            update(['items'], newItems);
                        }} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Množství / Balení</label>
                        <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold" value={item.quantity} onChange={e => {
                            const newItems = [...d.items];
                            newItems[idx] = { ...item, quantity: parseInt(e.target.value) || 0 };
                            update(['items'], newItems);
                        }} />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Dávkování (Slovně)</label>
                    <textarea className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium" value={item.dosage_text} onChange={e => {
                        const newItems = [...d.items];
                        newItems[idx] = { ...item, dosage_text: e.target.value };
                        update(['items'], newItems);
                    }} />
                </div>
            </Section>
        ))}
        {(!d.items || d.items.length === 0) && (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 italic font-medium">
                Žádné položky k předepsání nebyly detekovány.
            </div>
        )}
    </div>
  );

  const renderVisitConfirmation = (d: VisitConfirmation) => (
    <Section title="Potvrzení o návštěvě" icon={Calendar} color="slate">
        <div className="flex gap-6 items-end">
            <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Datum vyšetření</label>
                <input type="date" className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold" value={d.visit_date} onChange={e => update(['visit_date'], e.target.value)} />
            </div>
            <div className="flex-[2]">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Účel návštěvy</label>
                <input className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold" value={d.visit_purpose} onChange={e => update(['visit_purpose'], e.target.value)} />
            </div>
        </div>
        <p className="mt-6 text-[11px] text-slate-400 italic">Toto potvrzení slouží pro potřeby omluvení zmeškaného času u zaměstnavatele nebo ve škole.</p>
    </Section>
  );

  const renderSpaPlan = (d: SpaPlan) => (
    <Section title="Lázeňský léčebný návrh" icon={Map} color="primary">
        <div className="space-y-6">
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Indikační skupina</label>
                <input className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-black text-primary-700" value={d.indication_group} onChange={e => update(['indication_group'], e.target.value)} />
            </div>
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Plánované procedury</label>
                <div className="flex flex-wrap gap-2">
                    {d.planned_procedures?.map((p, i) => (
                        <span key={i} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm">{p}</span>
                    ))}
                    <button onClick={() => update(['planned_procedures'], [...(d.planned_procedures || []), "Nová procedura"])} className="px-3 py-1 text-primary-600 border border-primary-200 border-dashed rounded-xl hover:bg-primary-50"><Plus size={12}/></button>
                </div>
            </div>
            <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Dietní a režimová opatření</label>
                <textarea className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium" value={d.diet_regime} onChange={e => update(['diet_regime'], e.target.value)} />
            </div>
        </div>
    </Section>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[48px] border border-slate-200 shadow-2xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 p-2 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => setActiveTab('report')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl flex items-center justify-center gap-3 transition-all ${activeTab === 'report' ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30' : 'text-slate-400 hover:text-slate-600'}`}>
          <FileText size={18}/> Klinický dokument
        </button>
        <button onClick={() => setActiveTab('entities')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] rounded-3xl flex items-center justify-center gap-3 transition-all ${activeTab === 'entities' ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/30' : 'text-slate-400 hover:text-slate-600'}`}>
          <Tags size={18}/> Strukturovaná data
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[radial-gradient(circle_at_top_right,rgba(92,215,185,0.08),transparent)] custom-scrollbar">
        <div className="max-w-[900px] mx-auto pb-20">
          {activeTab === 'report' && (
            <div className="space-y-10 animate-in fade-in duration-700">
               {/* Actions & Validation Status */}
               <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                   <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full border border-slate-200 shadow-md w-full md:w-auto">
                        <div className={`p-3 rounded-full ${currentValidation.isValid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {currentValidation.isValid ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        </div>
                        <div className="flex flex-col">
                            <select value={report.id} onChange={e => setActiveId(e.target.value)} className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer">
                                {reports.map(r => <option key={r.id} value={r.id}>{REPORT_LABELS[r.reportType]}</option>)}
                            </select>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {currentValidation.isValid ? 'Dokument je validní' : `${currentValidation.errors.length} upozornění`}
                            </span>
                        </div>
                   </div>
                   
                   <div className="flex gap-4">
                       <button onClick={handleDownloadPDF} className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black group shadow-xl transition-all active:scale-95">
                           <Download size={18} /> Exportovat PDF
                       </button>
                   </div>
               </div>

               {/* Validation Errors Overlay */}
               {currentValidation.errors.length > 0 && (
                   <div className="bg-red-50 border border-red-100 rounded-[32px] p-6 mb-8 flex flex-col gap-2">
                       <h4 className="text-[10px] font-black text-red-600 uppercase flex items-center gap-2 mb-2"><AlertCircle size={14}/> Chybějící nebo neúplné údaje</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                           {currentValidation.errors.map((e, i) => (
                               <div key={i} className="flex items-start gap-2 text-xs font-bold text-red-700">
                                   <span className="bg-red-200 px-1.5 py-0.5 rounded text-[8px] mt-0.5 shrink-0">{e.field}</span>
                                   <span>{e.message}</span>
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               {/* Paper Renderer */}
               <div className="report-paper p-12 md:p-24 min-h-[297mm] shadow-2xl bg-white border border-slate-100 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-1000">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none">
                     <Stethoscope size={500} />
                  </div>
                  
                  {/* Header */}
                  <div className="border-b-8 border-slate-900 pb-10 mb-16 flex justify-between items-end">
                      <div>
                        <h2 className="font-black text-slate-900 text-3xl uppercase tracking-tighter leading-none mb-3">{providerConfig.name}</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><MapPin size={10}/> {providerConfig.address}</span>
                            <span className="flex items-center gap-1"><Hash size={10}/> IČO: {providerConfig.ico}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black uppercase text-slate-300 tracking-[0.2em] mb-2">Datum vystavení</p>
                        <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('cs-CZ')}</p>
                      </div>
                  </div>
                  
                  <h1 className="text-4xl font-black text-center uppercase tracking-[0.4em] mb-20 text-slate-800 underline decoration-primary-400 decoration-[12px] underline-offset-[24px]">
                      {REPORT_LABELS[report.reportType]}
                  </h1>

                  {/* Body */}
                  <div className="relative z-10 space-y-8">
                    {report.reportType === ReportType.AMBULATORY_RECORD && renderAmbulatory(report.data)}
                    {report.reportType === ReportType.PRESCRIPTION_DRAFT && renderPrescription(report.data)}
                    {report.reportType === ReportType.REFERRAL_REQUEST && (
                        <div className="space-y-6">
                            <div className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-sm">
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Cílové pracoviště / Odbornost</label>
                                <input className="w-full text-2xl font-black bg-transparent border-b-2 border-slate-100 outline-none pb-2" value={(report.data as ReferralRequest).target_specialty} onChange={e => update(['target_specialty'], e.target.value)} />
                            </div>
                            <Section title="Klinický požadavek" icon={Info} color="primary">
                                <textarea className="w-full bg-transparent outline-none text-lg font-bold italic" value={(report.data as ReferralRequest).clinical_question} onChange={e => update(['clinical_question'], e.target.value)} />
                            </Section>
                            <Section title="Souhrn a Diagnóza" icon={ClipboardList} color="slate">
                                <div className="flex gap-4 mb-4">
                                    <span className="bg-slate-100 px-3 py-1 rounded text-xs font-black uppercase">{(report.data as ReferralRequest).diagnosis_code}</span>
                                </div>
                                <textarea className="w-full bg-transparent outline-none text-sm leading-relaxed" value={(report.data as ReferralRequest).anamnesis_summary} onChange={e => update(['anamnesis_summary'], e.target.value)} />
                            </Section>
                        </div>
                    )}
                    {report.reportType === ReportType.SICK_LEAVE_DRAFT && (
                        <div className="bg-red-50 p-10 rounded-[48px] border border-red-100">
                             <h3 className="text-xl font-black text-red-700 uppercase tracking-tighter mb-8 flex items-center gap-3"><Briefcase /> Podklady pro eNeschopenku</h3>
                             <div className="grid grid-cols-2 gap-8">
                                <div><label className="text-[10px] font-black text-red-300 uppercase block mb-2">Diagnóza (MKN-10)</label><input className="w-full bg-white p-4 rounded-2xl border border-red-200 font-black text-lg text-red-900 shadow-sm" value={(report.data as SickLeaveDraft).diagnosis_code} onChange={e => update(['diagnosis_code'], e.target.value)} /></div>
                                <div><label className="text-[10px] font-black text-red-300 uppercase block mb-2">Datum zahájení</label><input type="date" className="w-full bg-white p-4 rounded-2xl border border-red-200 font-bold text-lg shadow-sm" value={(report.data as SickLeaveDraft).start_date} onChange={e => update(['start_date'], e.target.value)} /></div>
                             </div>
                        </div>
                    )}
                    {report.reportType === ReportType.EPICRISIS && (
                        <div className="space-y-6">
                            <Section title="Důvod a průběh" icon={History} color="slate">
                                <textarea className="w-full bg-transparent outline-none text-base italic mb-4" value={(report.data as Epicrisis).admission_reason} onChange={e => update(['admission_reason'], e.target.value)} />
                                <textarea className="w-full bg-slate-50 p-6 rounded-2xl border border-slate-100 outline-none text-sm leading-relaxed" value={(report.data as Epicrisis).hospitalization_summary} onChange={e => update(['hospitalization_summary'], e.target.value)} />
                            </Section>
                            <div className="grid grid-cols-2 gap-6">
                                <Section title="Stav při propuštění" icon={HeartPulse} color="emerald"><textarea className="w-full bg-transparent outline-none text-sm" value={(report.data as Epicrisis).discharge_condition} onChange={e => update(['discharge_condition'], e.target.value)} /></Section>
                                <Section title="Doporučená medikace" icon={Pill} color="emerald"><textarea className="w-full bg-transparent outline-none text-sm" value={(report.data as Epicrisis).discharge_medication} onChange={e => update(['discharge_medication'], e.target.value)} /></Section>
                            </div>
                        </div>
                    )}
                    {report.reportType === ReportType.TELEMEDICINE_NOTE && (
                        <div className="space-y-6">
                            <div className="p-8 bg-primary-600 rounded-[40px] text-white flex items-center justify-between shadow-xl">
                                <div className="flex items-center gap-6">
                                    <div className="bg-white/20 p-4 rounded-2xl"><PhoneIncoming size={32} /></div>
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Distanční kontakt - Ověřeno</h3>
                                        <input className="text-2xl font-black bg-transparent outline-none border-none" value={(report.data as TelemedicineNote).caller_identity} onChange={e => update(['caller_identity'], e.target.value)} />
                                    </div>
                                </div>
                                <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">{(report.data as TelemedicineNote).communication_channel || 'TELEFON'}</div>
                            </div>
                            <Section title="Záznam konzultace" icon={MessageSquare} color="primary">
                                <textarea className="w-full bg-transparent outline-none text-lg font-medium leading-relaxed min-h-[150px]" value={(report.data as TelemedicineNote).provided_advice} onChange={e => update(['provided_advice'], e.target.value)} />
                            </Section>
                        </div>
                    )}
                    {report.reportType === ReportType.CONSENT_RECORD && (
                        <div className="p-10 bg-slate-900 rounded-[48px] text-white border border-slate-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-10"><ShieldCheck size={140} /></div>
                            <h2 className="text-2xl font-black uppercase tracking-tight mb-10 flex items-center gap-4 text-emerald-400"><ShieldCheck /> Záznam o poučení a souhlasu</h2>
                            <div className="space-y-8 relative z-10">
                                <div><label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Předmět zákroku / vyšetření</label><input className="w-full bg-white/5 p-4 rounded-2xl border border-white/10 text-xl font-bold outline-none focus:border-emerald-500" value={(report.data as ConsentRecord).procedure_name} onChange={e => update(['procedure_name'], e.target.value)} /></div>
                                <div className="flex items-center gap-4 p-5 bg-emerald-500/20 rounded-2xl border border-emerald-500/30"><input type="checkbox" checked={(report.data as ConsentRecord).consent_given} onChange={e => update(['consent_given'], e.target.checked)} className="w-6 h-6 accent-emerald-500" /><span className="font-black uppercase text-xs text-emerald-400">Pacient udělil informovaný souhlas</span></div>
                            </div>
                        </div>
                    )}
                    {report.reportType === ReportType.SPA_PLAN && renderSpaPlan(report.data as SpaPlan)}
                    {report.reportType === ReportType.VISIT_CONFIRMATION && renderVisitConfirmation(report.data as VisitConfirmation)}
                    {report.reportType === ReportType.NURSE_RECORD && (
                        <div className="space-y-6">
                            <Section title="Záznam sestry" icon={ClipboardList} color="slate">
                                <textarea className="w-full bg-transparent outline-none text-base leading-relaxed font-bold" value={(report.data as NurseRecord).patient_state} onChange={e => update(['patient_state'], e.target.value)} />
                            </Section>
                            <Section title="Provedené úkony" icon={FileCheck} color="slate">
                                <div className="flex flex-wrap gap-2">{(report.data as NurseRecord).interventions?.map((inv, i) => <span key={i} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">{inv}</span>)}</div>
                            </Section>
                        </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-40 pt-12 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                      <div className="flex flex-col gap-2">
                        <span>Systém MedVoice AI v2.5 Final MVP • Shoda s Vyhláškou č. 444/2024 Sb.</span>
                        <span>Digitální záznam • Session: {report.id}</span>
                      </div>
                      <div className="text-right w-64 h-24 border-b-2 border-slate-200 border-dashed relative">
                        <span className="absolute bottom-2 right-0 opacity-20 italic">Podpis a razítko lékaře</span>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'entities' && (
              <div className="bg-white rounded-[48px] p-12 border border-slate-200 shadow-xl animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="bg-primary-100 p-5 rounded-3xl text-primary-600 shadow-inner"><ClipboardCheck size={32} /></div>
                    <div><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Klinická extrakce</h2><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Strukturovaná data k validaci</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {['DIAGNOSIS', 'MEDICATION', 'SYMPTOM', 'PII'].map(cat => (
                      <div key={cat} className="p-8 rounded-[40px] border shadow-sm bg-slate-50 transition-all hover:bg-white hover:shadow-lg">
                        <h4 className="text-[11px] font-black uppercase mb-6 tracking-[0.2em] opacity-60 flex items-center gap-2">
                            {cat === 'DIAGNOSIS' ? <Activity size={14}/> : (cat === 'MEDICATION' ? <Pill size={14}/> : <Tags size={14}/>)}
                            {cat}
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                            {entities.filter(e => e.category === cat).map((it, i) => (
                                <span key={i} className="px-4 py-2 bg-white text-sm font-bold rounded-2xl border border-slate-200 shadow-sm">{it.text}</span>
                            ))}
                            {entities.filter(e => e.category === cat).length === 0 && <span className="text-xs italic text-slate-400">Nebylo detekováno</span>}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
