
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Activity,
  Mic,
  ChevronRight,
  Menu,
  Database,
  Lock,
  Stethoscope,
  FileText,
  Clock,
  Zap,
  Sun,
  Moon,
  X
} from 'lucide-react';
import FluidBackground from './components/FluidBackground';
import GradientText from './components/GlitchText';
import SolutionCard from './components/SolutionCard';
import AIChat from './components/AIChat';
import CustomCursor from './components/CustomCursor';
import { SolutionFeature } from './types';

const SOLUTIONS: SolutionFeature[] = [
  {
    id: '1',
    title: 'Ambient Scribe',
    category: 'Precision',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1000&auto=format&fit=crop',
    tags: ['SOAP Struktura', 'Diarizace mluvčích'],
    description: 'Automaticky transformuje rozhovor s pacientem na strukturovaný lékařský záznam dle vyhlášky 444/2024 Sb.'
  },
  {
    id: '2',
    title: 'Lékařský Editor',
    category: 'Speed',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=1000&auto=format&fit=crop',
    tags: ['Karaoke Mód', 'WYSIWYG'],
    description: 'Interaktivní editor s propojením textu a audia. Kliknutím na větu přehrajete přesný okamžik z konzultace.'
  },
  {
    id: '3',
    title: 'Kódování ICD-10',
    category: 'Analysis',
    image: 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?q=80&w=1000&auto=format&fit=crop',
    tags: ['MKN-10', 'DRG optimalizace'],
    description: 'Inteligentní návrhy diagnóz a kódů pro pojišťovny na základě klinického kontextu zprávy.'
  }
];

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const scrollIntoView = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL || 'https://dashboard-36206.web.app';

  return (
    <div className="relative min-h-screen selection:bg-cyan-500/30 overflow-x-hidden transition-colors duration-500">
      <CustomCursor />
      <FluidBackground />
      <AIChat />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 p-6 md:px-12 flex justify-between items-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 transition-all duration-500">
        <motion.div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-10 h-10 bg-cyan-600 dark:bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20">
            <Activity className="text-white dark:text-slate-900 w-6 h-6" />
          </div>
          <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white uppercase">
            MedVoice<span className="text-cyan-600 dark:text-cyan-400">AI</span>
          </span>
        </motion.div>

        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-8">
            {['Řešení', 'Legislativa', 'Bezpečnost'].map((item) => (
              <button
                key={item}
                onClick={() => scrollIntoView(item.toLowerCase())}
                className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-white transition-colors"
                data-hover="true"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-2" />

          <button
            onClick={toggleTheme}
            className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all shadow-sm group"
            data-hover="true"
            aria-label="Přepnout motiv"
          >
            <AnimatePresence mode="wait">
              {isDarkMode ? (
                <motion.div
                  key="dark-mode"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="light-mode"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-5 h-5 text-slate-700" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <a
            href={`${dashboardUrl}?mode=login&source=landing`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3 bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-cyan-600/30 transition-all active:scale-95"
            data-hover="true"
          >
            Přihlásit se
          </a>
        </div>

        <div className="flex md:hidden items-center gap-4">
          <button onClick={toggleTheme} className="p-2 text-slate-600 dark:text-white">
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6 text-slate-800" />}\
          </button>
          <button className="text-slate-900 dark:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-0 top-0 pt-28 pb-12 px-6 bg-white dark:bg-slate-950 z-40 border-b border-slate-200 dark:border-white/10 md:hidden flex flex-col gap-8 shadow-2xl"
          >
            {['Řešení', 'Legislativa', 'Bezpečnost'].map((item) => (
              <button key={item} onClick={() => scrollIntoView(item.toLowerCase())} className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter text-left">
                {item}
              </button>
            ))}
            <a href={`${dashboardUrl}?mode=login&source=landing`} target="_blank" rel="noopener noreferrer" className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm text-center">Vstup do aplikace</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 pt-20 overflow-hidden">
        <div className="max-w-4xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-8 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              Certifikováno pro legislativu 2025
            </div>

            <h1 className="text-6xl md:text-[9.5rem] font-black leading-[0.8] tracking-tighter mb-10 text-slate-900 dark:text-white">
              <GradientText text="Lékařské zprávy" /><br />
              <span className="text-slate-400 dark:text-slate-500 italic opacity-80">bez psaní na klávesnici.</span>
            </h1>

            <p className="text-xl md:text-3xl text-slate-600 dark:text-slate-400 max-w-2xl mb-14 leading-tight font-medium tracking-tight">
              Inteligentní dokumentační asistent, který mění rozhovor s pacientem na strukturovaný záznam v reálném čase.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <a
                href={`${dashboardUrl}?mode=signup&source=landing`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-12 py-6 bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-black uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-4 hover:bg-cyan-500 dark:hover:bg-cyan-400 transition-all group shadow-2xl shadow-cyan-600/30"
                data-hover="true"
              >
                Začít zdarma
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href={`${dashboardUrl}?mode=demo&source=landing`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-12 py-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm" data-hover="true"
              >
                <Mic className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Vyzkoušet Demo
              </a>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/2 h-screen hidden lg:block opacity-5 dark:opacity-20 pointer-events-none">
          <div className="bg-grid absolute inset-0 mask-gradient-to-l" />
        </div>
      </section>

      {/* Solutions Section */}
      <section id="řešení" className="py-32 px-6 md:px-12 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">
              Revoluce v <span className="text-cyan-600 dark:text-cyan-400">dokumentaci.</span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl font-medium">
              Tři pilíře našeho systému, které vám vrátí čas na pacienty.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {SOLUTIONS.map((solution, index) => (
              <motion.div
                key={solution.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <SolutionCard feature={solution} onClick={() => { }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Legislation & Security Section */}
      <section id="legislativa" className="py-32 px-6 md:px-12 bg-slate-50 dark:bg-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                <FileText className="w-4 h-4" />
                Vyhláška 444/2024 Sb.
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter">
                Legislativní jistota.<br />
                <span className="text-slate-400">Automaticky.</span>
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Náš systém je navržen tak, aby plně vyhovoval požadavkům nové vyhlášky o zdravotnické dokumentaci.
                Strukturované záznamy, SOAP formát a MKN-10 kódování jsou standardem.
              </p>
              <ul className="space-y-4 mb-10">
                {['Plná kompatibilita s DASTA', 'Automatické kódování DRG', 'Validace povinných dat'].map(item => (
                  <li key={item} className="flex items-center gap-3 font-bold text-slate-700 dark:text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                      <ShieldCheck className="w-3 h-3 text-white" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full" />
              <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-10 rounded-3xl shadow-2xl">
                <Database className="w-16 h-16 text-cyan-600 dark:text-cyan-400 mb-6" />
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Bezpečnost dat</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Vaše data jsou šifrována pomocí AES-256 a přenášena přes zabezpečený TLS protokol.
                  Neukládáme audio záznamy déle, než je nezbytně nutné pro zpracování.
                </p>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 flex items-center gap-4">
                  <Lock className="w-8 h-8 text-emerald-500" />
                  <div>
                    <div className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wider">GDPR Ready</div>
                    <div className="text-xs text-slate-500">Plný soulad s nařízením EU</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="bezpečnost" className="py-20 px-6 md:px-12 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Activity className="text-white dark:text-slate-900 w-5 h-5" />
            </div>
            <span className="font-black text-lg tracking-tighter text-slate-900 dark:text-white uppercase">
              MedVoice<span className="text-cyan-600 dark:text-cyan-400">AI</span>
            </span>
          </div>

          <div className="flex gap-8 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-cyan-600 dark:hover:text-white transition-colors">O nás</a>
            <a href="#" className="hover:text-cyan-600 dark:hover:text-white transition-colors">Podmínky</a>
            <a href="#" className="hover:text-cyan-600 dark:hover:text-white transition-colors">Kontakt</a>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            © 2025 MedVoice AI. Všechna práva vyhrazena.
          </div>
        </div>
      </footer>    </div>
  );
};

export default App;
