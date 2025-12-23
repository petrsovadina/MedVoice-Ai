
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
  CheckCircle2, 
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

const LEGISLATION = [
  { title: 'Vyhláška 444/2024 Sb.', desc: 'Plná shoda se strukturou dokumentace.' },
  { title: 'Zákon 372/2011 Sb.', desc: 'Řešení pro informované souhlasy a reversy.' },
  { title: 'Standardy NCEZ', desc: 'Připraveno na interoperabilitu českého eHealth.' }
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
            className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all shadow-sm group"
            data-hover="true"
            aria-label="Přepnout motiv"
          >
            <AnimatePresence mode="wait">
              {isDarkMode ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-5 h-5 text-slate-700" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <button 
            onClick={() => scrollIntoView('kontakt')}
            className="px-7 py-3 bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-cyan-600/30 transition-all active:scale-95" 
            data-hover="true"
          >
            Konzultace
          </button>
        </div>

        <div className="flex md:hidden items-center gap-4">
           <button onClick={toggleTheme} className="p-2 text-slate-600 dark:text-white">
             {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6 text-slate-800" />}
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
            <button onClick={() => scrollIntoView('kontakt')} className="w-full py-5 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm">Objednat Demo</button>
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
              <button 
                onClick={() => scrollIntoView('řešení')}
                className="px-12 py-6 bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-black uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-4 hover:bg-cyan-500 dark:hover:bg-cyan-400 transition-all group shadow-2xl shadow-cyan-600/30" 
                data-hover="true"
              >
                Začít zdarma
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => scrollIntoView('kontakt')}
                className="px-12 py-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-black uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm" data-hover="true"
              >
                <Mic className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Video ukázka
              </button>
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/2 h-screen hidden lg:block opacity-5 dark:opacity-20 pointer-events-none">
           <div className="bg-grid absolute inset-0 mask-gradient-to-l" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-24 bg-white/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-white/5 backdrop-blur-3xl transition-all duration-500">
        <div className="px-6 md:px-12 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: 'Ušetřeného času', value: '75%', icon: Clock },
            { label: 'Přesnost přepisu', value: '99.8%', icon: Zap },
            { label: 'Odborných modulů', value: '40+', icon: Stethoscope },
            { label: 'Zákonná shoda', value: '100%', icon: ShieldCheck },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <stat.icon className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mx-auto mb-6 group-hover:scale-110 transition-transform" />
              <div className="text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter">{stat.value}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] font-black">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Solutions Section */}
      <section id="řešení" className="py-40 px-6 md:px-12">
        <div className="mb-24 text-center max-w-4xl mx-auto">
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-slate-900 dark:text-white leading-none">
            Moderní nástroje pro <br /><span className="text-cyan-600 dark:text-cyan-400 italic">vaši ordinaci.</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-2xl font-medium max-w-2xl mx-auto leading-tight tracking-tight">
            Od ambulantního záznamu po automatické kódování pojišťovně. Vše integrováno v jediném plynulém rozhraní.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {SOLUTIONS.map((feature) => (
            <SolutionCard 
              key={feature.id} 
              feature={feature} 
              onClick={() => scrollIntoView('kontakt')} 
            />
          ))}
        </div>
      </section>

      {/* Legislation Section */}
      <section id="legislativa" className="py-40 bg-slate-50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-white/5 transition-all">
        <div className="px-6 md:px-12 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-6xl md:text-7xl font-black mb-12 tracking-tighter text-slate-900 dark:text-white leading-none">
                V souladu s <br /><span className="text-emerald-600 dark:text-emerald-400">pravidly.</span>
              </h2>
              <p className="text-2xl text-slate-600 dark:text-slate-400 mb-14 font-medium leading-tight tracking-tight">
                Každý záznam splňuje nejnovější požadavky na zdravotnickou dokumentaci a standardy interoperability.
              </p>
              
              <div className="space-y-5">
                {LEGISLATION.map((item, i) => (
                  <div key={i} className="flex gap-6 p-7 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:translate-x-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-base mb-1">{item.title}</h4>
                      <p className="text-base text-slate-500 dark:text-slate-400 font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative group">
               <div className="aspect-square bg-cyan-400/20 dark:bg-cyan-500/20 rounded-full blur-[130px] absolute inset-0 group-hover:scale-110 transition-transform duration-1000" />
               <motion.div 
                className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 p-12 rounded-[3.5rem] overflow-hidden shadow-2xl transition-colors duration-500"
                whileHover={{ y: -10 }}
               >
                 <div className="flex items-center gap-5 mb-10">
                   <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                     <FileText className="text-emerald-600 dark:text-emerald-400 w-8 h-8" />
                   </div>
                   <div>
                     <div className="text-sm font-black text-slate-900 dark:text-white tracking-widest uppercase">Lékařský nález</div>
                     <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.25em] mt-1">SOAP Generátor</div>
                   </div>
                 </div>
                 <div className="space-y-8 font-mono text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic border-l-2 border-emerald-500/30 pl-6">
                    <p><span className="text-cyan-600 dark:text-cyan-400 font-black not-italic uppercase tracking-widest mr-2">S:</span> Pacient (65 let) popisuje recidivující tlakové bolesti v epigastriu...</p>
                    <p><span className="text-cyan-600 dark:text-cyan-400 font-black not-italic uppercase tracking-widest mr-2">O:</span> Peristaltika klidná, palp. citlivost v nadbřišku bez defense...</p>
                    <p><span className="text-cyan-600 dark:text-cyan-400 font-black not-italic uppercase tracking-widest mr-2">A:</span> Dyspepsie horního typu, pravděpodobně GERD...</p>
                    <p><span className="text-cyan-600 dark:text-cyan-400 font-black not-italic uppercase tracking-widest mr-2">P:</span> Plánována gastroskopie, nasazen Omeprazol 20mg 1-0-0...</p>
                 </div>
               </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="bezpečnost" className="py-40 px-6 md:px-12 text-center overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 bg-cyan-100 dark:bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-12 border border-cyan-200 dark:border-cyan-500/20 shadow-2xl shadow-cyan-500/10"
          >
            <Lock className="text-cyan-600 dark:text-cyan-400 w-12 h-12" />
          </motion.div>
          <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 text-slate-900 dark:text-white leading-none">
            Vaše data pod <br /><span className="text-cyan-600 dark:text-cyan-400">zámkem.</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-2xl font-medium mb-24 leading-tight max-w-3xl mx-auto tracking-tight">
            Audio záznamy jsou mazány ihned po analýze. Používáme šifrování armádní úrovně a servery výhradně v rámci EU.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             {[
               { icon: Database, title: 'EU Data Residency', desc: 'Data nikdy neopouští Unii.' },
               { icon: ShieldCheck, title: 'HIPAA & GDPR Ready', desc: 'Maximální právní ochrana.' },
               { icon: Lock, title: 'Military Grade Encryption', desc: 'AES-256 standard bezpečnosti.' }
             ].map((item, i) => (
               <div key={i} className="p-12 bg-white dark:bg-white/5 rounded-[3rem] border border-slate-200 dark:border-white/10 backdrop-blur-3xl shadow-sm hover:shadow-2xl transition-all group hover:-translate-y-2">
                  <item.icon className="w-12 h-12 text-cyan-600 dark:text-cyan-400 mx-auto mb-8 group-hover:rotate-6 transition-transform" />
                  <div className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-3 leading-tight">{item.title}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{item.desc}</div>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="kontakt" className="py-40 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-[5rem] p-16 md:p-36 overflow-hidden relative shadow-2xl border border-white/5 dark:border-slate-950/5"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-cyan-500/30 dark:bg-cyan-600/10 blur-[160px] rounded-full pointer-events-none" />
          <h2 className="text-6xl md:text-[9rem] font-black tracking-tighter mb-14 leading-[0.8] relative z-10">
            Získejte zpět <br /><span className="text-cyan-400 dark:text-cyan-600 italic">svůj čas.</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-7 relative z-20">
            <button 
              onClick={() => window.open('https://calendar.google.com', '_blank')}
              className="px-16 py-7 bg-cyan-500 text-slate-950 text-sm font-black uppercase tracking-[0.25em] rounded-2xl hover:bg-cyan-400 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-cyan-500/20" data-hover="true"
            >
              Rezervovat demo
            </button>
            <button 
              onClick={() => scrollIntoView('řešení')}
              className="px-16 py-7 bg-white/10 dark:bg-slate-950/5 text-white dark:text-slate-950 text-sm font-black uppercase tracking-[0.25em] rounded-2xl hover:bg-white/20 dark:hover:bg-slate-950/10 transition-all border border-white/10 dark:border-slate-950/10" data-hover="true"
            >
              Prohlédnout funkce
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-28 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="col-span-1 md:col-span-2">
             <div className="flex items-center gap-3 mb-10">
                <Activity className="text-cyan-600 dark:text-cyan-400 w-12 h-12" />
                <span className="font-black text-4xl tracking-tighter text-slate-900 dark:text-white uppercase">MedVoice<span className="text-cyan-600 dark:text-cyan-400">AI</span></span>
             </div>
             <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-12 text-xl font-medium leading-tight tracking-tight">
               Lékařská hlasová inteligence navržená lékaři pro lékaře. Uvolněte ruce a věnujte se pacientům.
             </p>
             <div className="flex gap-5">
               <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"><Activity size={20} /></div>
               <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"><ShieldCheck size={20} /></div>
               <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"><Lock size={20} /></div>
             </div>
          </div>
          <div>
            <h5 className="font-black text-slate-900 dark:text-white mb-10 uppercase tracking-[0.25em] text-[11px]">Ekosystém</h5>
            <ul className="space-y-5 text-sm font-bold text-slate-500 dark:text-slate-400">
              <li><button onClick={() => scrollIntoView('řešení')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Ambient Scribe</button></li>
              <li><button onClick={() => scrollIntoView('legislativa')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Vyhláška 444/2024 Sb.</button></li>
              <li><button onClick={() => scrollIntoView('bezpečnost')} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Zabezpečení Dat</button></li>
              <li><button className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Podporované NIS</button></li>
            </ul>
          </div>
          <div>
            <h5 className="font-black text-slate-900 dark:text-white mb-10 uppercase tracking-[0.25em] text-[11px]">Informace</h5>
            <ul className="space-y-5 text-sm font-bold text-slate-500 dark:text-slate-400">
              <li><a href="#" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Ochrana soukromí</a></li>
              <li><a href="#" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Právní doložka</a></li>
              <li><a href="#" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors uppercase tracking-[0.15em] text-[10px]">Kontakt</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-28 px-6 md:px-12 flex flex-col md:flex-row justify-between gap-10 border-t border-slate-200 dark:border-white/5 pt-14 transition-colors">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 leading-none">
             © 2025 MedVoice-AI Technologies. Vyvinuto v Praze.
          </div>
          <div className="flex flex-wrap gap-10 text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.35em] leading-none">
             <span className="flex items-center gap-3"><ShieldCheck size={14} className="text-emerald-500" /> GDPR Certified</span>
             <span className="flex items-center gap-3"><Lock size={14} className="text-cyan-500" /> AES-256 E2E</span>
             <span className="flex items-center gap-3"><Zap size={14} className="text-yellow-500" /> Czech Medical NLP</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
