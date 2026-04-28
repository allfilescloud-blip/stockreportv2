import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Info, MapPin, Database as DatabaseIcon, Sliders, AlertTriangle, ClipboardList, Check, UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc, collection, query, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../db/firebase';
import { updateProfile } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';

import { UserManagement } from '../components/settings/UserManagement';
import { LocationSettings } from '../components/settings/LocationSettings';
import { DatabaseTools } from '../components/settings/DatabaseTools';
import { SystemLogs } from '../components/settings/SystemLogs';
import { useSystemLog } from '../hooks/useSystemLog';

interface NotificationSettings {
    lowStock: boolean;
    lowStockThreshold: number;
    newReports: boolean;
    pendingAccess: boolean;
    emailAlerts: boolean;
}

interface GeneralSettings {
    disableDecimals: boolean;
    lockLocation: boolean;
    minDivergence?: number | string;
    maxDivergence?: number | string;
    defaultUnifiedLocationId?: string;
}

interface Location {
    id: string;
    name: string;
}

const Configuracoes = () => {
    const { user, isAdmin, allowRegistration } = useAuth();
    const { theme, setTheme } = useTheme();
    const { logEvent } = useSystemLog();
    const [activeTab, setActiveTab] = useState('Geral');

    const [notifications, setNotifications] = useState<NotificationSettings>({
        lowStock: true,
        lowStockThreshold: 5,
        newReports: true,
        pendingAccess: true,
        emailAlerts: false
    });

    const [generalOptions, setGeneralOptions] = useState<GeneralSettings>({
        disableDecimals: false,
        lockLocation: false,
        minDivergence: '',
        maxDivergence: '',
        defaultUnifiedLocationId: ''
    });

    const [locations, setLocations] = useState<Location[]>([]);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [isSavingName, setIsSavingName] = useState(false);

    useEffect(() => {
        if (user) {
            setNewName(user.displayName || '');
            const loadUserNotifications = async () => {
                const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
                if (settingsDoc.exists()) {
                    setNotifications(prev => ({ ...prev, ...settingsDoc.data() as NotificationSettings }));
                }
            };
            const loadGeneralOptions = async () => {
                const optionsDoc = await getDoc(doc(db, 'settings', 'general'));
                if (optionsDoc.exists()) {
                    setGeneralOptions(prev => ({ ...prev, ...optionsDoc.data() as GeneralSettings }));
                }
            };

            const unsubscribeLocs = onSnapshot(query(collection(db, 'locations')), (snapshot) => {
                const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Location[];
                locs.sort((a, b) => a.name.localeCompare(b.name));
                setLocations(locs);
            });

            loadUserNotifications();
            loadGeneralOptions();
            return () => unsubscribeLocs();
        }
    }, [user]);

    const updateNotification = async (key: string, value: any) => {
        if (!user) return;
        const newSettings = { ...notifications, [key]: value };
        setNotifications(newSettings);
        try {
            await setDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), newSettings, { merge: true });
            await logEvent('settings', 'Alteração de Notificação', `Notificação '${key}' alterada para ${value}`);
            toast.success('Notificações atualizadas!', { id: 'settings-notify' });
        } catch (error) {
            console.error('Erro ao salvar notificações:', error);
            toast.error('Erro ao salvar notificações');
        }
    };

    const updateGeneralOption = async (key: string, value: any) => {
        if (!user) return;
        if (!isAdmin) {
            toast.error('Apenas administradores podem alterar regras do sistema.');
            return;
        }
        const newOptions = { ...generalOptions, [key]: value };
        setGeneralOptions(newOptions);
        try {
            await setDoc(doc(db, 'settings', 'general'), newOptions, { merge: true });
            await logEvent('settings', 'Alteração de Regra', `Regra '${key}' alterada para ${value}`);
            toast.success('Regra do sistema atualizada!', { id: 'settings-general' });
        } catch (error) {
            console.error('Erro ao salvar opções:', error);
            toast.error('Erro ao salvar no banco global');
        }
    };

    const handleUpdateProfile = async () => {
        if (!user) return;
        setIsSavingName(true);
        try {
            // 1. Atualizar no Firebase Auth
            await updateProfile(user, { displayName: newName.trim() || null });
            
            // 2. Atualizar no Firestore (coleção users)
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: newName.trim() || null
            });

            await logEvent('settings', 'Perfil Atualizado', `Nome de exibição alterado para: ${newName || 'E-mail (Padrão)'}`);
            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            toast.error('Erro ao atualizar perfil');
        } finally {
            setIsSavingName(false);
        }
    };

    const sections = [
        { id: 'Geral', title: 'Conta', icon: User, description: 'Gerencie suas informações de perfil e senha' },
        { id: 'Opções', title: 'Opções', icon: Sliders, description: 'Configure o comportamento de campos e regras do sistema' },
        { id: 'Notificações', title: 'Notificações', icon: Bell, description: 'Configure alertas de estoque baixo e novos relatórios' },
        { id: 'Locais', title: 'Locais de Estoque', icon: MapPin, description: 'Gerencie depósitos e prateleiras' },
        { id: 'Database', title: 'Banco de Dados', icon: DatabaseIcon, description: 'Exportar dados, limpar cache e backups', adminOnly: true },
        { id: 'Logs', title: 'Log de Sistema', icon: ClipboardList, description: 'Histórico de ações e alterações' },
        { id: 'Acessos', title: 'Segurança e Acessos', icon: Shield, description: 'Gerenciar permissões e novos cadastros', adminOnly: true },
        { id: 'Sobre', title: 'Sobre o Sistema', icon: Info, description: 'Versão 1.1.0 - StockReport Intelligence' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <SettingsIcon size={32} className="text-blue-500" />
                    Configurações
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Personalize sua experiência e gerencie o sistema</p>
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
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:bg-slate-800/50 hover:border-slate-300 dark:border-slate-700'
                                    }`}
                            >
                                <section.icon size={22} className={activeTab === section.id ? 'text-white' : 'group-hover:text-blue-400 transition-colors'} />
                                <span className={`font-bold ${activeTab === section.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{section.title}</span>
                            </button>
                        )
                    ))}
                </div>

                {/* Conteúdo da Aba */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'Geral' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                            {/* Card de Perfil Principal */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                
                                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                    <div className="relative">
                                        <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-4xl font-black text-white uppercase shadow-2xl rotate-3 transform transition-transform hover:rotate-0">
                                            {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 border-4 border-white dark:border-slate-900 w-8 h-8 rounded-full shadow-lg" title="Online" />
                                    </div>
                                    
                                    <div className="text-center md:text-left">
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                                            {user?.displayName || "Usuário sem Nome"}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                                            {user?.email}
                                        </p>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${isAdmin ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                                <Shield size={14} />
                                                {isAdmin ? 'Administrador' : 'Usuário Padrão'}
                                            </span>
                                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                                                ID: {user?.uid.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Informações Pessoais */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                        <UserCircle size={22} className="text-blue-500" />
                                        Informações Pessoais
                                    </h3>
                                    
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Nome de Exibição</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    placeholder={user?.email || "Seu nome"}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                                />
                                                <button
                                                    onClick={handleUpdateProfile}
                                                    disabled={isSavingName || newName === (user?.displayName || '')}
                                                    className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-sm"
                                                >
                                                    {isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />}
                                                    <span>Salvar</span>
                                                </button>
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-400 italic ml-1">
                                                * Caso vazio, será exibido seu e-mail como padrão.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">E-mail Cadastrado</label>
                                            <div className="w-full bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-slate-500 cursor-not-allowed flex items-center justify-between">
                                                <span className="font-medium">{user?.email}</span>
                                                <Shield size={16} className="opacity-30" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Preferências e Segurança */}
                                <div className="space-y-6">
                                    {/* Tema */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                            <Sliders size={22} className="text-blue-500" />
                                            Preferência de Tema
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'light', label: 'Claro' },
                                                { id: 'dark', label: 'Escuro' },
                                                { id: 'system', label: 'Sistema' }
                                            ].map((t) => (
                                                <button 
                                                    key={t.id}
                                                    onClick={() => setTheme(t.id as any)} 
                                                    className={`py-3 rounded-2xl text-xs font-bold border transition-all ${theme === t.id 
                                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'}`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ações Rápidas */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Ações da Conta</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition-all border border-slate-300 dark:border-slate-700 active:scale-95 text-sm">
                                                Alterar Senha
                                            </button>
                                                <button
                                                    onClick={async () => {
                                                        const confirm = window.confirm("Deseja realmente sair do sistema?");
                                                        if (confirm) {
                                                            await logEvent('auth', 'Logout', 'Usuário saiu do sistema.');
                                                            auth.signOut();
                                                        }
                                                    }}
                                                    className="flex items-center justify-center gap-2 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-bold transition-all border border-red-500/20 active:scale-95 text-sm"
                                                >
                                                    Sair da Conta
                                                </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Opções' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Sliders className="text-blue-500" size={24} />
                                    Opções do Sistema
                                </h2>

                                <div className="space-y-8">
                                    <div className="flex items-center justify-between p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500">
                                                <Sliders size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold">Desativar Quantidades Decimais</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Impede o uso de ponto/vírgula nas telas de registro</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => updateGeneralOption('disableDecimals', !generalOptions.disableDecimals)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer shrink-0 ${generalOptions.disableDecimals ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold">Bloquear Local de Estoque</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Impede alterar o local após iniciar o inventário</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => updateGeneralOption('lockLocation', !generalOptions.lockLocation)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer shrink-0 ${generalOptions.lockLocation ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold">Valores de Divergência (Inventário)</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Limite de diferença aceitável para alertas de conferência</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pl-12">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Mínimo</label>
                                                <input
                                                    type="number"
                                                    value={generalOptions.minDivergence || ''}
                                                    onChange={(e) => updateGeneralOption('minDivergence', e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="Ex: -5"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Máximo</label>
                                                <input
                                                    type="number"
                                                    value={generalOptions.maxDivergence || ''}
                                                    onChange={(e) => updateGeneralOption('maxDivergence', e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="Ex: 5"
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all hover:border-emerald-500/30 group">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold tracking-tight">Local Padrão para Unificações</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Local sugerido automaticamente ao unificar múltiplos inventários</p>
                                            </div>
                                        </div>
                                        <div className="pl-12">
                                            <select
                                                value={generalOptions.defaultUnifiedLocationId || ''}
                                                onChange={(e) => updateGeneralOption('defaultUnifiedLocationId', e.target.value)}
                                                className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            >
                                                <option value="">Nenhum (Seleção manual)</option>
                                                {locations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Notificações' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <Bell className="text-blue-500" size={24} />
                                    Alertas do Sistema
                                </h2>

                                <div className="space-y-8">
                                    {/* Alerta de Estoque Baixo */}
                                    <div className="flex flex-col gap-4 p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                                                    <DatabaseIcon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-slate-900 dark:text-white font-bold">Estoque Baixo</h3>
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Receba alertas quando produtos atingirem o limite</p>
                                                </div>
                                            </div>
                                            <div
                                                onClick={() => updateNotification('lowStock', !notifications.lowStock)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer ${notifications.lowStock ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                            </div>
                                        </div>

                                        {notifications.lowStock && (
                                            <div className="flex items-center gap-4 pl-12 animate-in slide-in-from-top-2 duration-200">
                                                <span className="text-sm text-slate-500 dark:text-slate-400">Notificar quando menor que:</span>
                                                <input
                                                    type="number"
                                                    value={notifications.lowStockThreshold}
                                                    onChange={(e) => updateNotification('lowStockThreshold', parseInt(e.target.value))}
                                                    className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-slate-500 italic">unidades</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Novos Relatórios */}
                                    <div className="flex items-center justify-between p-4 bg-slate-100/30 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                                <Info size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-900 dark:text-white font-bold">Novos Relatórios</h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm">Alertar quando um novo relatório for finalizado</p>
                                            </div>
                                        </div>
                                        <div
                                            onClick={() => updateNotification('newReports', !notifications.newReports)}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer ${notifications.newReports ? 'bg-blue-600 justify-end' : 'bg-slate-200 dark:bg-slate-700 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Locais' && (
                        <LocationSettings />
                    )}

                    {activeTab === 'Acessos' && isAdmin && (
                        <UserManagement initialAllowReg={allowRegistration} />
                    )}

                    {activeTab === 'Database' && isAdmin && (
                        <DatabaseTools />
                    )}

                    {activeTab === 'Logs' && (
                        <SystemLogs />
                    )}

                    {activeTab === 'Sobre' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center animate-in fade-in slide-in-from-right-4 duration-300">
                            <Info size={48} className="text-blue-500 mx-auto mb-4 opacity-20" />
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">StockReport Intelligence</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Versão 1.1.0 (PRO)</p>
                            <div className="max-w-md mx-auto space-y-4">
                                <div className="p-4 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-left text-sm text-slate-500 dark:text-slate-400">
                                    Sistema avançado de gestão de estoque e auditoria desenvolvido com React e Firebase.
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-500 italic">© 2026 Todos os direitos reservados.</p>
                                    <p className="text-xs text-slate-500 italic">Idealizado e desenvolvido por Fabio Xavier</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Configuracoes;
