
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Stethoscope, ShieldCheck } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthScreenProps {
  onLogin: (user: UserType) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulace API volání
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (email && password) {
      // V reálné aplikaci zde proběhne validace proti backendu/Firebase
      onLogin({
        email,
        name: isLogin ? 'MUDr. Jan Novák' : name, // Mock jméno pro login
        specialization: isLogin ? 'Všeobecné praktické lékařství' : specialization
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-inter">
      <div className="bg-white w-full max-w-5xl h-[600px] rounded-[32px] shadow-2xl border border-slate-200 flex overflow-hidden">
        
        {/* Left Side - Brand */}
        <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-12 text-white">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
          
          <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-2xl backdrop-blur-md mb-6">
              <Stethoscope size={32} className="text-primary-400" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">MedVoice AI</h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Inteligentní dokumentace pro moderní zdravotnictví. Šetřete čas automatickým přepisem a strukturací klinických záznamů.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-300">
              <ShieldCheck className="text-primary-400" size={20} />
              <span>Splňuje standardy NCEZ a vyhlášky 444/2024 Sb.</span>
            </div>
            <div className="h-px bg-white/10 w-full"></div>
            <p className="text-xs text-slate-500">© 2025 MedVoice AI Systems</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-12 flex flex-col justify-center bg-white relative">
           <div className="max-w-sm mx-auto w-full">
              <div className="mb-10">
                <h2 className="text-2xl font-black text-slate-900 mb-2">{isLogin ? 'Vítejte zpět' : 'Vytvořit účet'}</h2>
                <p className="text-slate-500 text-sm">
                  {isLogin ? 'Zadejte své údaje pro přístup do workspace.' : 'Zaregistrujte se pro přístup k AI asistentovi.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="relative group">
                      <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Celé jméno (vč. titulů)" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="relative group">
                      <Stethoscope className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="Odbornost (např. Kardiologie)" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                        value={specialization}
                        onChange={e => setSpecialization(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="relative group">
                  <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                  <input 
                    type="email" 
                    placeholder="Emailová adresa" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-primary-600 transition-colors" size={18} />
                  <input 
                    type="password" 
                    placeholder="Heslo" 
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-sm font-medium"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 mt-6 disabled:opacity-50"
                >
                  {isLoading ? 'Zpracovávám...' : (isLogin ? 'Přihlásit se' : 'Zaregistrovat se')}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">nebo pokračovat</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <button 
                type="button"
                onClick={() => onLogin({ email: 'google-user@gmail.com', name: 'MUDr. Google User', specialization: 'Praktický lékař' })}
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google účet
              </button>

              <p className="mt-8 text-center text-xs text-slate-400">
                {isLogin ? 'Ještě nemáte účet?' : 'Již máte účet?'} 
                <button onClick={() => setIsLogin(!isLogin)} className="ml-1 text-primary-600 font-bold hover:underline">
                  {isLogin ? 'Zaregistrujte se' : 'Přihlaste se'}
                </button>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
