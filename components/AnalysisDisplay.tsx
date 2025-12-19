
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
    AlertCircle, AlertTriangle, Edit3, Trash2, Plus, Zap, Activity
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
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
        <textarea 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-2 text-sm text-slate-900 border border-transparent hover:border-slate-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 rounded transition-all resize-none overflow-hidden ${inputClassName || 'bg-transparent hover:bg-slate-50'}`}
            rows={minRows}
            onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
            }}
        />
        <Edit3 size={12} className="absolute top-0 right-0 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
);

const EditableInput = ({ label, value, onChange, className = "", inputClassName }: { label: string, value: string | undefined, onChange: (val: string) => void, className?: string, inputClassName?: string }) => (
    <div className={`mb-2 group relative ${className}`}>
        {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>}
        <input 
            type="text"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className={`w-full p-1.5 text-sm text-slate-900 border border-transparent hover:border-slate-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 rounded transition-all font-medium ${inputClassName || 'bg-transparent hover:bg-slate-50'}`}
        />
    </div>
);

const ValidationStatus = ({ result }: { result: ValidationResult }) => {
    const errorCount = result.errors.filter(e => e.severity === ValidationSeverity.ERROR).length;
    const warningCount = result.errors.filter(e => e.severity === ValidationSeverity.WARNING).length;

    if (errorCount === 0 && warningCount === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 text-xs font-bold">
                <ShieldCheck size={14} /> Legislativně OK
            </div>
        );
    }

    return (
        <div className="group relative">
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-bold cursor-help ${errorCount > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {errorCount > 0 ? <AlertCircle size={14} /> : <AlertTriangle size={14} />}
                {errorCount > 0 ? `${errorCount} chyb` : `${warningCount} varování`}
            </div>
            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Legislativní kontrola</h4>
                <ul className="space-y-2">
                    {result.errors.map((e, i) => (
                        <li key={i} className={`text-xs flex gap-2 ${e.severity === ValidationSeverity.ERROR ? 'text-red-600' : 'text-amber-600'}`}>
                            {e.severity === ValidationSeverity.ERROR ? <AlertCircle size={12} className="shrink-0 mt-0.5" /> : <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
                            <span><span className="font-semibold">{e.field}:</span> {e.message}</span>
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

  const addEntity = (category: 'SYMPTOM' | 'MEDICATION' | 'DIAGNOSIS' | 'OTHER') => {
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
    
    // Konstanty pro A4
    const MARGIN_X = 20;
    const PAGE_WIDTH = 210;
    const PAGE_HEIGHT = 297;
    const MARGIN_BOTTOM = 25;
    const MARGIN_TOP = 20;
    const CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN_X);
    
    // SAFETY BUFFER pro zalamování (vynucené zúžení o dalších 10mm)
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

    /**
     * ULTRA-AGGRESSIVE SANITIZATION
     */
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
        doc.setFillColor(245, 247, 250);
        doc.rect(MARGIN_X, yPos, CONTENT_WIDTH, 7, 'F');
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(60, 70, 90);
        doc.text(label.toUpperCase(), MARGIN_X + 2, yPos + 5);
        yPos += 10;
        doc.setTextColor(0);
    };

    // --- RENDER HEADER ---
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
    doc.setDrawColor(220); doc.setFillColor(254, 254, 255);
    doc.rect(MARGIN_X, yPos, CONTENT_WIDTH, boxH, 'FD');
    doc.setFontSize(7); doc.setTextColor(150); doc.setFont("helvetica", "bold");
    doc.text("PACIENT:", MARGIN_X + 3, yPos + 4);
    doc.text("RČ / DAT. NAR.:", MARGIN_X + 85, yPos + 4);
    doc.text("POJIŠŤOVNA:", MARGIN_X + 130, yPos + 4);
    
    doc.setFontSize(10); doc.setTextColor(0); doc.setFont("helvetica", "bold");
    doc.text(sanitize(data.identifikace?.jmeno || "Neznámý"), MARGIN_X + 3, yPos + 11);
    doc.text(sanitize(data.identifikace?.rodne_cislo_datum_nar), MARGIN_X + 85, yPos + 11);
    doc.text(sanitize(data.identifikace?.pojistovna), MARGIN_X + 130, yPos + 11);
    yPos += boxH + 10;

    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(REPORT_LABELS[type].toUpperCase(), MARGIN_X, yPos);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(`Datum: ${sanitize(data.poskytovatel?.datum_cas)}`, MARGIN_X + CONTENT_WIDTH, yPos, { align: "right" });
    yPos += 8;

    // --- BODY ---
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

    // --- FOOTER ---
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
          <div className="border-b-2 border-slate-800 pb-4 mb-8">
              <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 mr-4">
                       <h2 className="font-bold text-slate-900 text-lg">{providerConfig.name || "MedVoice Clinic"}</h2>
                       <p className="text-xs text-slate-500">{providerConfig.address}</p>
                       <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">IČO: {providerConfig.ico} | ICP: {providerConfig.icp} | Odbornost: {providerConfig.specializationCode}</p>
                  </div>
                  <div className="text-right">
                       <p className="text-xs text-slate-400">Datum vyšetření</p>
                       <input 
                          className="text-sm font-mono text-slate-700 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 outline-none"
                          value={prov?.datum_cas || new Date().toLocaleString()}
                          onChange={(e) => updateData(['poskytovatel', 'datum_cas'], e.target.value)}
                       />
                  </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pacient</label>
                          <input 
                              className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded px-2 py-1"
                              value={id?.jmeno || ""}
                              onChange={(e) => updateData(['identifikace', 'jmeno'], e.target.value)}
                              placeholder="Jméno a příjmení"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">RČ / Dat. nar.</label>
                          <input 
                              className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
                              value={id?.rodne_cislo_datum_nar || ""}
                              onChange={(e) => updateData(['identifikace', 'rodne_cislo_datum_nar'], e.target.value)}
                              placeholder="XXXXXX/XXXX"
                          />
                      </div>
                      <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pojišťovna</label>
                          <input 
                              className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
                              value={id?.pojistovna || ""}
                              onChange={(e) => updateData(['identifikace', 'pojistovna'], e.target.value)}
                              placeholder="např. 111"
                          />
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderAmbulantni = (data: AmbulantniZaznamData) => (
      <div className="space-y-4">
          <EditableArea label="Subjektivně (S)" value={data.subjektivni} onChange={(v) => updateData(['subjektivni'], v)} />
          <EditableArea label="Objektivně (O)" value={data.objektivni} onChange={(v) => updateData(['objektivni'], v)} />
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
              <h4 className="text-xs font-bold text-blue-700 uppercase mb-3">Hodnocení (A)</h4>
              <div className="space-y-2 mb-3">
                  {data.hodnoceni?.diagnozy?.map((d, i) => (
                      <div key={i} className="flex gap-2 items-center">
                          <input 
                              className="w-20 p-1 text-sm font-bold text-blue-900 border border-blue-200 rounded bg-white"
                              value={d.kod}
                              onChange={(e) => {
                                  const newDg = [...data.hodnoceni.diagnozy];
                                  newDg[i].kod = e.target.value;
                                  updateData(['hodnoceni', 'diagnozy'], newDg);
                              }}
                          />
                          <input 
                              className="flex-1 p-1 text-sm text-blue-900 border border-transparent hover:border-blue-200 rounded bg-white"
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
              <EditableArea label="Závěr" value={data.hodnoceni?.zaver} onChange={(v) => updateData(['hodnoceni', 'zaver'], v)} className="bg-white p-2 rounded shadow-sm" inputClassName="bg-white" />
          </div>
          <div className="p-4 bg-green-50/50 border border-green-100 rounded-lg">
              <h4 className="text-xs font-bold text-green-700 uppercase mb-3">Plán (P)</h4>
              <div className="space-y-2 mb-3">
                  {data.plan?.medikace?.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center bg-white p-2 rounded border border-green-100 shadow-sm">
                          <input 
                              className="flex-1 text-sm font-medium text-slate-800 outline-none bg-white"
                              value={m.nazev}
                              onChange={(e) => {
                                  const newMed = [...data.plan.medikace];
                                  newMed[i].nazev = e.target.value;
                                  updateData(['plan', 'medikace'], newMed);
                              }}
                          />
                          <input 
                              className="w-32 text-sm text-slate-500 text-right outline-none bg-slate-50 rounded px-1"
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
              <EditableArea label="Doporučení" value={data.plan?.doporuceni} onChange={(v) => updateData(['plan', 'doporuceni'], v)} className="bg-white p-2 rounded shadow-sm" inputClassName="bg-white" />
              <EditableArea label="Poučení pacienta" value={data.plan?.pouceni} onChange={(v) => updateData(['plan', 'pouceni'], v)} className="bg-white p-2 rounded shadow-sm" inputClassName="bg-white" />
              <EditableInput label="Kontrola" value={data.plan?.kontrola} onChange={(v) => updateData(['plan', 'kontrola'], v)} className="bg-white p-2 rounded shadow-sm" inputClassName="bg-white" />
          </div>
      </div>
  );
  
  const renderOsetrovatelsky = (data: OsetrovatelskyZaznamData) => (
      <div className="space-y-4">
          <EditableArea label="Subjektivní potíže" value={data.subjektivni_potize} onChange={(v) => updateData(['subjektivni_potize'], v)} />
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border rounded-lg">
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="TK" value={data.vitalni_funkce?.tk} onChange={(v) => updateData(['vitalni_funkce', 'tk'], v)} inputClassName="bg-white" />
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="Pulz" value={data.vitalni_funkce?.p} onChange={(v) => updateData(['vitalni_funkce', 'p'], v)} inputClassName="bg-white" />
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="Teplota" value={data.vitalni_funkce?.tt} onChange={(v) => updateData(['vitalni_funkce', 'tt'], v)} inputClassName="bg-white" />
          </div>
          <div className="p-4 border rounded-lg">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Provedené výkony</h4>
              {data.provedene_vykony?.map((v, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                       <input 
                          className="w-20 text-xs font-mono text-slate-500 bg-slate-100 rounded p-1 text-center"
                          value={v.cas || ''}
                          onChange={(e) => {
                              const newVyk = [...data.provedene_vykony];
                              newVyk[i].cas = e.target.value;
                              updateData(['provedene_vykony'], newVyk);
                          }}
                          placeholder="Čas"
                       />
                       <input 
                          className="flex-1 text-sm border-b border-transparent hover:border-slate-200 focus:border-primary-300 outline-none transition-colors"
                          value={v.nazev}
                          onChange={(e) => {
                              const newVyk = [...data.provedene_vykony];
                              newVyk[i].nazev = e.target.value;
                              updateData(['provedene_vykony'], newVyk);
                          }}
                       />
                  </div>
              ))}
          </div>
          <EditableArea label="Poznámka sestry" value={data.poznamka_sestry} onChange={(v) => updateData(['poznamka_sestry'], v)} />
      </div>
  );

  const renderKonzilium = (data: KonziliarniZpravaData) => (
      <div className="space-y-4">
          <div className="flex gap-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
             <div className="flex-1">
                 <label className="text-xs font-bold text-yellow-700 uppercase">Urgentnost</label>
                 <select 
                    className="w-full mt-1 bg-white border border-yellow-200 rounded p-1 text-sm text-yellow-900"
                    value={data.urgentnost}
                    onChange={(e) => updateData(['urgentnost'], e.target.value)}
                 >
                     <option value="Běžná">Běžná</option>
                     <option value="Akutní">Akutní</option>
                     <option value="Neodkladná">Neodkladná</option>
                 </select>
             </div>
             <div className="flex-[2]">
                 <EditableInput label="Cílová odbornost" value={data.cilova_odbornost} onChange={(v) => updateData(['cilova_odbornost'], v)} className="bg-white p-2 rounded shadow-sm" inputClassName="bg-white" />
             </div>
          </div>
          <EditableArea label="Důvod konzilia (Otázka)" value={data.duvod_konzilia} onChange={(v) => updateData(['duvod_konzilia'], v)} />
          <EditableArea label="Nynější onemocnění" value={data.nynnejsi_onemocneni} onChange={(v) => updateData(['nynnejsi_onemocneni'], v)} />
          <EditableArea label="Dosavadní léčba" value={data.dosavadni_lecba} onChange={(v) => updateData(['dosavadni_lecba'], v)} />
      </div>
  );

  const renderPotvrzeni = (data: PotvrzeniVysetreniData) => (
      <div className="space-y-6 text-center pt-4">
          <div className="text-sm text-slate-600 italic">
              Potvrzujeme, že pacient byl vyšetřen v našem zdravotnickém zařízení.
          </div>
          <div className="py-6 border-t border-b border-slate-100 my-4 text-left">
              <div className="grid grid-cols-2 gap-6">
                  <EditableInput label="Účel vyšetření" value={data.ucel_vysetreni} onChange={(v) => updateData(['ucel_vysetreni'], v)} />
                  <EditableInput label="Doprovod" value={data.doprovod} onChange={(v) => updateData(['doprovod'], v)} />
              </div>
          </div>
          <EditableArea label="Doporučený režim" value={data.doporuceni_rezim} onChange={(v) => updateData(['doporuceni_rezim'], v)} />
      </div>
  );
  
  const renderDoporuceni = (data: DoporuceniLecbyData) => (
      <div className="space-y-4">
          <EditableInput label="Hlavní diagnóza" value={data.diagnoza_hlavni} onChange={(v) => updateData(['diagnoza_hlavni'], v)} />
          <EditableArea label="Cíl léčby" value={data.cil_lecby} onChange={(v) => updateData(['cil_lecby'], v)} />
          <EditableArea label="Navrhovaná terapie" value={data.navrhovana_terapie} onChange={(v) => updateData(['navrhovana_terapie'], v)} />
          <div className="p-4 bg-slate-50 border rounded-lg">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Procedury</h4>
              {data.procedury?.map((p, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center bg-white p-2 border rounded shadow-sm">
                      <input 
                          className="flex-1 text-sm font-medium outline-none"
                          value={p.nazev}
                          onChange={(e) => {
                              const newProc = [...data.procedury];
                              newProc[i].nazev = e.target.value;
                              updateData(['procedury'], newProc);
                          }}
                      />
                      <input 
                          className="w-24 text-sm text-slate-500 text-right outline-none"
                          value={p.frekvence}
                          onChange={(e) => {
                              const newProc = [...data.procedury];
                              newProc[i].frekvence = e.target.value;
                              updateData(['procedury'], newProc);
                          }}
                      />
                  </div>
              ))}
          </div>
      </div>
  );

  // --- Entity Tab Components ---

  const EntityGroup = ({ title, category, icon: Icon, colorClass, items }: { title: string, category: any, icon: any, colorClass: string, items: { text: string, index: number }[] }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col`}>
        <div className={`px-4 py-2 border-b border-slate-100 flex justify-between items-center ${colorClass}`}>
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Icon size={14} /> {title}
            </h4>
            <button 
                onClick={() => addEntity(category)}
                className="p-1 hover:bg-black/5 rounded transition-colors"
                title="Přidat entitu"
            >
                <Plus size={14} />
            </button>
        </div>
        <div className="p-3 space-y-2 flex-1">
            {items.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">Žádné záznamy</p>}
            {items.map((item) => (
                <div key={item.index} className="flex items-center gap-2 group">
                    <input 
                        className="flex-1 text-sm bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:ring-1 focus:ring-primary-400 outline-none transition-all"
                        value={item.text}
                        onChange={(e) => updateEntity(item.index, e.target.value)}
                        placeholder="..."
                    />
                    <button 
                        onClick={() => removeEntity(item.index)}
                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex border-b border-slate-200 bg-white">
        <button onClick={() => setActiveTab('report')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'report' ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/10' : 'text-slate-500 hover:bg-slate-50'}`}><FileText size={16} className="inline mr-2"/> Dokument</button>
        <button onClick={() => setActiveTab('entities')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'entities' ? 'text-primary-700 border-b-2 border-primary-600 bg-primary-50/10' : 'text-slate-500 hover:bg-slate-50'}`}><Tags size={16} className="inline mr-2"/> Entity</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 relative custom-scrollbar">
        {isRegenerating && (
            <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                <RefreshCw className="animate-spin text-primary-600 mb-2" size={32} />
                <span className="text-sm font-medium text-primary-700">Aktualizuji dokument...</span>
            </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-[210mm] mx-auto flex flex-col gap-4">
             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10">
                 <select value={report.reportType} onChange={handleTypeChange} className="bg-slate-50 border border-slate-300 text-sm rounded-md p-2 w-full sm:w-64 focus:ring-2 focus:ring-primary-500 outline-none">
                    {Object.entries(REPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                 </select>
                 
                 <div className="flex items-center gap-2">
                     <ValidationStatus result={validationResult} />
                     <div className="flex gap-1">
                        <button 
                            onClick={async () => {
                                const text = JSON.stringify(report.data, null, 2);
                                try {
                                    await navigator.clipboard.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                } catch (err) {}
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border shadow-sm ${copied ? 'bg-green-600 text-white border-green-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                            title="Zkopírovat JSON"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />} 
                        </button>
                        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-900 transition-colors shadow-sm">
                            <Printer size={16} /> Tisk / PDF
                        </button>
                     </div>
                 </div>
             </div>

             <div className="bg-white p-8 md:p-12 min-h-[297mm] shadow-lg border border-slate-200 rounded-sm relative">
                {renderHeaderForm()}
                
                <h1 className="text-2xl font-bold text-slate-900 mb-10 text-center uppercase tracking-wide border-b border-dashed border-slate-200 pb-6">
                    {REPORT_LABELS[report.reportType]}
                </h1>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {report.reportType === ReportType.AMBULANTNI_ZAZNAM && renderAmbulantni(report.data as AmbulantniZaznamData)}
                    {report.reportType === ReportType.OSETR_ZAZNAM && renderOsetrovatelsky(report.data as OsetrovatelskyZaznamData)}
                    {report.reportType === ReportType.KONZILIARNI_ZPRAVA && renderKonzilium(report.data as KonziliarniZpravaData)}
                    {report.reportType === ReportType.POTVRZENI_VYSETRENI && renderPotvrzeni(report.data as PotvrzeniVysetreniData)}
                    {report.reportType === ReportType.DOPORUCENI_LECBY && renderDoporuceni(report.data as DoporuceniLecbyData)}
                </div>

                <div className="mt-24 pt-8 flex justify-end">
                    <div className="text-center w-48">
                         <div className="h-16 mb-2 flex items-end justify-center">
                             <span className="font-script text-2xl text-slate-400 opacity-30 select-none">MUDr. Novák</span>
                         </div>
                         <div className="border-t border-slate-300"></div>
                         <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Razítko a podpis lékaře</p>
                    </div>
                </div>
             </div>
          </div>
        )}
        
        {activeTab === 'entities' && (
           <div className="max-w-4xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Stethoscope size={20} className="text-primary-600" /> 
                    Klinické Entity a Extrakce
                </h3>
                <button 
                    onClick={() => onRegenerateReport(report.reportType)}
                    disabled={isRegenerating}
                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-all shadow-md shadow-primary-200 disabled:opacity-50"
                >
                    <Zap size={16} fill="currentColor" /> Aktualizovat dokument dle entit
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                  <EntityGroup 
                    title="Diagnózy (ICD-10)" 
                    category="DIAGNOSIS" 
                    icon={Activity} 
                    colorClass="bg-blue-50 text-blue-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'DIAGNOSIS')} 
                  />
                  <EntityGroup 
                    title="Medikace a Léky" 
                    category="MEDICATION" 
                    icon={Pill} 
                    colorClass="bg-emerald-50 text-emerald-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'MEDICATION')} 
                  />
                  <EntityGroup 
                    title="Symptomy a Obtíže" 
                    category="SYMPTOM" 
                    icon={Activity} 
                    colorClass="bg-amber-50 text-amber-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category === 'SYMPTOM')} 
                  />
                  <EntityGroup 
                    title="Ostatní / Osobní" 
                    category="OTHER" 
                    icon={Tags} 
                    colorClass="bg-slate-50 text-slate-700" 
                    items={entities.map((e, i) => ({ ...e, index: i })).filter(e => e.category !== 'DIAGNOSIS' && e.category !== 'MEDICATION' && e.category !== 'SYMPTOM')} 
                  />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm mt-auto">
                 <AlertCircle size={18} className="shrink-0" />
                 <p>Upravte entity výše, pokud AI některou informaci nezachytila správně. Poté klikněte na <strong>"Aktualizovat dokument"</strong> pro přegenerování lékařské zprávy s těmito údaji.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
