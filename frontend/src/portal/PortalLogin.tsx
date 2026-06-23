import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { candidateApi } from '../lib/candidateApi';
import { Loader2, ArrowRight } from 'lucide-react';

type Mode = 'login' | 'register';

export const PortalLogin: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get('job') ?? undefined;
    const [mode, setMode] = useState<Mode>(jobId ? 'register' : 'login');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [jobInfo, setJobInfo] = useState<{ job_title: string; company_name: string } | null>(null);

    useEffect(() => {
        if (!jobId) return;
        candidateApi.get(`/candidate/job-info?job_id=${jobId}`)
            .then(({ data }) => setJobInfo(data))
            .catch(() => {});
    }, [jobId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');
        try {
            let data: any;
            if (mode === 'login') {
                ({ data } = await candidateApi.post('/candidate/login', { email: email.trim() }));
            } else {
                if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
                ({ data } = await candidateApi.post('/candidate/register', { name: name.trim(), email: email.trim(), job_id: jobId }));
            }
            sessionStorage.setItem('candidate_token', data.token);
            navigate('/portal/overview');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Unable to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                {/* Brand */}
                <div className="flex items-center space-x-2.5 mb-10">
                    <div className="w-7 h-7 rounded-md border-2 border-black flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-black rounded-sm rotate-45" />
                    </div>
                    <div>
                        <p className="text-base font-display font-bold text-black leading-none tracking-tight">HireOS</p>
                        <p className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] mt-0.5">AI HIRING PLATFORM</p>
                    </div>
                </div>

                {/* Job context banner */}
                {jobInfo && (
                    <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">You're applying for</p>
                        <p className="text-sm font-bold text-black">{jobInfo.job_title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">at {jobInfo.company_name}</p>
                    </div>
                )}

                <h1 className="text-2xl font-display font-bold text-black mb-1.5">
                    {mode === 'login' ? 'Sign in to your application.' : 'Register to apply.'}
                </h1>
                <p className="text-sm text-gray-400 mb-8">
                    {mode === 'login'
                        ? 'Use the email address your invitation was sent to.'
                        : 'Enter your name and email to begin the AI interview process.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Full Name</label>
                            <input
                                required type="text" value={name} onChange={e => setName(e.target.value)}
                                placeholder="Your full name"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Email</label>
                        <input
                            required type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="you@email.com"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <div className="p-3 border border-gray-200 rounded-xl text-xs text-gray-600 bg-gray-50">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading || !email.trim()} className="btn w-full py-3 text-sm flex items-center justify-center disabled:opacity-40">
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <>{mode === 'login' ? 'Continue' : 'Register & continue'}<ArrowRight className="w-4 h-4 ml-2" /></>
                        }
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    {mode === 'login' ? 'Want to try the demo?' : 'Already have an invitation?'}{' '}
                    <button
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                        className="text-black font-semibold hover:underline"
                    >
                        {mode === 'login' ? 'Register here' : 'Sign in instead'}
                    </button>
                </p>

                <p className="text-center text-[11px] text-gray-300 mt-8">
                    Powered by HireOS · AI Hiring Platform
                </p>
            </div>
        </div>
    );
};
