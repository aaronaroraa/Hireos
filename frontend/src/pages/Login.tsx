import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Briefcase, Users, Bot, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'forgot') {
                // Call the API and let errors bubble up if the backend is down
                await api.post('/auth/forgot-password', { email });
                setResetSent(true);
                setLoading(false);
                return;
            }

            if (mode === 'register') {
                // 1. Register the new account
                await api.post('/auth/register', {
                    name,
                    company_name: companyName,
                    email,
                    password
                });
            }

            // 2. Login (happens for both modes)
            const response = await api.post('/auth/login', {
                email,
                password
            });
            const { access_token, refresh_token } = response.data;

            // Decode the JWT payload to extract user info
            const tokenPayload = JSON.parse(atob(access_token.split('.')[1]));
            const userData = {
                id: tokenPayload.user_id,
                email: tokenPayload.sub,
                name: name || tokenPayload.sub,
                company_id: tokenPayload.company_id,
                role: tokenPayload.role,
            };

            // Store refresh token for session renewal
            if (refresh_token) {
                localStorage.setItem('refresh_token', refresh_token);
            }

            login(access_token, userData);
            window.location.href = '/dashboard';
        } catch (err: any) {
            let errorMessage = 'Authentication failed. Please check your details.';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                } else if (Array.isArray(err.response.data.detail) && err.response.data.detail.length > 0) {
                    errorMessage = err.response.data.detail[0].msg || errorMessage;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left Column: Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-sm mx-auto my-auto"
                >
                    <div className="flex items-center space-x-2 mb-10">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-btn-3d">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-display font-bold text-slate-900 tracking-tight">Recruitment OS</span>
                    </div>

                    <h1 className="text-4xl font-display font-black text-slate-900 mb-2 text-glow">
                        {mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset password' : 'Create your account'}
                    </h1>
                    <p className="text-slate-500 mb-8">
                        {mode === 'login'
                            ? 'Sign in to your account to manage your hiring pipeline.'
                            : mode === 'forgot'
                                ? "Enter your email and we'll send you instructions to reset your password."
                                : 'Join thousands of companies automating their hiring process.'}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 overflow-hidden"
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {mode === 'register' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white placeholder-slate-400"
                                        placeholder="Jane Doe"
                                        required={mode === 'register'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white placeholder-slate-400"
                                        placeholder="Acme Corp"
                                        required={mode === 'register'}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {resetSent ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-4">
                                <div className="bg-brand-50 text-brand-600 p-4 rounded-xl text-sm font-medium">
                                    We've sent a password reset link to <br /> <span className="font-bold">{email}</span>.
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setResetSent(false); }}
                                    className="text-brand-600 font-medium hover:text-brand-500 text-sm"
                                >
                                    Return to sign in
                                </button>
                            </motion.div>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none bg-white placeholder-slate-400"
                                        placeholder="you@company.com"
                                        required
                                    />
                                </div>

                                {mode !== 'forgot' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-slate-700">Password</label>
                                            {mode === 'login' && (
                                                <button type="button" onClick={() => setMode('forgot')} className="text-sm font-medium text-brand-600 hover:text-brand-500">Forgot password?</button>
                                            )}
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none bg-white placeholder-slate-400"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-3d w-full flex items-center justify-center py-3.5 px-4 mt-6"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create Account')}
                                </button>
                            </>
                        )}
                    </form>

                    {mode !== 'forgot' && (
                        <div className="mt-8 text-center pt-6 border-t border-slate-200/60">
                            <p className="text-sm text-slate-500">
                                {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => {
                                        setMode(mode === 'login' ? 'register' : 'login');
                                        setError('');
                                    }}
                                    type="button"
                                    className="font-medium text-brand-600 hover:text-brand-500 focus:outline-none ml-1"
                                >
                                    {mode === 'login' ? 'Request access' : 'Sign in instead'}
                                    <ArrowRight className="inline w-4 h-4 ml-0.5" />
                                </button>
                            </p>
                        </div>
                    )}
                    {mode === 'forgot' && (
                        <div className="mt-8 text-center pt-6 border-t border-slate-200/60">
                            <button
                                onClick={() => { setMode('login'); setError(''); setResetSent(false); }}
                                type="button"
                                className="flex items-center justify-center font-medium text-brand-600 hover:text-brand-500 focus:outline-none w-full"
                            >
                                <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                                Back to sign in
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Right Column: Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center fixed right-0 top-0 bottom-0">
                {/* Decorative blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                </div>

                <div className="relative z-10 px-12 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h2 className="text-4xl font-display font-medium text-white leading-tight mb-6">
                            Automate your hiring lifecycle with advanced AI.
                        </h2>

                        <div className="space-y-6">
                            {[
                                { icon: Bot, title: 'AI-Generated JDs', desc: 'Create perfect, highly-optimized job descriptions in seconds.' },
                                { icon: Users, title: 'Intelligent Parsing', desc: 'Automatically extract skills and rank incoming candidates.' },
                                { icon: Briefcase, title: 'Automated Assessments', desc: 'Technical pipelines completely automated.' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                                    className="glass-panel p-5 rounded-2xl flex items-start space-x-4 border border-white/10"
                                >
                                    <div className="bg-brand-500/20 p-3 rounded-xl border border-brand-400/20">
                                        <feature.icon className="w-6 h-6 text-brand-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                                        <p className="text-slate-300 text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
