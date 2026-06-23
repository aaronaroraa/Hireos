import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Settings, User, Shield, Bell, Key, Building2, Palette, Globe, Save, Check, Loader2
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    // Profile form
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    // Password form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Notification prefs
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [campaignAlerts, setCampaignAlerts] = useState(true);
    const [weeklyDigest, setWeeklyDigest] = useState(false);

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }, 800);
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'company', label: 'Company', icon: Building2 },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-500 mt-1">Manage your account, security, and preferences.</p>
            </div>

            <div className="flex gap-8">
                {/* Sidebar Tabs */}
                <div className="w-56 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5 mr-3" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 max-w-2xl">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-premium p-8">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">Profile Information</h2>

                                <div className="flex items-center gap-5 mb-8">
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                        {name.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-lg">{name}</p>
                                        <p className="text-slate-500 text-sm">{email}</p>
                                        <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium border border-indigo-100">
                                            {(user as any)?.role || 'Admin'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                        <input
                                            type="text" value={name} onChange={e => setName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="mt-6 flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> :
                                        saved ? <Check className="w-5 h-5 mr-2" /> :
                                            <Save className="w-5 h-5 mr-2" />}
                                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                                </button>
                            </div>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-premium p-8">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">Change Password</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                        <input
                                            type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                        <input
                                            type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="Min 8 chars, uppercase, lowercase, digit"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                        <input
                                            type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    className="mt-6 flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium"
                                >
                                    <Key className="w-5 h-5 mr-2" /> Update Password
                                </button>

                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Active Sessions</h3>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-800">Current Session</p>
                                            <p className="text-xs text-emerald-600 mt-0.5">Active now · Token expires in 30 min</p>
                                        </div>
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
                                    <button
                                        onClick={logout}
                                        className="px-6 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-all font-medium"
                                    >
                                        Sign Out of All Devices
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-premium p-8">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">Notification Preferences</h2>

                                <div className="space-y-5">
                                    {[
                                        { label: 'Email Notifications', desc: 'Receive updates about candidate pipeline changes', checked: emailNotifs, onChange: setEmailNotifs },
                                        { label: 'Campaign Alerts', desc: 'Get notified when bulk hire campaigns complete', checked: campaignAlerts, onChange: setCampaignAlerts },
                                        { label: 'Weekly Digest', desc: 'Summary of hiring activity every Monday', checked: weeklyDigest, onChange: setWeeklyDigest },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                                                <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => item.onChange(!item.checked)}
                                                className={`w-12 h-7 rounded-full relative transition-colors ${item.checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                            >
                                                <span className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${item.checked ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={handleSave} className="mt-6 flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium">
                                    <Save className="w-5 h-5 mr-2" /> Save Preferences
                                </button>
                            </div>
                        )}

                        {/* Company Tab */}
                        {activeTab === 'company' && (
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-premium p-8">
                                <h2 className="text-xl font-semibold text-slate-900 mb-6">Company Details</h2>

                                <div className="flex items-center gap-5 mb-8 p-5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100/50">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md">
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-lg">Your Company</p>
                                        <p className="text-sm text-slate-500">Manage company-wide settings and team access.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Company ID</p>
                                        <p className="text-sm text-slate-800 font-mono">{user?.company_id || '—'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Your Role</p>
                                        <p className="text-sm text-slate-800">{(user as any)?.role || 'Admin'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <p className="text-xs text-slate-500 font-medium mb-1">API & Integrations</p>
                                        <p className="text-sm text-slate-500 italic">Coming soon — webhook configurations, ATS integrations, and API keys.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
