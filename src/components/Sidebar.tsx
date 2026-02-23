import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ClipboardList,
    Settings,
    LogOut,
    ChevronRight,
    Truck,
    CheckCircle,
    Menu,
    X
} from 'lucide-react';
import { auth } from '../db/firebase';

const Sidebar = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Produtos', path: '/produtos', icon: Package },
        { name: 'Inventário', path: '/inventario', icon: ClipboardList },
        { name: 'Testados', path: '/testados', icon: CheckCircle },
        { name: 'Entregas', path: '/entregas', icon: Truck },
        { name: 'Configurações', path: '/configuracoes', icon: Settings },
    ];

    return (
        <>
            {/* Overlay para mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <button
                className="fixed top-4 right-4 z-50 p-2 bg-slate-800 text-white rounded-md lg:hidden shadow-lg border border-slate-700"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className={`fixed inset-y-0 right-0 z-40 w-64 bg-slate-950 border-l lg:border-r lg:border-l-0 border-slate-800 text-white transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-2xl lg:shadow-none`}>
                <div className="flex flex-col h-full">
                    <div className="p-8">
                        <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                            STOCK<span className="text-white/50 font-light text-lg ml-0.5">REPORT</span>
                        </h1>
                    </div>

                    <nav className="flex-1 px-4 space-y-1.5">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                                className={`flex items-center space-x-3 p-3.5 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                                    ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/30'
                                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} className={location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} />
                                <span className="font-bold text-sm tracking-wide">{item.name}</span>
                                {location.pathname === item.path && <ChevronRight size={16} className="ml-auto opacity-70" />}
                            </Link>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
                        <button
                            onClick={() => auth.signOut()}
                            className="flex items-center space-x-3 w-full p-3.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all group"
                        >
                            <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                            <span className="font-bold text-sm">Sair do Sistema</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
