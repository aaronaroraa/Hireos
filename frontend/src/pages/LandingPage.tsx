import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Shield, Zap, Users, BarChart3, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white font-sans">

            {/* Nav */}
            <nav className="border-b border-gray-100 px-8 py-4 flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-md border-2 border-black flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-black rounded-sm rotate-45" />
                    </div>
                    <span className="text-base font-bold text-black tracking-tight">HireOS</span>
                </div>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/portal/login')}
                        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                    >
                        I'm a candidate
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn px-4 py-2 text-sm flex items-center"
                    >
                        Sign in <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <section className="max-w-6xl mx-auto px-8 pt-24 pb-20">
                <div className="max-w-3xl">
                    <div className="inline-flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1.5 mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                        <span className="text-xs font-semibold text-black uppercase tracking-widest">AI-powered hiring</span>
                    </div>

                    <h1 className="text-5xl font-bold text-black leading-tight tracking-tight mb-6">
                        From application to<br />
                        hire in minutes — not weeks.
                    </h1>

                    <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-2xl">
                        Upload your candidates, let AI shortlist the best ones, then run them
                        through a structured proctored interview — fully automated. Your team
                        only reviews the finalists.
                    </p>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="btn px-6 py-3 text-sm flex items-center"
                        >
                            Start hiring free <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                        <button
                            onClick={() => navigate('/portal/login')}
                            className="btn-ghost px-6 py-3 text-sm flex items-center border border-gray-200"
                        >
                            I'm a candidate <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats row */}
            <section className="border-y border-gray-100 bg-gray-50">
                <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-3 gap-8">
                    {[
                        { value: '30 min', label: 'Proctored AI interview' },
                        { value: '< 2 min', label: 'Time to shortlist 1,000 CVs' },
                        { value: '100%', label: 'Automated first-round screening' },
                    ].map(({ value, label }) => (
                        <div key={label} className="text-center">
                            <p className="text-3xl font-bold text-black mb-1">{value}</p>
                            <p className="text-sm text-gray-500">{label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="max-w-6xl mx-auto px-8 py-24">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">How it works</p>
                <h2 className="text-3xl font-bold text-black mb-16 max-w-xl">Three steps from posting to shortlist.</h2>

                <div className="grid grid-cols-3 gap-8">
                    {[
                        {
                            step: '01',
                            title: 'Post a job',
                            desc: 'Describe the role. AI writes the job description, sets the interview brief, and generates a shareable candidate portal link.',
                        },
                        {
                            step: '02',
                            title: 'Candidates interview',
                            desc: 'Candidates register, upload their CV, and complete a 30-minute proctored AI interview. Camera mandatory. No copy-paste. Tab switching flagged.',
                        },
                        {
                            step: '03',
                            title: 'Review the shortlist',
                            desc: 'AI scores every candidate, writes a full debrief, and flags the top hires. Your team only talks to people worth talking to.',
                        },
                    ].map(({ step, title, desc }) => (
                        <div key={step}>
                            <p className="text-4xl font-bold text-gray-100 mb-4">{step}</p>
                            <h3 className="text-base font-bold text-black mb-2">{title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="bg-black text-white py-24">
                <div className="max-w-6xl mx-auto px-8">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Features</p>
                    <h2 className="text-3xl font-bold text-white mb-16 max-w-xl">Everything your team needs. Nothing it doesn't.</h2>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            {
                                icon: Zap,
                                title: 'Bulk CV processing',
                                desc: 'Upload a CSV with 1,000+ resumes. AI parses, scores, and shortlists the top matches automatically in under 2 minutes.',
                            },
                            {
                                icon: Shield,
                                title: 'Proctored interviews',
                                desc: 'Camera mandatory. Tab switching flagged. Copy-paste disabled. Every answer is typed live — no pre-written responses.',
                            },
                            {
                                icon: BarChart3,
                                title: 'AI debrief per candidate',
                                desc: 'After every interview, get a full topic-by-topic breakdown, score, verdict, and recruiter summary — written by the AI that ran the interview.',
                            },
                            {
                                icon: Clock,
                                title: 'Automated pipeline emails',
                                desc: 'Invite, advance, and reject emails sent automatically at every stage. Candidates always know where they stand.',
                            },
                            {
                                icon: Users,
                                title: 'Multi-round pipeline',
                                desc: 'AI Interview → Founder Round → Technical → Offer. Move candidates through stages with one click.',
                            },
                            {
                                icon: CheckCircle,
                                title: 'Full tenant isolation',
                                desc: 'Each company\'s data is completely isolated. Candidates from one company\'s link can never appear in another\'s pipeline.',
                            },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="border border-gray-800 rounded-xl p-6">
                                <Icon className="w-5 h-5 text-white mb-4" />
                                <p className="text-sm font-bold text-white mb-2">{title}</p>
                                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-6xl mx-auto px-8 py-24 text-center">
                <h2 className="text-4xl font-bold text-black mb-4 tracking-tight">Ready to hire smarter?</h2>
                <p className="text-gray-500 mb-10 max-w-lg mx-auto text-sm leading-relaxed">
                    Set up your workspace in 60 seconds. Post a job, share the link, and let AI handle the first round.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    className="btn px-8 py-3.5 text-sm inline-flex items-center"
                >
                    Get started free <ArrowRight className="w-4 h-4 ml-2" />
                </button>
                <p className="text-xs text-gray-400 mt-4">No credit card required · Free to start</p>
            </section>

            {/* Footer */}
            <footer className="border-t border-gray-100 px-8 py-8 max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded border border-black flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-black rounded-sm rotate-45" />
                    </div>
                    <span className="text-sm font-bold text-black">HireOS</span>
                </div>
                <p className="text-xs text-gray-400">AI Hiring Platform · Built for modern teams</p>
            </footer>
        </div>
    );
};
