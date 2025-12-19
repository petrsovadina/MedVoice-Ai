import React, { useState } from 'react';
import { 
    MedicalEntity, 
    StructuredReport, 
    ReportType, 
    AmbulantniZaznamData,
    OsetrovatelskyZaznamData,
    KonziliarniZpravaData,
    PotvrzeniVysetreniData,
    DoporuceniLecbyData,
    ValidationResult,
    ValidationSeverity,
    ProviderConfig
} from '../types';
import { 
    FileText, Tags, Printer, RefreshCw, Stethoscope, Pill, Copy, Check, 
    AlertCircle, AlertTriangle, Edit3, Trash2, Plus, Zap, Activity, User
} from 'lucide-react';
import { jsPDF } from "jspdf";

interface AnalysisDisplayProps {
  entities: MedicalEntity[];
  report: StructuredReport;
  validationResult: ValidationResult;
  onReportChange: (report: StructuredReport) => void;
  onEntitiesChange: (entities: MedicalEntity[]) => void;
  onRegenerateReport: (type: ReportType) => Promise<void>;
  isRegenerating: boolean;
  providerConfig: ProviderConfig;
}

const REPORT_LABELS: Record<ReportType, string> = {
  [ReportType.AMBULANTNI_ZAZNAM]: "Ambulantní záznam (Dekurs)",
  [ReportType.OSETR_ZAZNAM]: "Záznam ošetřovatelské péče",
  [ReportType.KONZILIARNI_ZPRAVA]: "Konziliární zpráva / Žádanka",
  [ReportType.POTVRZENI_VYSETRENI]: "Potvrzení o vyšetření",
  [ReportType.DOPORUCENI_LECBY]: "Doporučení k léčbě (RHB)"
};

// --- Helper Components ---

const EditableArea = ({ label, value, onChange, minRows = 2, className = "", inputClassName }: { label: string, value: string | undefined, onChange: (val: string) => void, minRows?: number, className?: string, inputClassName?: string }) => (
    <div className={`mb-4 group relative ${className}`}>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</label>
        <textarea 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-3 text-sm text-slate-900 border border-slate-100 hover:border-slate-200 focus:border-primary-300 focus:ring-4 focus:ring-primary-50 rounded-xl transition-all resize-none overflow-hidden ${inputClassName || 'bg-slate-50/50 hover:bg-white'}`}
            rows={minRows}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
            }}
        />
        <Edit3 size={12} className="absolute top-8 right-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
);

const EditableInput = ({ label, value, onChange, className = "", inputClassName }: { label: string, value: string | undefined, onChange: (val: string) => void, className?: string, inputClassName?: string }) => (
    <div className={`mb-2 group relative ${className}`}>
        {label && <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</label>}
        <input 
            type="text"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-2 text-sm text-slate-900 border border-slate-100 hover:border-slate-200 focus:border-primary-300 focus:ring-4 focus:ring-primary-50 rounded-lg transition-all font-medium ${inputClassName || 'bg-slate-50/50 hover:bg-white'}`}
        />
    </div>
);

const ValidationStatus = ({ result }: { result: ValidationResult }) => {
    const errorCount = result.errors.filter(e => e.severity === ValidationSeverity.ERROR).length;
    const warningCount = result.errors.filter(e => e.severity === ValidationSeverity.WARNING).length;

    if (errorCount === 0 && warningCount === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck size={14} /> Legislativně OK
            </div>
        );
    }

    return (
        <div className="group relative">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider cursor-help ${errorCount > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {errorCount > 0 ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                {errorCount > 0 ? `${errorCount} chyb` : `${warningCount} varování`}
            </div>
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Legislativní nálezy</h4>
                <ul className="space-y-3">
                    {result.errors.map((e, i) => (
                        <li key={i} className={`text-xs flex gap-2 leading-relaxed ${e.severity === ValidationSeverity.ERROR ? 'text-red-600' : 'text-amber-600'}`}>
                            {e.severity === ValidationSeverity.ERROR ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                            <span><span className="font-bold underline decoration-dotted">{e.field}</span>: {e.message}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
);

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
    entities, report, validationResult, onReportChange, onEntitiesChange, onRegenerateReport, isRegenerating, providerConfig
}) => {
  const [activeTab, setActiveTab] = useState<'report' | 'entities'>('report');
  const [copied, setCopied] = useState(false);
  
  const handleTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await onRegenerateReport(e.target.value as ReportType);
  };

  const updateData = (path: string[], value: any) => {
      const newData = JSON.parse(JSON.stringify(report.data));
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {}; 
          current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      onReportChange({ ...report, data: newData });
  };

  const updateEntity = (index: number, newText: string) => {
      const newEntities = [...entities];
      newEntities[index] = { ...newEntities[index], text: newText };
      onEntitiesChange(newEntities);
  };

  const removeEntity = (index: number) => {
      onEntitiesChange(entities.filter((_, i) => i !== index));
  };

  const addEntity = (category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'PII' | 'OTHER') => {
      onEntitiesChange([...entities, { category, text: "" }]);
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const data = report.data;
    const type = report.reportType;
    
    const MARGIN_X = 20;
    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;
    const MARGIN_BOTTOM = 25;
    const MARGIN_TOP = 20;
    const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN_X);
    const SAFE_WIDTH = CONTENT_WIDTH - 10; 
    const LINE_HEIGHT = 5.5; 
    
    let yPos = MARGIN_TOP;

    const checkPageBreak = (heightNeeded: number) => {
        if (yPos + heightNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
            doc.addPage();
            yPos = MARGIN_TOP;
            return true;
        }
        return false;
    };

    const sanitize = (text: string | undefined | null): string => {
        if (!text) return "";
        return text
            .replace(/[\u00A0\u1680\u180e\u2000-\u200b\u202f\u205f\u3000]/g, " ") 
            .replace(/\t/g, "    ") 
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/ +/g, " ")
            .trim();
    };

    const printText = (
        rawText: string | undefined, 
        size: number = 10, 
        bold: boolean = false, 
        indent: number = 0, 
        color: number = 0
    ) => {
        const text = sanitize(rawText);
        if (!text) return;
        
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(color);
        
        const availableWidth = SAFE_WIDTH - indent;
        const paragraphs = text.split('\n');

        paragraphs.forEach((paragraph, pIdx) => {
            const lines: string[] = doc.splitTextToSize(paragraph, availableWidth);
            lines.forEach((line) => {
                checkPageBreak(LINE_HEIGHT);
                doc.setFontSize(size);
                doc.text(line, MARGIN_X + indent, yPos);
                yPos += LINE_HEIGHT;
            });
            if (pIdx < paragraphs.length - 1) yPos += (LINE_HEIGHT * 0.4);
        });
        yPos += 1;
    };

    const printHeaderBar = (label: string) => {
        checkPageBreak(12);
        yPos += 2;
        doc.setFillColor(248, 248, 248);
        doc.rect(MARGIN_X, yPos, CONTENT_WIDTH, 7, 'F');
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 33, 57);
        doc.text(label.toUpperCase(), MARGIN_X + 2, yPos + 5);
        yPos += 10;
        doc.setTextColor(0);
    };

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(sanitize(providerConfig.name || "MedVoice AI Client"), MARGIN_X, yPos);
    
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(120);
    doc.text(`Odbornost: ${sanitize(providerConfig.specializationCode || "Lékař")}`, MARGIN_X + CONTENT_WIDTH, yPos, { align: 'right' });
    yPos += 5;
    
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text(sanitize(providerConfig.address), MARGIN_X, yPos);
    yPos += 4;
    doc.text(`IČO: ${sanitize(providerConfig.ico)} | ICP: ${sanitize(providerConfig.icp)}`, MARGIN_X, yPos);
    yPos += 12;

    const boxH = 18;
    doc.setDrawColor(229); doc.setFillColor(254, 254, 255);
    doc.rect(MARGIN_X, yPos, CONTENT_WIDTH, boxH, 'FD');
    doc.setFontSize(7); doc.setTextColor(150); doc.setFont("helvetica", "bold");
    doc.text("PACIENT:", MARGIN_X + 3, yPos + 4);
    doc.text("RČ / DAT. NAR.:", MARGIN_X + 85, yPos + 4);
    doc.text("POJIŠŤOVNA:", MARGIN_X + 130, yPos + 4);
    
    doc.setFontSize(10); doc.setTextColor(33, 33, 57); doc.setFont("helvetica", "bold");
    doc.text(sanitize(data.identifikace?.jmeno || "Neznámý"), MARGIN_X + 3, yPos + 11);
    doc.text(sanitize(data.identifikace?.rodne_cislo_datum_nar), MARGIN_X + 85, yPos + 11);
    doc.text(sanitize(data.identifikace?.pojistovna), MARGIN_X + 130, yPos + 11);
    yPos += boxH + 10;

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(REPORT_LABELS[type].toUpperCase(), MARGIN_X, yPos);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(`Datum: ${sanitize(data.poskytovatel?.datum_cas)}`, MARGIN_X + CONTENT_WIDTH, yPos, { align: "right" });
    yPos += 8;

    if (type === ReportType.AMBULANTNI_ZAZNAM) {
        const d = data as AmbulantniZaznamData;
        printHeaderBar("Subjektivně (S)");
        printText(d.subjektivni);
        printHeaderBar("Objektivně (O)");
        printText(d.objektivni);
        
        if (d.hodnoceni?.diagnozy?.length > 0) {
            printHeaderBar("Diagnózy (A)");
            d.hodnoceni.diagnozy.forEach(dg => {
                checkPageBreak(6);
                doc.setFont("helvetica", "bold"); doc.text(sanitize(dg.kod), MARGIN_X, yPos);
                printText(`- ${dg.nazev}`, 10, false, 25);
            });
            if(d.hodnoceni.zaver) printText(`Závěr: ${d.hodnoceni.zaver}`, 10, false, 0, 50);
        }

        printHeaderBar("Plán a Poučení (P)");
        if (d.plan.medikace?.length > 0) {
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Medikace:", MARGIN_X, yPos);
            yPos += 5;
            d.plan.medikace.forEach(m => printText(`• ${m.nazev} (${m.davkovani})`, 10, false, 5));
        }
        if (d.plan.doporuceni) printText(`Doporučení: ${d.plan.doporuceni}`);
        if (d.plan.pouceni) {
            yPos += 2;
            doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Poučení pacienta:", MARGIN_X, yPos);
            yPos += 5;
            printText(d.plan.pouceni, 9, false, 0, 80);
        }
        if (d.plan.kontrola) {
            yPos += 5;
            doc.setFont("helvetica", "bold"); doc.text(`Kontrola: ${sanitize(d.plan.kontrola)}`, MARGIN_X, yPos);
        }
    } else {
        printText(JSON.stringify(data, null, 2).replace(/[{}"]/g, ''));
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(180);
        doc.line(MARGIN_X, PAGE_HEIGHT - 15, MARGIN_X + CONTENT_WIDTH, PAGE_HEIGHT - 15);
        doc.text(`MedVoice AI | Vygenerováno: ${new Date().toLocaleString()}`, MARGIN_X, PAGE_HEIGHT - 10);
        doc.text(`Strana ${i} z ${totalPages}`, MARGIN_X + CONTENT_WIDTH, PAGE_HEIGHT - 10, { align: 'right' });
    }

    doc.save(`Zprava_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const renderHeaderForm = () => {
      const id = report.data.identifikace;
      const prov = report.data.poskytovatel;
      return (
          <div className="border-b-2 border-slate-900 pb-6 mb-10">
              <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 mr-6">
                       <h2 className="font-bold text-slate-900 text-xl font-montserrat tracking-tight">{providerConfig.name || "MedVoice Clinic"}</h2>
                       <p className="text-xs text-slate-500 font-medium mt-1">{providerConfig.address}</p>
                       <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-bold">IČO: {providerConfig.ico} | ICP: {providerConfig.icp} | Odb: {providerConfig.specializationCode}</p>
                  </div>
                  <div className="text-right">
                       <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Datum a čas</p>
                       <input 
                          className="text-sm font-mono text-slate-700 text-right bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-primary-500 outline-none p-1"
                          value={prov?.datum_cas || new Date().toLocaleString()}
                          onChange={(e) => updateData(['poskytovatel', 'datum_cas'], e.target.value)}
                       />
                  </div>
              </div>
              
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="relative">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-widest flex items-center gap-1.5">
                            <User size={10} /> Pacient
                          </label>
                          <input 
                              className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                              value={id?.jmeno || ""}
                              onChange={(e) => updateData(['identifikace', 'jmeno'], e.target.value)}
                              placeholder="Jméno a příjmení"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-widest">RČ / Dat. nar.</label>
                          <input 
                              className="w-full text-sm text-slate-700 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                              value={id?.rodne_cislo_datum_nar || ""}
                              onChange={(e) => updateData(['identifikace', 'rodne_cislo_datum_nar'], e.target.value)}
                              placeholder="XXXXXX/XXXX"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-widest">Pojišťovna</label>
                          <input 
                              className="w-full text-sm text-slate-700 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                              value={id?.pojistovna || ""}
                              onChange={(e) => updateData(['identifikace', 'pojistovna'], e.target.value)}
                              placeholder="Kód"
                          />
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderAmbulantni = (data: AmbulantniZaznamData) => (
      <div className="space-y-6">
          <EditableArea label="Subjektivně (S)" value={data.subjektivni} onChange={(v) => updateData(['subjektivni'], v)} />
          <EditableArea label="Objektivně (O)" value={data.objektivni} onChange={(v) => updateData(['objektivni'], v)} />
          <div className="p-6 bg-blue-50/30 border border-blue-100 rounded-3xl">
              <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} /> Hodnocení a Diagnózy (A)
              </h4>
              <div className="space-y-3 mb-5">
                  {data.hodnoceni?.diagnozy?.map((d, i) => (
                      <div key={i} className="flex gap-3 items-center group animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                          <input 
                              className="w-24 p-2 text-sm font-bold text-blue-900 border border-blue-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-sm"
                              value={d.kod}
                              onChange={(e) => {
                                  const newDg = [...data.hodnoceni.diagnozy];
                                  newDg[i].kod = e.target.value;
                                  updateData(['hodnoceni', 'diagnozy'], newDg);
                              }}
                          />
                          <input 
                              className="flex-1 p-2 text-sm text-blue-900 border border-transparent hover:border-blue-100 rounded-xl bg-white/50 hover:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                              value={d.nazev}
                              onChange={(e) => {
                                  const newDg = [...data.hodnoceni.diagnozy];
                                  newDg[i].nazev = e.target.value;
                                  updateData(['hodnoceni', 'diagnozy'], newDg);
                              }}
                          />
                      </div>
                  ))}
              </div>
              <EditableArea label="Závěrečné hodnocení" value={data.hodnoceni?.zaver} onChange={(v) => updateData(['hodnoceni', 'zaver'], v)} className="bg-white p-2 rounded-2xl shadow-sm" inputClassName="bg-white" />
          </div>
          <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl">
              <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={14} /> Plán a Realizace (P)
              </h4>
              <div className="space-y-3 mb-5">
                  {data.plan?.medikace?.map((m, i) => (
                      <div key={i} className="flex gap-3 items-center bg-white p-3 rounded-2xl border border-emerald-100 shadow-sm animate-in slide-in-from-right-2 duration-200">
                          <input 
                              className="flex-1 text-sm font-bold text-slate-800 outline-none bg-transparent"
                              value={m.nazev}
                              onChange={(e) => {
                                  const newMed = [...data.plan.medikace];
                                  newMed[i].nazev = e.target.value;
                                  updateData(['plan', 'medikace'], newMed);
                              }}
                          />
                          <input 
                              className="w-40 text-sm text-emerald-600 font-medium text-right outline-none bg-emerald-50/50 rounded-lg px-2 py-1"
                              value={m.davkovani}
                              onChange={(e) => {
                                  const newMed = [...data.plan.medikace];
                                  newMed[i].davkovani = e.target.value;
                                  updateData(['plan', 'medikace'], newMed);
                              }}
                          />
                      </div>
                  ))}
              </div>
              <EditableArea label="Další doporučení" value={data.plan?.doporuceni} onChange={(v) => updateData(['plan', 'doporuceni'], v)} className="bg-white p-2 rounded-2xl shadow-sm" inputClassName="bg-white" />
              <EditableArea label="Záznam o poučení" value={data.plan?.pouceni} onChange={(v) => updateData(['plan', 'pouceni'], v)} className="bg-white p-2 rounded-2xl shadow-sm" inputClassName="bg-white" />
              <EditableInput label="Termín kontroly" value={data.plan?.kontrola} onChange={(v) => updateData(['plan', 'kontrola'], v)} className="bg-white p-2 rounded-2xl shadow-sm" inputClassName="bg-white" />
          </div>
      </div>
  );

  const EntityGroup = ({ title, category, icon: Icon, colorClass, items }: { title: string, category: any, icon: any, colorClass: string, items: { text: string, index: number }[] }) => (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md`}>
        <div className={`px-5 py-4 border-b border-slate-100 flex justify-between items-center ${colorClass}`}>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] flex items-center gap-2">
                <Icon size={14} /> {title}
            </h4>
            <button 
                onClick={() => addEntity(category)}
                className="p-1.5 hover:bg-white/40 rounded-lg transition-colors"
                title="Přidat položku"
            >
                <Plus size={16} />
            </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-slate-300">
                <div className="mb-2 opacity-20"><Icon size={32} /></div>
                <p className="text-[10px] uppercase font-bold tracking-widest">Žádná data</p>
              </div>
            )}
            {items.map((item) => (
                <div key={item.index} className="flex items-center gap-2 group animate-in fade-in zoom-in-95 duration-200">
                    <input 
                        className="flex-1 text-sm bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 focus:ring-4 focus:ring-primary-50 focus:bg-white focus:border-primary-200 outline-none transition-all shadow-sm"
                        value={item.text}
                        onChange={(e) => updateEntity(item.index, e.target.value)}
                        placeholder="Zadejte text entity..."
                    />
                    <button 
                        onClick={() => removeEntity(item.index)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-xl">
      <div className="flex border-b border-slate-200 bg-white p-1">
        <button onClick={() => setActiveTab('report')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-2 ${activeTab === 'report' ? 'text-primary-700 bg-primary-50 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
          <FileText size={16}/> Dokument
        </button>
        <button onClick={() => setActiveTab('entities')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-2xl flex items-center justify-center gap-2 ${activeTab === 'entities' ? 'text-primary-700 bg-primary-50 shadow-inner' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
          <Tags size={16}/> Entity
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-100 relative custom-scrollbar">
        {isRegenerating && (
            <div className="absolute inset-0 bg-white/70 z-[60] flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-300">
                <div className="relative mb-6">
                  <RefreshCw className="animate-spin text-primary-600" size={48} />
                  <div className="absolute inset-0 animate-pulse opacity-20 bg-primary-400 rounded-full blur-xl"></div>
                </div>
                <span className="text-sm font-bold text-slate-700 tracking-widest uppercase">Aktualizuji dokument AI...</span>
                <p className="text-[10px] text-slate-400 mt-2">Uplatňuji provedené změny v entitách</p>
            </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-[210mm] mx-auto flex flex-col gap-6">
             <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-lg flex flex-wrap justify-between items-center gap-4 sticky top-0 z-10 backdrop-blur-md bg-white/90">
                 <select value={report.reportType} onChange={handleTypeChange} className="bg-slate-100 border-none text-xs font-bold uppercase tracking-widest rounded-2xl p-3 w-full sm:w-72 focus:ring-4 focus:ring-primary-50 outline-none cursor-pointer hover:bg-slate-200 transition-all">
                    {Object.entries(REPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                 </select>
                 
                 <div className="flex items-center gap-3">
                     <ValidationStatus result={validationResult} />
                     <div className="flex gap-2">
                        <button 
                            onClick={async () => {
                                const text = JSON.stringify(report.data, null, 2);
                                try {
                                    await navigator.clipboard.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                } catch (err) {}
                            }}
                            className={`p-3 rounded-2xl transition-all border shadow-sm ${copied ? 'bg-green-600 text-white border-green-700' : 'bg-white text-slate-400 border-slate-200 hover:text-primary-600 hover:border-primary-200'}`}
                            title="Zkopírovat JSON"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />} 
                        </button>
                        <button onClick={downloadPDF} className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl hover:shadow-2xl">
                            <Printer size={18} /> Tisk / PDF
                        </button>
                     </div>
                 </div>
             </div>

             <div className="report-paper p-10 md:p-16 min-h-[297mm] shadow-2xl relative animate-in zoom-in-95 duration-500">
                {renderHeaderForm()}
                
                <h1 className="text-3xl font-bold text-slate-900 mb-12 text-center uppercase tracking-[0.2em] font-montserrat border-b-4 border-double border-slate-100 pb-8">
                    {REPORT_LABELS[report.reportType]}
                </h1>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {report.reportType === ReportType.AMBULANTNI_ZAZNAM && renderAmbulantni(report.data as AmbulantniZaznamData)}
                    {/* Další typy by byly renderovány podobně přes upravené šablony */}
                    {report.reportType !== ReportType.AMBULANTNI_ZAZNAM && (
                      <div className="bg-slate-50 p-6 rounded-3xl font-mono text-xs text-slate-600 leading-relaxed">
                        {JSON.stringify(report.data, null, 2)}
                      </div>
                    )}
                </div>

                <div className="mt-32 pt-10 flex justify-end">
                    <div className="text-center w-64">
                         <div className="h-20 mb-3 flex items-end justify-center">
                             <div className="w-40 h-px bg-slate-200 relative">
                                <span className="absolute -top-10 left-0 w-full font-script text-3xl text-primary-900 opacity-20 italic">MUDr. Novák</span>
                             </div>
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Razítko a podpis lékaře</p>
                    </div>
                </div>
             </div>
          </div>
        )}
        
        {activeTab === 'entities' && (
           <div className="max-w-6xl mx-auto flex flex-col h-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                  <h3 className="font-bold text-slate-900 text-2xl font-montserrat tracking-tight flex items-center gap-3">
                      <div className="p-2.5 bg-primary-100 text-primary-600 rounded-2xl shadow-inner">
                        <Stethoscope size={24} /> 
                      </div>
                      Klinické Entity
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Upravte zjištěné údaje před aktualizací dokumentu.</p>
                </div>
                <button 
                    onClick={() => onRegenerateReport(report.reportType)}
                    disabled={isRegenerating}
                    className="flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-100 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                >
                    <Zap size={18} fill="currentColor" /> Aktualizovat dokument
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-16">
                  <EntityGroup 
                    title="Diagnózy" 
                    category="DIAGNOSIS" 
                    icon={Activity} 
                    colorClass="bg-blue-50 text-blue-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'DIAGNOSIS')} 
                  />
                  <EntityGroup 
                    title="Medikace" 
                    category="MEDICATION" 
                    icon={Pill} 
                    colorClass="bg-emerald-50 text-emerald-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'MEDICATION')} 
                  />
                  <EntityGroup 
                    title="Příznaky" 
                    category="SYMPTOM" 
                    icon={Activity} 
                    colorClass="bg-amber-50 text-amber-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'SYMPTOM')} 
                  />
                  <EntityGroup 
                    title="Ostatní" 
                    category="OTHER" 
                    icon={Tags} 
                    colorClass="bg-slate-100 text-slate-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category !== 'DIAGNOSIS' && e.category !== 'MEDICATION' && e.category !== 'SYMPTOM')} 
                  />
              </div>
              
              <div className="bg-blue-900/90 text-white p-6 rounded-3xl border border-blue-800 flex gap-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 mt-auto">
                 <div className="p-3 bg-blue-800 rounded-2xl self-start shadow-inner">
                    <Info size={24} />
                 </div>
                 <div>
                    <h5 className="font-bold text-lg mb-1 font-montserrat">Interaktivní úprava</h5>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      Změny provedené v seznamech výše budou AI asistentem automaticky zohledněny při generování finální lékařské zprávy. 
                      Kliknutím na tlačítko <strong>Aktualizovat dokument</strong> dojde k přepsání textových polí zprávy tak, aby odpovídala vašim korekcím.
                    </p>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

const Info = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
);
