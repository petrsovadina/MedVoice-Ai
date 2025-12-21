import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Activity, BrainCircuit } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (e: any) {
            setError("Nepodařilo se přihlásit. Zkuste to prosím znovu.");
            console.error(e);
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent-primary/20 rounded-full blur-[100px]" />

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[32px] p-8 md:p-12 text-center">

                    <div className="mb-8 flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-2xl shadow-lg shadow-primary-500/30 flex items-center justify-center transform rotate-3">
                            <Activity className="text-white" size={40} strokeWidth={2.5} />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">MedVoice AI</h1>
                    <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                        Inteligentní hlasový asistent pro moderní lékařskou praxi.
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-4 text-left p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Bezpečné úložiště</h3>
                                <p className="text-slate-400 text-xs">Data šifrována dle standardů</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-left p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="bg-accent-primary/20 p-2 rounded-lg text-emerald-600">
                                <BrainCircuit size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">AI Analýza</h3>
                                <p className="text-slate-400 text-xs">Váš osobní kontext paměti</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isLoggingIn ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                        )}
                        <span>{isLoggingIn ? 'Přihlašování...' : 'Přihlásit přes Google'}</span>
                    </button>

                    <p className="mt-8 text-xs text-slate-400 font-medium">
                        Přihlášením souhlasíte s podmínkami užití a zpracováním dat pro účely poskytování služby.
                    </p>
                </div>
            </div>
        </div>
    );
};
