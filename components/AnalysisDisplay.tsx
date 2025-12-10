
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
    ValidationSeverity
} from '../types';
import { FileText, Tags, Printer, RefreshCw, Stethoscope, Pill, Save, Edit3, ShieldCheck, AlertTriangle, AlertCircle, Copy, Check } from 'lucide-react';
import { jsPDF } from "jspdf";

interface AnalysisDisplayProps {
  entities: MedicalEntity[];
  report: StructuredReport;
  validationResult: ValidationResult;
  onReportChange: (report: StructuredReport) => void;
  onRegenerateReport: (type: ReportType) => Promise<void>;
  isRegenerating: boolean;
}

const REPORT_LABELS: Record<ReportType, string> = {
  [ReportType.AMBULANTNI_ZAZNAM]: "Ambulantní záznam (Dekurs)",
  [ReportType.OSETR_ZAZNAM]: "Záznam ošetřovatelské péče",
  [ReportType.KONZILIARNI_ZPRAVA]: "Konziliární zpráva / Žádanka",
  [ReportType.POTVRZENI_VYSETRENI]: "Potvrzení o vyšetření",
  [ReportType.DOPORUCENI_LECBY]: "Doporučení k léčbě (RHB)"
};

// --- Helper Components ---

const EditableArea = ({ label, value, onChange, minRows = 2, className = "" }: { label: string, value: string | undefined, onChange: (val: string) => void, minRows?: number, className?: string }) => (
    <div className={`mb-4 group relative ${className}`}>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
        <textarea 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 text-sm text-slate-900 border border-transparent hover:border-slate-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 rounded bg-transparent hover:bg-slate-50 transition-all resize-none overflow-hidden"
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

const EditableInput = ({ label, value, onChange, className = "" }: { label: string, value: string | undefined, onChange: (val: string) => void, className?: string }) => (
    <div className={`mb-2 group relative ${className}`}>
        {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>}
        <input 
            type="text"
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-1.5 text-sm text-slate-900 border border-transparent hover:border-slate-200 focus:border-primary-300 focus:ring-1 focus:ring-primary-200 rounded bg-transparent hover:bg-slate-50 transition-all font-medium"
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

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
    entities, report, validationResult, onReportChange, onRegenerateReport, isRegenerating
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

  const formatReportToText = (): string => {
      const data = report.data;
      const type = report.reportType;
      const header = `${REPORT_LABELS[type].toUpperCase()}\n${new Date().toLocaleDateString('cs-CZ')}\nMedVoice Clinic, s.r.o.\n----------------------------------------\n\n`;
      let content = "";

      if (type === ReportType.AMBULANTNI_ZAZNAM) {
          const d = data as AmbulantniZaznamData;
          content += `SUBJEKTIVNĚ:\n${d.subjektivni || '-'}\n\n`;
          content += `OBJEKTIVNĚ:\n${d.objektivni || '-'}\n\n`;
          content += `HODNOCENÍ:\n`;
          d.hodnoceni?.diagnozy?.forEach(dg => content += `- ${dg.kod}: ${dg.nazev}\n`);
          content += `Závěr: ${d.hodnoceni?.zaver || '-'}\n\n`;
          content += `PLÁN:\n`;
          d.plan?.medikace?.forEach(m => content += `- ${m.nazev} (${m.davkovani})\n`);
          content += `Doporučení: ${d.plan?.doporuceni || '-'}\n`;
          content += `Kontrola: ${d.plan?.kontrola || '-'}\n`;
      } 
      else if (type === ReportType.OSETR_ZAZNAM) {
          const d = data as OsetrovatelskyZaznamData;
          content += `SUBJEKTIVNÍ POTÍŽE:\n${d.subjektivni_potize || '-'}\n\n`;
          content += `VITÁLNÍ FUNKCE:\nTK: ${d.vitalni_funkce?.tk || '-'} | P: ${d.vitalni_funkce?.p || '-'} | TT: ${d.vitalni_funkce?.tt || '-'}\n\n`;
          content += `VÝKONY:\n`;
          d.provedene_vykony?.forEach(v => content += `- ${v.cas || '--:--'} ${v.nazev}\n`);
          content += `\nPOZNÁMKA:\n${d.poznamka_sestry || '-'}\n`;
      }
      // ... (Generic fallback for other types or implement specific if needed)
      else {
          content += JSON.stringify(data, null, 2);
      }

      return header + content;
  };

  const copyToClipboard = async () => {
      const text = formatReportToText();
      try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy', err);
      }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const data = report.data;
    const type = report.reportType;
    let yPos = 20;

    const addHeader = (title: string) => {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 37, 41);
        doc.text("MedVoice Clinic, s.r.o.", 20, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text("MUDr. Jan Novák | Kardiologie | IČ: 12345678", 20, yPos);
        yPos += 15;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(20, yPos, 190, yPos);
        yPos += 15;
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(title.toUpperCase(), 105, yPos, { align: "center" });
        yPos += 15;
    };

    const addSection = (label: string, text: string | undefined, isBold = false) => {
        if (!text) return;
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text(label.toUpperCase(), 20, yPos);
        yPos += 5;
        doc.setFontSize(11);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.setTextColor(0);
        const splitText = doc.splitTextToSize(text, 170);
        doc.text(splitText, 20, yPos);
        yPos += (splitText.length * 6) + 5;
    };

    const addFooter = (signatureLabel: string = "Razítko a podpis lékaře") => {
        const pageHeight = doc.internal.pageSize.height;
        yPos = pageHeight - 40;
        doc.setLineWidth(0.5);
        doc.line(130, yPos, 190, yPos);
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(signatureLabel, 160, yPos + 5, { align: "center" });
        doc.text(`Datum: ${new Date().toLocaleDateString('cs-CZ')}`, 20, yPos + 5);
        doc.text("Vygenerováno systémem MedVoice AI", 105, pageHeight - 10, { align: "center" });
    };

    addHeader(REPORT_LABELS[type]);

    if (type === ReportType.AMBULANTNI_ZAZNAM) {
        const d = data as AmbulantniZaznamData;
        addSection("Subjektivně (S)", d.subjektivni);
        addSection("Objektivně (O)", d.objektivni);
        if (d.hodnoceni?.diagnozy?.length) {
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(100);
            doc.text("HODNOCENÍ (A)", 20, yPos); yPos += 6;
            d.hodnoceni.diagnozy.forEach(dg => {
                doc.setFont("helvetica", "bold"); doc.setTextColor(0);
                doc.text(`${dg.kod}`, 25, yPos);
                doc.setFont("helvetica", "normal");
                doc.text(`- ${dg.nazev}`, 45, yPos);
                yPos += 6;
            });
            yPos += 2;
            doc.setFont("helvetica", "italic");
            const zaverLines = doc.splitTextToSize(d.hodnoceni.zaver, 170);
            doc.text(zaverLines, 20, yPos);
            yPos += (zaverLines.length * 6) + 8;
        }
        if (d.plan) {
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(100);
            doc.text("PLÁN (P)", 20, yPos); yPos += 6;
            d.plan.medikace?.forEach(m => {
                doc.setTextColor(0); doc.setFont("helvetica", "normal");
                doc.text(`• ${m.nazev} (${m.davkovani})`, 25, yPos); yPos += 6;
            });
            if (d.plan.doporuceni) {
                const recLines = doc.splitTextToSize(`Doporučení: ${d.plan.doporuceni}`, 170);
                doc.text(recLines, 20, yPos); yPos += (recLines.length * 6) + 4;
            }
             if (d.plan.kontrola) {
                doc.text(`Kontrola: ${d.plan.kontrola}`, 20, yPos); yPos += 10;
            }
        }
        addFooter();
    }
    else if (type === ReportType.OSETR_ZAZNAM) {
        const d = data as OsetrovatelskyZaznamData;
        addSection("Subjektivní potíže", d.subjektivni_potize);
        doc.setFillColor(245, 247, 250);
        doc.rect(20, yPos, 170, 20, 'F');
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(100);
        doc.text("TK", 30, yPos + 8); doc.text("Pulz", 80, yPos + 8); doc.text("Teplota", 130, yPos + 8);
        doc.setFontSize(12); doc.setTextColor(0);
        doc.text(d.vitalni_funkce?.tk || "-", 30, yPos + 15); doc.text(d.vitalni_funkce?.p || "-", 80, yPos + 15); doc.text(d.vitalni_funkce?.tt || "-", 130, yPos + 15);
        yPos += 30;
        if (d.provedene_vykony?.length) {
            addSection("Provedené výkony", "");
            d.provedene_vykony.forEach(v => {
                doc.text(`${v.cas || '--:--'}  ${v.nazev}`, 25, yPos);
                yPos += 6;
            });
            yPos += 10;
        }
        addSection("Poznámka sestry", d.poznamka_sestry);
        addFooter("Podpis sestry");
    }
    else if (type === ReportType.KONZILIARNI_ZPRAVA) {
        const d = data as KonziliarniZpravaData;
        doc.setFontSize(11);
        doc.text(`Odesílající lékař: ${d.odesilajici_lekar}`, 20, yPos); yPos += 6;
        doc.text(`Žádost pro: ${d.cilova_odbornost}`, 20, yPos); yPos += 6;
        doc.text(`Urgentnost: ${d.urgentnost}`, 20, yPos); yPos += 15;
        addSection("Důvod konzilia (Otázka)", d.duvod_konzilia, true);
        addSection("Nynější onemocnění", d.nynnejsi_onemocneni);
        addSection("Dosavadní léčba", d.dosavadni_lecba);
        addFooter();
    }
    else if (type === ReportType.POTVRZENI_VYSETRENI) {
        const d = data as PotvrzeniVysetreniData;
        yPos += 20;
        doc.setFontSize(12);
        doc.text("Potvrzujeme, že pacient byl vyšetřen v našem zdravotnickém zařízení.", 20, yPos);
        yPos += 20;
        doc.text(`Datum a čas návštěvy: ${d.datum_cas_navstevy}`, 40, yPos); yPos += 10;
        doc.text(`Účel vyšetření: ${d.ucel_vysetreni}`, 40, yPos); yPos += 10;
        if(d.doprovod) { doc.text(`Doprovod: ${d.doprovod}`, 40, yPos); yPos += 10; }
        yPos += 10;
        addSection("Doporučený režim", d.doporuceni_rezim);
        addFooter();
    }
    else if (type === ReportType.DOPORUCENI_LECBY) {
        const d = data as DoporuceniLecbyData;
        addSection("Hlavní diagnóza", d.diagnoza_hlavni, true);
        addSection("Cíl léčby", d.cil_lecby);
        addSection("Navrhovaná terapie", d.navrhovana_terapie);
        if (d.procedury?.length) {
             doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(100);
             doc.text("PROCEDURY", 20, yPos); yPos += 6;
             d.procedury.forEach(p => {
                 doc.setFont("helvetica", "bold"); doc.setTextColor(0);
                 doc.text(p.nazev, 25, yPos);
                 doc.setFont("helvetica", "normal");
                 doc.text(`  (${p.frekvence})`, 25 + doc.getTextWidth(p.nazev), yPos);
                 yPos += 6;
             });
        }
        addFooter();
    } else {
        const textLines = doc.splitTextToSize(JSON.stringify(data, null, 2), 170);
        doc.text(textLines, 20, yPos);
    }
    doc.save(`MedVoice_${type}_${new Date().toISOString().slice(0,10)}.pdf`);
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
              <EditableArea label="Závěr" value={data.hodnoceni?.zaver} onChange={(v) => updateData(['hodnoceni', 'zaver'], v)} className="bg-white p-2 rounded shadow-sm" />
          </div>
          <div className="p-4 bg-green-50/50 border border-green-100 rounded-lg">
              <h4 className="text-xs font-bold text-green-700 uppercase mb-3">Plán (P)</h4>
              <div className="space-y-2 mb-3">
                  {data.plan?.medikace?.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center bg-white p-2 rounded border border-green-100 shadow-sm">
                          <input 
                              className="flex-1 text-sm font-medium text-slate-800 outline-none"
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
              <EditableArea label="Doporučení" value={data.plan?.doporuceni} onChange={(v) => updateData(['plan', 'doporuceni'], v)} className="bg-white p-2 rounded shadow-sm" />
              <EditableInput label="Kontrola" value={data.plan?.kontrola} onChange={(v) => updateData(['plan', 'kontrola'], v)} className="bg-white p-2 rounded shadow-sm" />
          </div>
      </div>
  );

  const renderOsetrovatelsky = (data: OsetrovatelskyZaznamData) => (
      <div className="space-y-4">
          <EditableArea label="Subjektivní potíže" value={data.subjektivni_potize} onChange={(v) => updateData(['subjektivni_potize'], v)} />
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border rounded-lg">
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="TK" value={data.vitalni_funkce?.tk} onChange={(v) => updateData(['vitalni_funkce', 'tk'], v)} />
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="Pulz" value={data.vitalni_funkce?.p} onChange={(v) => updateData(['vitalni_funkce', 'p'], v)} />
              <EditableInput className="mb-0 bg-white p-2 rounded shadow-sm" label="Teplota" value={data.vitalni_funkce?.tt} onChange={(v) => updateData(['vitalni_funkce', 'tt'], v)} />
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
                 <EditableInput label="Cílová odbornost" value={data.cilova_odbornost} onChange={(v) => updateData(['cilova_odbornost'], v)} className="bg-white p-2 rounded shadow-sm" />
             </div>
          </div>
          <EditableArea label="Důvod konzilia (Otázka)" value={data.duvod_konzilia} onChange={(v) => updateData(['duvod_konzilia'], v)} />
          <EditableArea label="Nynější onemocnění" value={data.nynnejsi_onemocneni} onChange={(v) => updateData(['nynnejsi_onemocneni'], v)} />
          <EditableArea label="Dosavadní léčba" value={data.dosavadni_lecba} onChange={(v) => updateData(['dosavadni_lecba'], v)} />
          <EditableInput label="Odesílající lékař" value={data.odesilajici_lekar} onChange={(v) => updateData(['odesilajici_lekar'], v)} />
      </div>
  );

  const renderPotvrzeni = (data: PotvrzeniVysetreniData) => (
      <div className="space-y-6 text-center pt-4">
          <div className="text-sm text-slate-600 italic">
              Potvrzujeme, že pacient byl vyšetřen v našem zdravotnickém zařízení.
          </div>
          <div className="py-6 border-t border-b border-slate-100 my-4 text-left">
              <div className="grid grid-cols-2 gap-6">
                  <EditableInput label="Datum a čas" value={data.datum_cas_navstevy} onChange={(v) => updateData(['datum_cas_navstevy'], v)} />
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
                <span className="text-sm font-medium text-primary-700">Přegenerovávám dokument...</span>
            </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-[210mm] mx-auto flex flex-col gap-4">
             {/* Controls */}
             <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10">
                 <select value={report.reportType} onChange={handleTypeChange} className="bg-slate-50 border border-slate-300 text-sm rounded-md p-2 w-full sm:w-64 focus:ring-2 focus:ring-primary-500 outline-none">
                    {Object.entries(REPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                 </select>
                 
                 <div className="flex items-center gap-2">
                     <ValidationStatus result={validationResult} />
                     <div className="flex gap-1">
                        <button 
                            onClick={copyToClipboard}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors border shadow-sm ${copied ? 'bg-green-600 text-white border-green-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                            title="Zkopírovat do schránky (NIS)"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />} 
                        </button>
                        <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-900 transition-colors shadow-sm">
                            <Printer size={16} /> Tisk / PDF
                        </button>
                     </div>
                 </div>
             </div>

             {/* The Interactive Paper */}
             <div className="bg-white p-8 md:p-12 min-h-[297mm] shadow-lg border border-slate-200 rounded-sm relative">
                {/* Header Simulation */}
                <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end opacity-90">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">MedVoice Clinic, s.r.o.</h2>
                        <p className="text-xs text-slate-500 mt-1">MUDr. Jan Novák | Kardiologie | IČ: 12345678</p>
                    </div>
                    <div className="text-right">
                         <p className="text-xs text-slate-400">Vygenerováno dne</p>
                         <p className="text-sm font-mono text-slate-700">{new Date().toLocaleDateString('cs-CZ')}</p>
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-10 text-center uppercase tracking-wide border-b border-dashed border-slate-200 pb-6">
                    {REPORT_LABELS[report.reportType]}
                </h1>

                {/* Content Switching based on Type */}
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {report.reportType === ReportType.AMBULANTNI_ZAZNAM && renderAmbulantni(report.data as AmbulantniZaznamData)}
                    {report.reportType === ReportType.OSETR_ZAZNAM && renderOsetrovatelsky(report.data as OsetrovatelskyZaznamData)}
                    {report.reportType === ReportType.KONZILIARNI_ZPRAVA && renderKonzilium(report.data as KonziliarniZpravaData)}
                    {report.reportType === ReportType.POTVRZENI_VYSETRENI && renderPotvrzeni(report.data as PotvrzeniVysetreniData)}
                    {report.reportType === ReportType.DOPORUCENI_LECBY && renderDoporuceni(report.data as DoporuceniLecbyData)}
                </div>

                {/* Footer Simulation */}
                <div className="mt-24 pt-8 flex justify-end">
                    <div className="text-center w-48">
                         <div className="h-16 mb-2 flex items-end justify-center">
                             {/* Signature placeholder */}
                             <span className="font-script text-2xl text-slate-400 opacity-30 select-none">MUDr. Novák</span>
                         </div>
                         <div className="border-t border-slate-300"></div>
                         <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Razítko a podpis lékaře</p>
                    </div>
                </div>
             </div>
          </div>
        )}
        
        {/* ... (Entities Tab remains the same) ... */}
        {activeTab === 'entities' && (
           <div className="space-y-4 max-w-4xl mx-auto">
              <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Stethoscope size={20} className="text-primary-600" /> Detekované klinické entity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Diagnózy (ICD-10)</h4>
                      <div className="space-y-2">
                          {entities.filter(e => e.category === 'DIAGNOSIS').length === 0 && <span className="text-sm text-slate-400 italic">Žádné diagnózy nenalezeny</span>}
                          {entities.filter(e => e.category === 'DIAGNOSIS').map((e, i) => (
                              <div key={i} className="text-sm p-2 bg-slate-50 rounded text-slate-700 font-medium">{e.text}</div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
                          Medikace <Pill size={14} />
                      </h4>
                      <div className="space-y-2">
                          {entities.filter(e => e.category === 'MEDICATION').length === 0 && <span className="text-sm text-slate-400 italic">Žádná medikace nenalezena</span>}
                          {entities.filter(e => e.category === 'MEDICATION').map((e, i) => (
                              <div key={i} className="text-sm p-2 bg-blue-50 text-blue-800 rounded flex justify-between items-center">
                                  <span>{e.text}</span>
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm md:col-span-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Subjektivní příznaky</h4>
                      <div className="flex flex-wrap gap-2">
                          {entities.filter(e => e.category === 'SYMPTOM').length === 0 && <span className="text-sm text-slate-400 italic">Žádné příznaky nenalezeny</span>}
                          {entities.filter(e => e.category === 'SYMPTOM').map((e, i) => (
                              <span key={i} className="text-sm px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-full">{e.text}</span>
                          ))}
                      </div>
                  </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
