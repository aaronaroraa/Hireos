import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Briefcase, Users, Bot, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
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
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-display font-bold text-slate-900 tracking-tight">Recruitment OS</span>
                    </div>

                    <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-slate-500 mb-8">
                        {mode === 'login'
                            ? 'Sign in to your account to manage your hiring pipeline.'
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white placeholder-slate-400"
                                placeholder="you@company.com"
                                required
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Password</label>
                                {mode === 'login' && (
                                    <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                                )}
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white placeholder-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 mt-4 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'Sign in' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-200/60">
                        <p className="text-sm text-slate-500">
                            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setError('');
                                }}
                                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
                            >
                                {mode === 'login' ? 'Request access' : 'Sign in instead'}
                                <ArrowRight className="inline w-4 h-4 ml-0.5" />
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Right Column: Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 items-center justify-center fixed right-0 top-0 bottom-0">
                {/* Decorative blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
                    <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" style={{ animationDelay: '2s' }} />
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
                                    className="flex items-start space-x-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                                >
                                    <div className="bg-indigo-500/20 p-3 rounded-lg">
                                        <feature.icon className="w-6 h-6 text-indigo-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium mb-1">{feature.title}</h3>
                                        <p className="text-indigo-200 text-sm leading-relaxed">{feature.desc}</p>
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
