import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Database, Info, Check, X, UserPlus, UserCheck, ShieldCheck, Loader2, Download, Upload, Trash2, AlertCircle, History as HistoryIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../db/firebase';

interface PendingUser {
    id: string;
    email: string;
    createdAt: string;
}

interface NotificationSettings {
    lowStock: boolean;
    lowStockThreshold: number;
    newReports: boolean;
    pendingAccess: boolean;
    emailAlerts: boolean;
}

const Configuracoes = () => {
    const { user, isAdmin, allowRegistration: initialAllowReg } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [allowRegistration, setAllowRegistration] = useState(initialAllowReg);
    const [activeTab, setActiveTab] = useState('Geral');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [purgeDays, setPurgeDays] = useState(90);

    useEffect(() => {
        if (isAdmin) {
            const q = query(collection(db, 'users'), where('approved', '==', false));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const users = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as PendingUser[];
                setPendingUsers(users);
            });

            // Sincronizar toggle com Firestore
            const loadSettings = async () => {
                const settingsDoc = await getDoc(doc(db, 'settings', 'auth'));
                if (settingsDoc.exists()) {
                    setAllowRegistration(settingsDoc.data().allowRegistration !== false);
                }
            };
            loadSettings();

            return () => unsubscribe();
        }
    }, [isAdmin]);

    const handleToggleRegistration = async () => {
        const newValue = !allowRegistration;
        setAllowRegistration(newValue);
        try {
            await setDoc(doc(db, 'settings', 'auth'), { allowRegistration: newValue }, { merge: true });
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            setAllowRegistration(!newValue);
        }
    };

    const handleApprove = async (userId: string) => {
        setLoadingAction(userId);
        try {
            await updateDoc(doc(db, 'users', userId), { approved: true });
        } catch (error) {
            console.error('Erro ao aprovar usuário:', error);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este pedido de acesso?')) return;
        setLoadingAction(userId);
        try {
            await deleteDoc(doc(db, 'users', userId));
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
        } finally {
            setLoadingAction(null);
        }
    };

    const [notifications, setNotifications] = useState<NotificationSettings>({
        lowStock: true,
        lowStockThreshold: 5,
        newReports: true,
        pendingAccess: true,
        emailAlerts: false
    });

    useEffect(() => {
        if (user) {
            const loadUserNotifications = async () => {
                const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
                if (settingsDoc.exists()) {
                    setNotifications(prev => ({ ...prev, ...settingsDoc.data() as NotificationSettings }));
                }
            };
            loadUserNotifications();
        }
    }, [user]);

    const updateNotification = async (key: string, value: any) => {
        if (!user) return;
        const newSettings = { ...notifications, [key]: value };
        setNotifications(newSettings);
        try {
            await setDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), newSettings, { merge: true });
        } catch (error) {
            console.error('Erro ao salvar notificações:', error);
        }
    };

    const handleExportBackup = async () => {
        setIsExporting(true);
        try {
            const collections = ['products', 'reports', 'users', 'settings'];
            const backupData: any = {};

            for (const colName of collections) {
                const snapshot = await getDocs(collection(db, colName));
                backupData[colName] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_stockreport_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Erro ao exportar backup:', error);
            alert('Erro ao exportar backup.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('Atenção: A importação pode sobrescrever dados existentes. Deseja continuar?')) {
            event.target.value = '';
            return;
        }

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const json = JSON.parse(e.target?.result as string);

                for (const colName in json) {
                    const docs = json[colName];
                    for (const docData of docs) {
                        const { id, ...data } = docData;
                        await setDoc(doc(db, colName, id), data, { merge: true });
                    }
                }
                alert('Importação concluída com sucesso!');
                window.location.reload();
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Erro ao importar backup:', error);
            alert('Erro ao importar backup. Verifique o formato do arquivo.');
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    const handlePurgeData = async (type: 'reports' | 'history') => {
        const msg = type === 'reports'
            ? `Tem certeza que deseja deletar RELATÓRIOS com mais de ${purgeDays} dias? Esta ação é irreversível.`
            : `Tem certeza que deseja limpar o HISTÓRICO DE PRODUTOS com mais de ${purgeDays} dias? Esta ação é irreversível.`;

        if (!window.confirm(msg)) return;

        setIsPurging(true);
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - purgeDays);

            if (type === 'reports') {
                const snapshot = await getDocs(collection(db, 'reports'));
                let deletedCount = 0;

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;

                    if (createdAt && createdAt < cutoffDate) {
                        await deleteDoc(doc(db, 'reports', docSnap.id));
                        deletedCount++;
                    }
                }
                alert(`${deletedCount} relatórios antigos foram removidos.`);
            } else {
                const snapshot = await getDocs(collection(db, 'products'));
                let updatedCount = 0;

                for (const docSnap of snapshot.docs) {
                    const data = docSnap.data();
                    if (!data.history || !Array.isArray(data.history)) continue;

                    const originalLength = data.history.length;
                    const newHistory = data.history.filter((entry: any) => {
                        const entryDate = new Date(entry.date);
                        return entryDate >= cutoffDate;
                    });

                    if (newHistory.length < originalLength) {
                        await updateDoc(doc(db, 'products', docSnap.id), {
                            history: newHistory
                        });
                        updatedCount++;
                    }
                }
                alert(`Histórico limpo em ${updatedCount} produtos.`);
            }
        } catch (error) {
            console.error('Erro na limpeza de dados:', error);
            alert('Erro ao processar limpeza.');
        } finally {
            setIsPurging(false);
        }
    };

    const sections = [
        { id: 'Geral', title: 'Conta', icon: User, description: 'Gerencie suas informações de perfil e senha' },
        { id: 'Notificações', title: 'Notificações', icon: Bell, description: 'Configure alertas de estoque baixo e novos relatórios' },
        { id: 'Database', title: 'Banco de Dados', icon: Database, description: 'Exportar dados, limpar cache e backups', adminOnly: true },
        { id: 'Acessos', title: 'Segurança e Acessos', icon: Shield, description: 'Gerenciar permissões e novos cadastros', adminOnly: true },
        { id: 'Sobre', title: 'Sobre o Sistema', icon: Info, description: 'Versão 1.1.0 - StockReport Intelligence' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <SettingsIcon size={32} className="text-blue-500" />
                    Configurações
                </h1>
                <p className="text-slate-400">Personalize sua experiência e gerencie o sistema</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar de Abas */}
                <div className="lg:col-span-1 space-y-2">
                    {sections.map((section) => (
                        (!section.adminOnly || isAdmin) && (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${activeTab === section.id
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:border-slate-700'
                                    }`}
                            >
                                <section.icon size={22} className={activeTab === section.id ? 'text-white' : 'group-hover:text-blue-400'} />
                                <span className={`font-bold ${activeTab === section.id ? 'text-white' : 'text-slate-300'}`}>{section.title}</span>
                            </button>
                        )
                    ))}
                </div>

                {/* Conteúdo da Aba */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'Geral' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white uppercase shadow-xl rotate-3 transform transition-transform hover:rotate-0">
                                    {user?.email?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-white font-bold text-2xl tracking-tight">{user?.email}</p>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase mt-2 ${isAdmin ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <Shield size={12} />
                                        {isAdmin ? 'Administrador' : 'Usuário Padrão'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid gap-4 max-w-md">
                                <button className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700">Alterar Senha</button>
                                <button
                                    onClick={() => auth.signOut()}
                                    className="w-full py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-bold transition-all border border-red-500/20"
                                >
                                    Sair da Conta
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Notificações' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Bell className="text-blue-500" size={24} />
                                    Alertas do Sistema
                                </h2>

                                <div className="space-y-8">
                                    {/* Alerta de Estoque Baixo */}
                                    <div className="flex flex-col gap-4 p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                                                    <Database size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold">Estoque Baixo</h3>
                                                    <p className="text-slate-400 text-sm">Receba alertas quando produtos atingirem o limite</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => updateNotification('lowStock', !notifications.lowStock)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${notifications.lowStock ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'}`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                            </button>
                                        </div>

                                        {notifications.lowStock && (
                                            <div className="flex items-center gap-4 pl-12 animate-in slide-in-from-top-2 duration-200">
                                                <span className="text-sm text-slate-400">Notificar quando menor que:</span>
                                                <input
                                                    type="number"
                                                    value={notifications.lowStockThreshold}
                                                    onChange={(e) => updateNotification('lowStockThreshold', parseInt(e.target.value))}
                                                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-500 italic">unidades</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Novos Relatórios */}
                                    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                                <Check size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">Novos Relatórios</h3>
                                                <p className="text-slate-400 text-sm">Alertar quando um novo relatório for finalizado</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateNotification('newReports', !notifications.newReports)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${notifications.newReports ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                        </button>
                                    </div>

                                    {/* Acessos Pendentes (Admin Only) */}
                                    {isAdmin && (
                                        <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                                                    <UserPlus size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold">Acessos Pendentes</h3>
                                                    <p className="text-slate-400 text-sm">Notificar sobre novos pedidos de cadastro</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => updateNotification('pendingAccess', !notifications.pendingAccess)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${notifications.pendingAccess ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'}`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Notificações por E-mail */}
                                    <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                                                <X size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">Alertas por E-mail</h3>
                                                <p className="text-slate-400 text-sm">Receber um resumo diário em sua caixa de entrada</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => updateNotification('emailAlerts', !notifications.emailAlerts)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center ${notifications.emailAlerts ? 'bg-blue-600 justify-end' : 'bg-slate-700 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Acessos' && isAdmin && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Toggle de Registro */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                        <UserPlus size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">Novos Cadastros</h3>
                                        <p className="text-slate-400 text-sm">Permitir que novos usuários se cadastrem na tela de login</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggleRegistration}
                                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 flex items-center ${allowRegistration ? 'bg-blue-600 justify-end' : 'bg-slate-800 justify-start'}`}
                                >
                                    <div className="w-6 h-6 bg-white rounded-full shadow-md" />
                                </button>
                            </div>

                            {/* Lista de Espera */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <ShieldCheck size={20} className="text-amber-500" />
                                        Aprovações Pendentes
                                    </h3>
                                    <span className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-xs font-bold uppercase">{pendingUsers.length} Aguardando</span>
                                </div>
                                <div className="divide-y divide-slate-800">
                                    {pendingUsers.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500">
                                                <UserCheck size={32} />
                                            </div>
                                            <p className="text-slate-500 font-medium">Nenhum usuário aguardando aprovação.</p>
                                        </div>
                                    ) : (
                                        pendingUsers.map((u: PendingUser) => (
                                            <div key={u.id} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold">
                                                        {u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{u.email}</p>
                                                        <p className="text-slate-500 text-xs">Cadastrado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleApprove(u.id)}
                                                        disabled={loadingAction === u.id}
                                                        className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-500/20 disabled:opacity-50"
                                                        title="Aprovar"
                                                    >
                                                        {loadingAction === u.id ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(u.id)}
                                                        disabled={loadingAction === u.id}
                                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 disabled:opacity-50"
                                                        title="Recusar"
                                                    >
                                                        {loadingAction === u.id ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Database' && isAdmin && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Backup Section */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Database className="text-blue-500" size={24} />
                                    Backup do Sistema
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all group">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                                                <Download size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">Exportar Dados</h3>
                                                <p className="text-slate-400 text-xs">Baixar backup completo em JSON</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleExportBackup}
                                            disabled={isExporting}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                            {isExporting ? 'Exportando...' : 'Fazer Download'}
                                        </button>
                                    </div>

                                    <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-all group">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                                <Upload size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">Importar Dados</h3>
                                                <p className="text-slate-400 text-xs">Restaurar de um arquivo JSON</p>
                                            </div>
                                        </div>
                                        <label className="cursor-pointer">
                                            <div className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 text-center flex items-center justify-center gap-2">
                                                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                                {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
                                            </div>
                                            <input
                                                type="file"
                                                accept=".json"
                                                className="hidden"
                                                onChange={handleImportBackup}
                                                disabled={isImporting}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Storage Policy */}
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <Trash2 className="text-red-500" size={24} />
                                    <h2 className="text-xl font-bold text-white">Política de Retenção</h2>
                                </div>

                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-8 flex items-start gap-4 text-amber-500">
                                    <AlertCircle size={24} className="shrink-0" />
                                    <p className="text-sm">
                                        Estas ações deletam permanentemente registros antigos para liberar espaço e melhorar a performance. Recomenda-se fazer um backup antes de prosseguir.
                                    </p>
                                </div>

                                <div className="grid gap-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-800/30 rounded-2xl border border-slate-800">
                                        <div>
                                            <h3 className="text-white font-bold">Período de Retenção</h3>
                                            <p className="text-slate-400 text-sm">Manter dados dos últimos:</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={purgeDays}
                                                onChange={(e) => setPurgeDays(Number(e.target.value))}
                                                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                                            >
                                                <option value={30}>30 Dias</option>
                                                <option value={90}>90 Dias</option>
                                                <option value={180}>180 Dias</option>
                                                <option value={365}>1 Ano</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => handlePurgeData('reports')}
                                            disabled={isPurging}
                                            className="p-4 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-300 hover:text-red-400 rounded-2xl transition-all flex flex-col items-center gap-2 text-center group disabled:opacity-50"
                                        >
                                            <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
                                            <div>
                                                <p className="font-bold text-sm">Limpar Relatórios</p>
                                                <p className="text-[10px] opacity-60">Filtra coleções de Inventário/Testados/Entregas</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handlePurgeData('history')}
                                            disabled={isPurging}
                                            className="p-4 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 text-slate-300 hover:text-red-400 rounded-2xl transition-all flex flex-col items-center gap-2 text-center group disabled:opacity-50"
                                        >
                                            <HistoryIcon size={24} className="group-hover:scale-110 transition-transform" />
                                            <div>
                                                <p className="font-bold text-sm">Limpar Histórico</p>
                                                <p className="text-[10px] opacity-60">Remove logs antigos dentro dos produtos</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Sobre' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center animate-in fade-in slide-in-from-right-4 duration-300">
                            <Info size={48} className="text-blue-500 mx-auto mb-4 opacity-20" />
                            <h2 className="text-2xl font-bold text-white mb-2">StockReport Intelligence</h2>
                            <p className="text-slate-400 mb-6 font-medium">Versão 1.1.0 (PRO)</p>
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 text-left text-sm text-slate-400">
                                    Sistema avançado de gestão de estoque e auditoria desenvolvido com React e Firebase.
                                </div>
                                <p className="text-xs text-slate-500 italic">© 2026 Todos os direitos reservados.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Configuracoes;
