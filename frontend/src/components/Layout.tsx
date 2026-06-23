import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Hexagon, LayoutDashboard, Briefcase, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Outlet, NavLink } from 'react-router-dom';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Hiring Workspace' },
        { to: '/jobs', icon: Briefcase, label: 'Jobs' },
        { to: '/candidates', icon: Users, label: 'Candidates' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden bg-grid-slate-100 relative">

            {/* Ambient Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-400/20 blur-[120px] mix-blend-multiply animate-blob pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-400/20 blur-[120px] mix-blend-multiply animate-blob animation-delay-2000 pointer-events-none" />

            {/* Floating Premium Sidebar */}
            <div className="p-4 md:p-6 h-full z-20">
                <motion.div
                    initial={{ x: -250, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
                    className="w-64 bg-slate-900/95 backdrop-blur-3xl text-slate-300 flex flex-col h-full rounded-[2rem] border border-white/10 shadow-3d overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-center space-x-3 text-white mb-8">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                                <Hexagon className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-display font-bold tracking-tight text-glow">Recruit OS</span>
                        </div>

                        <nav className="space-y-2 flex-1">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-3.5 rounded-2xl font-medium transition-all duration-300 ${isActive
                                            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md border border-brand-400/30 translate-x-1'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`
                                    }
                                >
                                    <item.icon className={`w-5 h-5 mr-3 ${/* eslint-disable-next-line @typescript-eslint/no-explicit-any */ (isActive: any) => isActive ? 'text-white' : 'text-slate-500'}`} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* User Profile Footer */}
                    <div className="p-4 mt-auto border-t border-white/10 bg-black/20 backdrop-blur-sm m-3 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center overflow-hidden">
                                <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-sm flex-shrink-0">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="ml-3 min-w-0 pr-2">
                                    <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-brand-300/80 truncate">{user?.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-200 flex-shrink-0"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 hide-scrollbar"
                >
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
