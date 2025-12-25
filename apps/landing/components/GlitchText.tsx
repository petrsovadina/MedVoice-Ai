
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
}

const GradientText: React.FC<GradientTextProps> = ({ text, as: Component = 'span', className = '' }) => {
  return (
    <Component className={`relative inline-block font-bold tracking-tight isolate ${className}`}>
      <motion.span
        className="absolute inset-0 z-10 block bg-gradient-to-r from-slate-900 dark:from-white via-cyan-600 dark:via-cyan-400 via-emerald-600 dark:via-emerald-400 to-slate-900 dark:to-white bg-[length:200%_auto] bg-clip-text text-transparent will-change-[background-position]"
        animate={{
          backgroundPosition: ['0% center', '200% center'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        aria-hidden="true"
        style={{ 
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {text}
      </motion.span>
      
      <span className="block text-slate-900 dark:text-white opacity-10">
        {text}
      </span>
      
      <span
        className="absolute inset-0 -z-10 block bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-cyan-500/10 bg-[length:200%_auto] blur-2xl opacity-30 dark:opacity-50"
        aria-hidden="true"
      >
        {text}
      </span>
    </Component>
  );
};

export default GradientText;
