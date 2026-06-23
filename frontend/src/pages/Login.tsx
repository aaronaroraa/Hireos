import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Sparkles, Briefcase, Users, Bot, Loader2, Zap, Shield, BarChart3, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleDemoLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/demo-login');
            const { access_token, refresh_token, user } = response.data;

            // Store refresh token for session renewal
            if (refresh_token) {
                localStorage.setItem('refresh_token', refresh_token);
            }

            login(access_token, {
                id: user.id,
                email: user.email,
                name: user.name,
                company_id: user.company_id,
            });
            window.location.href = '/dashboard';
        } catch (err: any) {
            let errorMessage = 'Unable to connect. The server may be waking up — please try again in 30 seconds.';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: Bot, title: 'AI-Generated JDs', desc: 'Create optimized job descriptions in seconds with GPT.' },
        { icon: Users, title: 'Smart Resume Parsing', desc: 'Auto-extract skills, experience & rank candidates.' },
        { icon: Briefcase, title: 'Automated Assessments', desc: 'AI-personalized coding tests sent automatically.' },
        { icon: BarChart3, title: 'Real-time Analytics', desc: 'Live dashboards with pipeline and hiring metrics.' },
        { icon: Zap, title: 'Bulk Processing', desc: 'Upload 1000+ candidates via CSV and process in seconds.' },
        { icon: Shield, title: 'Proctored Testing', desc: 'Webcam monitoring, tab-switch detection, and sandboxing.' },
    ];

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans">
            {/* Left Column: Hero + CTA */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-md mx-auto my-auto"
                >
                    {/* Logo */}
                    <div className="flex items-center space-x-2 mb-10">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-btn-3d">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-display font-bold text-slate-900 tracking-tight">Recruitment OS</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl font-display font-black text-slate-900 mb-3 text-glow leading-tight">
                        AI-Powered Hiring,<br />Fully Automated.
                    </h1>
                    <p className="text-slate-500 mb-8 text-lg leading-relaxed">
                        From job posting to offer letter — experience the future of recruitment with our intelligent platform.
                    </p>

                    {/* Demo Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <button
                            onClick={handleDemoLogin}
                            disabled={loading}
                            id="demo-login-btn"
                            className="btn-3d w-full flex items-center justify-center py-4 px-6 text-base font-semibold group"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Preparing your workspace...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Enter Live Demo
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>

                        <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                            No sign-up needed · Instant access · Full admin privileges
                        </p>
                    </motion.div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 bg-amber-50 text-amber-700 p-3.5 rounded-xl text-sm font-medium border border-amber-200 overflow-hidden"
                        >
                            <p className="font-semibold mb-1">⏳ Server is waking up</p>
                            <p className="text-amber-600 text-xs">{error}</p>
                        </motion.div>
                    )}

                    {/* Mini Feature Grid */}
                    <div className="mt-10 pt-8 border-t border-slate-200/60">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What you'll explore</p>
                        <div className="grid grid-cols-2 gap-3">
                            {features.map((f, i) => (
                                <motion.div
                                    key={f.title}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.4 + i * 0.06 }}
                                    className="flex items-start space-x-2.5 p-2.5 rounded-lg hover:bg-slate-100/60 transition-colors"
                                >
                                    <f.icon className="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">{f.title}</p>
                                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{f.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Column: Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center fixed right-0 top-0 bottom-0">
                {/* Decorative blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob" />
                    <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
                </div>

                <div className="relative z-10 px-12 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="mb-8">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/20 text-brand-300 text-xs font-semibold mb-4">
                                <Zap className="w-3 h-3 mr-1.5" />
                                LIVE DEMO
                            </span>
                            <h2 className="text-4xl font-display font-medium text-white leading-tight mb-4">
                                Automate your entire hiring lifecycle with AI.
                            </h2>
                            <p className="text-slate-400 leading-relaxed">
                                Recruitment OS handles job descriptions, resume screening, candidate scoring, and assessments — so you can focus on hiring the best talent.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { icon: Bot, title: 'AI-Generated JDs', desc: 'Create perfect, highly-optimized job descriptions in seconds.' },
                                { icon: Users, title: 'Intelligent Parsing', desc: 'Automatically extract skills and rank incoming candidates.' },
                                { icon: Briefcase, title: 'Automated Assessments', desc: 'Technical pipelines completely automated with proctoring.' },
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

                        {/* Social proof */}
                        <div className="mt-8 flex items-center space-x-4">
                            <div className="flex -space-x-2">
                                {['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'].map((c, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>
                                        {['A', 'S', 'M', 'R'][i]}
                                    </div>
                                ))}
                            </div>
                            <p className="text-slate-400 text-sm">
                                <span className="text-white font-medium">500+</span> companies automating hiring
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
