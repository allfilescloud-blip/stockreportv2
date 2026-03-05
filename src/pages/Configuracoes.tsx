import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Info, MapPin, Database as DatabaseIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../db/firebase';
import { useTheme } from '../contexts/ThemeContext';

import { UserManagement } from '../components/settings/UserManagement';
import { LocationSettings } from '../components/settings/LocationSettings';
import { DatabaseTools } from '../components/settings/DatabaseTools';

interface NotificationSettings {
    lowStock: boolean;
    lowStockThreshold: number;
    newReports: boolean;
    pendingAccess: boolean;
    emailAlerts: boolean;
}

const Configuracoes = () => {
    const { user, isAdmin, allowRegistration } = useAuth();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('Geral');

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

    const sections = [
        { id: 'Geral', title: 'Conta', icon: User, description: 'Gerencie suas informações de perfil e senha' },
        { id: 'Notificações', title: 'Notificações', icon: Bell, description: 'Configure alertas de estoque baixo e novos relatórios' },
        { id: 'Locais', title: 'Locais de Estoque', icon: MapPin, description: 'Gerencie depósitos e prateleiras', adminOnly: true },
        { id: 'Database', title: 'Banco de Dados', icon: DatabaseIcon, description: 'Exportar dados, limpar cache e backups', adminOnly: true },
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
                                <section.icon size={22} className={activeTab === section.id ? 'text-white' : 'group-hover:text-blue-400'} />
                                <span className={`font-bold ${activeTab === section.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{section.title}</span>
                            </button>
                        )
                    ))}
                </div>

                {/* Conteúdo da Aba */}
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'Geral' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white uppercase shadow-xl rotate-3 transform transition-transform hover:rotate-0">
                                    {user?.email?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-slate-900 dark:text-white font-bold text-2xl tracking-tight">{user?.email}</p>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase mt-2 ${isAdmin ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        <Shield size={12} />
                                        {isAdmin ? 'Administrador' : 'Usuário Padrão'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid gap-4 max-w-md">
                                <div className="p-4 bg-slate-100/30 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700 rounded-2xl mb-2">
                                    <h3 className="text-slate-900 dark:text-white font-bold mb-3 flex items-center gap-2">
                                        Tema do Sistema
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button onClick={() => setTheme('light')} className={`py-2 rounded-xl text-sm font-bold border transition-all ${theme === 'light' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:bg-slate-700'}`}>Claro</button>
                                        <button onClick={() => setTheme('dark')} className={`py-2 rounded-xl text-sm font-bold border transition-all ${theme === 'dark' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:bg-slate-700'}`}>Escuro</button>
                                        <button onClick={() => setTheme('system')} className={`py-2 rounded-xl text-sm font-bold border transition-all ${theme === 'system' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-200 dark:bg-slate-700'}`}>Sistema</button>
                                    </div>
                                </div>
                                <button className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-all border border-slate-300 dark:border-slate-700">Alterar Senha</button>
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

                    {activeTab === 'Locais' && isAdmin && (
                        <LocationSettings />
                    )}

                    {activeTab === 'Acessos' && isAdmin && (
                        <UserManagement initialAllowReg={allowRegistration} />
                    )}

                    {activeTab === 'Database' && isAdmin && (
                        <DatabaseTools />
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
