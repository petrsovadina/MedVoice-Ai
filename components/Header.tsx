
import React from 'react';
import { Stethoscope, User, LogOut, Settings } from 'lucide-react';
import { User as UserType } from '../types';

interface HeaderProps {
  onOpenSettings: () => void;
  user: UserType | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, user, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-lg text-white">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MedVoice AI</h1>
              <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-full">BETA</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-all" 
              title="Nastavení"
            >
              <Settings size={20} />
            </button>
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-slate-700">{user?.name || 'Neznámý uživatel'}</span>
              <span className="text-xs text-slate-500">{user?.specialization || 'Lékař'}</span>
            </div>
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 border border-primary-200">
              <User size={20} />
            </div>
            <button 
              onClick={onLogout}
              className="text-slate-400 hover:text-red-500 transition-colors p-2" 
              title="Odhlásit"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
