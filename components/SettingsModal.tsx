
import React, { useState } from 'react';
import { X, Save, Building2, MapPin, Hash, Phone, Info, BrainCircuit } from 'lucide-react';
import { ProviderConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ProviderConfig;
  onSave: (newConfig: ProviderConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState<ProviderConfig>(config);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Nastavení poskytovatele</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="bg-blue-50 p-3 rounded-lg flex gap-3 text-blue-700 text-sm mb-4">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>Tyto údaje se automaticky propíší do hlavičky generovaných PDF dokumentů v souladu s vyhláškou.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Název poskytovatele (Zařízení)</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="MUDr. Jan Novák s.r.o."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adresa sídla</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Ulice 123, 110 00 Praha"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IČO</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                    name="ico"
                    value={formData.ico}
                    onChange={handleChange}
                    placeholder="12345678"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ICP</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                    name="icp"
                    value={formData.icp}
                    onChange={handleChange}
                    placeholder="87654321"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kód odbornosti</label>
                <input 
                  name="specializationCode"
                  value={formData.specializationCode}
                  onChange={handleChange}
                  placeholder="001"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kontakt</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input 
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="+420 123 456 789"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-3 text-purple-800">
                     <BrainCircuit size={24} className="text-purple-600 shrink-0" />
                     <div>
                        <p className="text-sm font-bold">Hloubková AI analýza</p>
                        <p className="text-[10px] text-purple-600 font-medium">Používá Gemini 3 Pro pro komplexní případy (pomalé)</p>
                     </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="useThinkingMode"
                      checked={formData.useThinkingMode} 
                      onChange={handleChange} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
               </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Zrušit
          </button>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-md shadow-primary-200"
          >
            <Save size={18} /> Uložit nastavení
          </button>
        </div>
      </div>
    </div>
  );
};
