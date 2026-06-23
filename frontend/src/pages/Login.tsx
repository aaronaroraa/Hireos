import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'signup';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const [mode, setMode] = useState<Mode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    // Login fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Signup extra fields
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            if (data.refresh_token) sessionStorage.setItem('refresh_token', data.refresh_token);
            // Fetch user profile
            const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } }).catch(() => null);
            const userData = me?.data ?? { id: '', email, name: email.split('@')[0], company_id: '' };
            login(data.access_token, userData);
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Incorrect email or password.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/register', {
                name,
                email,
                password,
                company_name: company || `${name}'s Company`,
            });
            // Auto-login after signup
            const { data } = await api.post('/auth/login', { email, password });
            if (data.refresh_token) sessionStorage.setItem('refresh_token', data.refresh_token);
            const me = await api.get('/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } }).catch(() => null);
            const userData = me?.data ?? { id: '', email, name, company_id: '' };
            login(data.access_token, userData);
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Could not create account. Try a different email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left: form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-12 lg:px-24">
                <div className="max-w-sm mx-auto w-full">
                    <div className="mb-10">
                        <span className="text-2xl font-display font-bold text-black tracking-tight">HireOS</span>
                    </div>

                    <h1 className="text-2xl font-display font-bold text-black mb-1 tracking-tight">
                        {mode === 'login' ? 'Sign in' : 'Create account'}
                    </h1>
                    <p className="text-gray-400 text-sm mb-8">
                        {mode === 'login'
                            ? 'Enter your credentials to access your workspace.'
                            : 'Set up your company workspace in seconds.'}
                    </p>

                    <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                        {mode === 'signup' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Full Name</label>
                                    <input
                                        required type="text" value={name} onChange={e => setName(e.target.value)}
                                        placeholder="Jane Smith"
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Company Name</label>
                                    <input
                                        type="text" value={company} onChange={e => setCompany(e.target.value)}
                                        placeholder="Acme Inc."
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Email</label>
                            <input
                                required type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Password</label>
                            <div className="relative">
                                <input
                                    required type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder={mode === 'signup' ? 'Min 8 chars, upper, lower, digit' : '••••••••'}
                                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all pr-10"
                                />
                                <button type="button" onClick={() => setShowPass(s => !s)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 border border-gray-200 rounded-xl text-sm text-gray-600 bg-gray-50">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn w-full flex items-center justify-center py-3 text-sm mt-2">
                            {loading
                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
                                : <>{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight className="w-4 h-4 ml-2" /></>
                            }
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                            className="text-black font-semibold hover:underline"
                        >
                            {mode === 'login' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>

            {/* Right: feature list */}
            <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-center px-16">
                <div className="max-w-md">
                    <h2 className="text-3xl font-display font-bold mb-6 leading-tight">
                        From CSV to hire in minutes.
                    </h2>
                    <p className="text-gray-400 mb-10 text-sm leading-relaxed">
                        Upload thousands of candidates, let AI shortlist the best few, then run
                        them through a structured proctored interview pipeline — fully automated.
                    </p>
                    <div className="space-y-5">
                        {[
                            ['Bulk Processing', 'Upload a CSV with 1,000+ resumes. AI scores and shortlists automatically.'],
                            ['Live AI Interview', 'Proctored chat interview with camera, timer, and no copy-paste — every answer is real.'],
                            ['3-Round Pipeline', 'AI Interview → Founder Round → Technical → Offer.'],
                            ['Automated Emails', 'Result emails sent at every stage with zero manual work.'],
                        ].map(([title, desc]) => (
                            <div key={title} className="flex items-start">
                                <div className="w-1 h-1 rounded-full bg-white mt-2 mr-4 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
