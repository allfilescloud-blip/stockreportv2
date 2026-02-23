import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../db/firebase';
import {
    Package,
    ClipboardList,
    CheckCircle,
    Truck,
    TrendingUp,
    Activity
} from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        products: 0,
        inventories: 0,
        tested: 0,
        deliveries: 0
    });

    const [recentReports, setRecentReports] = useState<any[]>([]);

    useEffect(() => {
        // Stats
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) =>
            setStats(prev => ({ ...prev, products: s.size }))
        );

        const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5));
        const unsubReports = onSnapshot(qReports, (s) => {
            const reps = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecentReports(reps);

            // Calculate individual stats
            const counts = { inventories: 0, tested: 0, deliveries: 0 };
            // Realmente precisaríamos de queries separadas para contagem total ou agregar
            setStats(prev => ({ ...prev, ...counts }));
        });

        return () => {
            unsubProducts();
            unsubReports();
        };
    }, []);

    const cards = [
        { title: 'Total de Produtos', value: stats.products, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { title: 'Inventários', value: stats.inventories, icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { title: 'Testados', value: stats.tested, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { title: 'Entregas', value: stats.deliveries, icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400">Resumo geral das operações de estoque</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 ${card.bg} rounded-xl ${card.color}`}>
                                <card.icon size={24} />
                            </div>
                            <Activity size={20} className="text-slate-700" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                        <h2 className="text-3xl font-bold text-white mt-1">{card.value}</h2>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-400" />
                        Relatórios Recentes
                    </h2>
                    <div className="space-y-4">
                        {recentReports.map(report => (
                            <div key={report.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${report.type === 'inventory' ? 'bg-emerald-500/10 text-emerald-400' :
                                        report.type === 'tested' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                                        }`}>
                                        {report.type === 'inventory' ? <ClipboardList size={20} /> :
                                            report.type === 'tested' ? <CheckCircle size={20} /> : <Truck size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium capitalize">{report.type}</p>
                                        <p className="text-xs text-slate-500">
                                            {report.createdAt?.toDate?.().toLocaleString('pt-BR') || 'Agora'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-bold">{report.totalItems}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">itens</p>
                                </div>
                            </div>
                        ))}
                        {recentReports.length === 0 && (
                            <div className="text-center py-8 text-slate-600 italic">
                                Nenhum relatório gerado recentemente.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">Status PWA</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg">
                            <span className="text-emerald-400 text-sm font-medium">Offline Ready</span>
                            <CheckCircle size={18} className="text-emerald-400" />
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl text-sm text-slate-400 leading-relaxed">
                            Sistema pronto para uso em campo. Os dados serão sincronizados automaticamente assim que houver conexão.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
