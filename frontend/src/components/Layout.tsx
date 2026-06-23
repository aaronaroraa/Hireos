import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Settings, UploadCloud } from 'lucide-react';
import { Outlet, NavLink } from 'react-router-dom';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/bulk-hire', icon: UploadCloud, label: 'Bulk Hire' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="flex h-screen bg-white font-sans overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 border-r border-gray-200 flex flex-col h-full">
                {/* Logo */}
                <div className="px-6 py-6 border-b border-gray-200">
                    <span className="text-lg font-display font-bold text-black tracking-tight">HireOS</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                                    isActive
                                        ? 'bg-black text-white'
                                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                                }`
                            }
                        >
                            <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User footer */}
                <div className="px-4 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-black truncate">{user?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto px-8 py-8 hide-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
};
