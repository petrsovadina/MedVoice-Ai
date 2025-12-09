import React, { useState, useEffect } from 'react';
import { MedicalEntity, StructuredReport } from '../types';
import { FileText, Tags, Activity, Shield, Pill, Stethoscope, Copy, Check, Download, Edit2 } from 'lucide-react';
import { jsPDF } from "jspdf";

interface AnalysisDisplayProps {
  entities: MedicalEntity[];
  report: StructuredReport;
  onReportChange: (report: StructuredReport) => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ entities, report, onReportChange }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'entities'>('report');
  const [copied, setCopied] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<StructuredReport>(report);

  // Sync local state when prop changes
  useEffect(() => {
    setEditedReport(report);
  }, [report]);
  
  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopied(section);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    onReportChange(editedReport);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedReport(report); // Revert
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof StructuredReport, value: string) => {
    setEditedReport(prev => ({
        ...prev,
        [field]: value
    }));
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

    // Use current state (editedReport) for PDF if editing, or confirmed report
    const dataToPrint = isEditing ? editedReport : report;

    addSection("Subjektivně (S)", dataToPrint.subjective);
    addSection("Objektivně (O)", dataToPrint.objective);
    addSection("Hodnocení (A)", dataToPrint.assessment);
    addSection("Plán (P)", dataToPrint.plan);
    addSection("Shrnutí", dataToPrint.summary);

    doc.save("lekarska_zprava.pdf");
  };

  const ReportSection = ({ 
      title, 
      field,
      content 
  }: { 
      title: string, 
      field: keyof StructuredReport,
      content: string 
  }) => (
    <div className="mb-6 p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-colors group relative shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h4>
        {!isEditing && (
            <button 
            onClick={() => copyToClipboard(content, field)}
            className="text-slate-300 hover:text-primary-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Kopírovat sekci"
            >
            {copied === field ? <Check size={16} /> : <Copy size={16} />}
            </button>
        )}
      </div>
      
      {isEditing ? (
          <textarea
            value={editedReport[field]}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="w-full min-h-[100px] p-2 text-sm text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-y"
            placeholder={`Zadejte ${title.toLowerCase()}...`}
          />
      ) : (
          <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">{content || "Žádná data."}</p>
      )}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'report' && (
          <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">SOAP Zpráva</h3>
                <div className="flex gap-2">
                    {/* Toggle Edit Mode */}
                    {isEditing ? (
                         <>
                            <button 
                                onClick={handleSave}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Check size={14} /> Uložit
                            </button>
                            <button 
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                            >
                                Zrušit
                            </button>
                         </>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                        >
                            <Edit2 size={14} /> Upravit
                        </button>
                    )}

                    {!isEditing && (
                        <>
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
                                Vše
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            <ReportSection title="Subjektivní (Anamnéza)" content={isEditing ? editedReport.subjective : report.subjective} field="subjective" />
            <ReportSection title="Objektivní (Nález)" content={isEditing ? editedReport.objective : report.objective} field="objective" />
            <ReportSection title="Hodnocení (Diagnóza)" content={isEditing ? editedReport.assessment : report.assessment} field="assessment" />
            <ReportSection title="Plán (Terapie)" content={isEditing ? editedReport.plan : report.plan} field="plan" />
            
            <div className="mt-8 pt-6 border-t border-slate-200">
               <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Shrnutí</h4>
               {isEditing ? (
                   <textarea
                    value={editedReport.summary}
                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                    className="w-full min-h-[80px] p-4 text-slate-700 italic bg-white rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-y"
                  />
               ) : (
                   <p className="text-slate-700 italic bg-white p-4 rounded-lg border border-slate-200">{report.summary}</p>
               )}
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
      </div>
    </div>
  );
};