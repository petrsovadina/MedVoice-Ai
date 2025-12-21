import React, { useEffect, useState } from 'react';
import { dbService, SessionMetadata, SessionData } from '../services/dbService';
import { storageService } from '../services/storageService';
import { Clock, Calendar, Search, ChevronRight, FileText, User, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HistoryDashboardProps {
    onLoadSession: (sessionId: string) => Promise<void>;
    onNewSession: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ onLoadSession, onNewSession }) => {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<SessionMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingId, setLoadingId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadSessions();
        }
    }, [user]);

    const loadSessions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await dbService.getUserSessions(user.uid);
            setSessions(data);
        } catch (error) {
            console.error("Failed to load sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = async (id: string) => {
        setLoadingId(id);
        await onLoadSession(id);
        setLoadingId(null);
    };

    const handleDelete = async (e: React.MouseEvent, session: SessionMetadata) => {
        e.stopPropagation();
        if (!window.confirm('Opravdu chcete smazat tento záznam? Tato akce je nevratná.')) return;

        try {
            await dbService.deleteSession(session.id);
            if (user) {
                await storageService.deleteSessionAudio(user.uid, session.id);
            }
            setSessions(prev => prev.filter(s => s.id !== session.id));
        } catch (error) {
            console.error("Failed to delete session", error);
            alert("Nepodařilo se smazat záznam.");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('cs-CZ', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const filteredSessions = sessions.filter(s =>
        (s.previewSummary?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (s.patientId?.includes(searchTerm)) ||
        (formatDate(s.createdAt).includes(searchTerm))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="animate-spin text-primary-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Clock className="text-primary-600" />
                        Historie Vyšetření
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Seznam všech uložených záznamů a pacientů ({sessions.length})
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Hledat (RČ, text, datum)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={onNewSession}
                        className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all active:scale-95"
                    >
                        <ArrowRight size={16} /> Nové Vyšetření
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredSessions.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Search size={32} />
                        </div>
                        <h3 className="text-slate-900 font-bold mb-1">Žádné záznamy nenalezeny</h3>
                        <p className="text-slate-400 text-sm">Zkuste změnit vyhledávání nebo začněte nové vyšetření.</p>
                    </div>
                ) : (
                    filteredSessions.map(session => (
                        <div key={session.id} className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-primary-200 nav-item-hover shadow-sm group transition-all">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                            <Calendar size={12} />
                                            {formatDate(session.createdAt)}
                                        </div>
                                        {session.patientId && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                                <User size={12} />
                                                {session.patientId}
                                            </div>
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {session.status === 'completed' ? 'Dokončeno' : 'Rozpracováno'}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-primary-700 transition-colors">
                                        {session.previewSummary || "Bez souhrnu..."}
                                    </h3>
                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">
                                        ID: {session.id}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleDelete(e, session)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Smazat záznam"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleLoad(session.id)}
                                        disabled={loadingId === session.id}
                                        className="px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-primary-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loadingId === session.id ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
                                        Otevřít
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
