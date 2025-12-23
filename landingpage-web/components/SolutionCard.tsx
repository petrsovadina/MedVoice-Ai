
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion } from 'framer-motion';
import { SolutionFeature } from '../types';
import { ShieldCheck, Activity, Zap, Layers } from 'lucide-react';

interface SolutionCardProps {
  feature: SolutionFeature;
  onClick: () => void;
}

const SolutionCard: React.FC<SolutionCardProps> = ({ feature, onClick }) => {
  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security': return <ShieldCheck className="w-5 h-5" />;
      case 'speed': return <Zap className="w-5 h-5" />;
      case 'precision': return <Activity className="w-5 h-5" />;
      default: return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <motion.div
      className="group relative h-[500px] w-full overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 backdrop-blur-xl cursor-pointer rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-700"
      initial="rest"
      whileHover="hover"
      animate="rest"
      data-hover="true"
      onClick={onClick}
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.img 
          src={feature.image} 
          alt={feature.title} 
          className="h-full w-full object-cover opacity-[0.15] dark:opacity-[0.25] grayscale transition-all duration-700"
          variants={{
            rest: { scale: 1, filter: 'grayscale(100%) brightness(0.9)' },
            hover: { scale: 1.1, filter: 'grayscale(0%) brightness(0.8)' }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 via-white/90 dark:via-slate-950/60 to-transparent transition-colors duration-500" />
      </div>

      <div className="absolute inset-0 p-10 flex flex-col justify-end">
        <div className="flex items-center gap-3 mb-6">
           <span className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
             {getIcon(feature.category)}
           </span>
           <span className="text-[11px] font-black uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-400/80">
             {feature.category}
           </span>
        </div>

        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter leading-none">
          {feature.title}
        </h3>
        
        <p className="text-base text-slate-600 dark:text-slate-400 font-medium line-clamp-2 mb-6 group-hover:text-slate-950 dark:group-hover:text-slate-200 transition-colors leading-snug tracking-tight">
          {feature.description}
        </p>

        <div className="flex gap-2 flex-wrap">
          {feature.tags.map(tag => (
            <span key={tag} className="text-[10px] font-black uppercase tracking-widest px-3 py-1 border border-slate-200 dark:border-white/10 rounded-full bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/40">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SolutionCard;
