import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Hexagon, LayoutDashboard, Briefcase, Users, Settings, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Outlet, NavLink } from 'react-router-dom';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/jobs', icon: Briefcase, label: 'Jobs' },
        { to: '/bulk-upload', icon: Zap, label: 'Bulk Hire' },
        { to: '/candidates', icon: Users, label: 'Candidates' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Premium Sidebar */}
            <motion.div
                initial={{ x: -250 }}
                animate={{ x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 relative z-20"
            >
                <div className="p-6">
                    <div className="flex items-center space-x-3 text-white mb-8">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                            <Hexagon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-display font-bold tracking-tight">Recruit OS</span>
                    </div>

                    <nav className="space-y-1.5 flex-1">
                        {navItems.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `flex items-center px-4 py-3 rounded-xl font-medium transition-colors ${isActive
                                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                {/* User Profile Footer */}
                <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-2 py-2">
                        <div className="flex items-center overflow-hidden">
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="ml-3 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0"
                            title="Sign out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Top decorative gradient line */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 absolute top-0 left-0 z-50"></div>

                {/* Main Content Scrollable */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 hide-scrollbar"
                >
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
