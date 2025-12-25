
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const DataParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 5 + 3,
      delay: Math.random() * 2,
      opacity: Math.random() * 0.2 + 0.05
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-500/20 dark:bg-cyan-400/10 will-change-[opacity,transform]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          initial={{ opacity: p.opacity, scale: 1 }}
          animate={{
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
            y: [`${p.y}%`, `${p.y - 3}%`, `${p.y}%`],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

const FluidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-700">
      <DataParticles />

      {/* Primary Cyan Blob */}
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] bg-cyan-400/10 dark:bg-cyan-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[150px] will-change-transform"
        animate={{
          x: [0, 50, -50, 0],
          y: [0, -50, 50, 0],
          rotate: [0, 360]
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Soft Emerald Accent */}
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-emerald-400/5 dark:bg-indigo-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[150px] will-change-transform"
        animate={{
          x: [0, -60, 60, 0],
          y: [0, 60, -60, 0],
          rotate: [360, 0]
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.2] dark:opacity-[0.5]"></div>
      
      {/* Subtle Overlay to smooth things out */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 dark:from-transparent to-white/40 dark:to-slate-950/20 pointer-events-none" />
    </div>
  );
};

export default FluidBackground;
