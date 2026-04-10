import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../db/firebase';
import { ClipboardList, Clock, Search } from 'lucide-react';

interface SystemLog {
    id: string;
    timestamp: Timestamp;
    userId: string;
    userEmail: string;
    userName: string;
    type: 'report' | 'settings' | 'auth' | 'location';
    action: string;
    details: string;
}

export const SystemLogs = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [displayLimit, setDisplayLimit] = useState(50);

    useEffect(() => {
        const q = query(
            collection(db, 'system_logs'),
            orderBy('timestamp', 'desc'),
            limit(displayLimit)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as SystemLog[];
            setLogs(logsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [displayLimit]);

    const filteredLogs = logs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType;
        const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             log.action.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'report': return 'bg-emerald-500/10 text-emerald-500';
            case 'settings': return 'bg-blue-500/10 text-blue-500';
            case 'auth': return 'bg-purple-500/10 text-purple-500';
            case 'location': return 'bg-amber-500/10 text-amber-500';
            default: return 'bg-slate-500/10 text-slate-500';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Log de Sistema</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Rastreabilidade de ações críticas no sistema</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Buscar nos detalhes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
                            />
                        </div>
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">Todos os Tipos</option>
                            <option value="report">Relatórios</option>
                            <option value="settings">Configurações</option>
                            <option value="auth">Acessos</option>
                            <option value="location">Locais</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                                <th className="px-4 py-3">Data/Hora</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Ação</th>
                                <th className="px-4 py-3">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">Carregando logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">Nenhum registro encontrado.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-sm transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Clock size={14} className="text-slate-400" />
                                                {log.timestamp?.toDate().toLocaleString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                    {log.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">{log.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${getTypeColor(log.type)}`}>
                                                {log.type === 'report' ? 'Relatório' : 
                                                 log.type === 'settings' ? 'Config' : 
                                                 log.type === 'auth' ? 'Acesso' : 'Local'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">
                                            {log.action}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600 dark:text-slate-400 text-xs">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {logs.length >= displayLimit && (
                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => setDisplayLimit(prev => prev + 50)}
                            className="px-6 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold transition-all"
                        >
                            Carregar mais logs
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
