import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Sparkles, CheckCircle2, AlertTriangle,
    Send, Loader2, Award, BookOpen, ShieldAlert, XCircle
} from 'lucide-react';
import { TestRulesOverlay } from '../components/TestRulesOverlay';
import { ProctoringSystem } from '../components/ProctoringSystem';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AssessmentData {
    submission_id: string;
    candidate_name: string;
    assessment_title: string;
    assessment_type: string;
    time_limit_minutes: number;
    instructions: string;
    skills: string[];
    status: string;
    initial_code?: string;
    difficulty?: string;
}

interface SubmissionResult {
    submission_id: string;
    status: string;
    score: number | null;
    feedback: string | null;
    candidate_name: string;
}

export const CandidateAssessment: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const [assessment, setAssessment] = useState<AssessmentData | null>(null);
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Proctoring State
    const [isRulesOpen, setIsRulesOpen] = useState(true);
    const [isStarted, setIsStarted] = useState(false);
    const [warnings, setWarnings] = useState(0);
    const [lastViolation, setLastViolation] = useState<string | null>(null);
    const [isDisqualified, setIsDisqualified] = useState(false);

    const MAX_WARNINGS = 3;

    useEffect(() => {
        if (!submissionId) return;
        fetch(`${API_URL}/portal/${submissionId}`)
            .then(r => {
                if (!r.ok) return r.json().then(d => { throw new Error(d.detail || 'Not found'); });
                return r.json();
            })
            .then(data => {
                setAssessment(data);
                setTimeLeft(data.time_limit_minutes * 60);
                if (data.status === 'disqualified') setIsDisqualified(true);
                // Pre-populate editor with AI-generated starter code if available
                if (data.initial_code) setCode(data.initial_code);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [submissionId]);

    // Handle Disqualification
    const handleDisqualification = useCallback(async () => {
        setIsDisqualified(true);
        setIsStarted(false);
        try {
            await fetch(`${API_URL}/portal/${submissionId}/disqualify`, { method: 'POST' });
        } catch (err) { console.error("Failed to notify backend of disqualification", err); }
    }, [submissionId]);

    // Violation Trigger
    const triggerViolation = useCallback((type: string) => {
        if (!isStarted || isDisqualified) return;
        
        setWarnings(prev => {
            const next = prev + 1;
            setLastViolation(`${type} Detected — Warning ${next}/${MAX_WARNINGS}`);
            if (next > MAX_WARNINGS) {
                handleDisqualification();
            }
            return next;
        });

        // Clear violation text after 4s
        setTimeout(() => setLastViolation(null), 4000);
    }, [isStarted, isDisqualified, handleDisqualification]);

    // Security Listeners
    useEffect(() => {
        if (!isStarted || isDisqualified) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                triggerViolation('Tab Switch');
            }
        };

        const handleBlur = () => triggerViolation('Window Change');
        const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); triggerViolation('Copying Attempt'); };
        const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); triggerViolation('Pasting Attempt'); };
        const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); triggerViolation('Right Click'); };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [isStarted, isDisqualified, triggerViolation]);

    // Countdown timer
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || result || !isStarted) return;
        const timer = setInterval(() => setTimeLeft(t => (t ? t - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, result, isStarted]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        if (!code.trim()) { setError('Please write some code before submitting.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const r = await fetch(`${API_URL}/portal/${submissionId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code_snapshot: code }),
            });
            if (!r.ok) {
                const d = await r.json();
                throw new Error(d.detail || 'Submission failed');
            }
            const data = await r.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Disqualified view
    if (isDisqualified) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent animate-pulse" />
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] p-12 shadow-2xl border border-white/20 max-w-xl w-full text-center relative z-10">
                    <div className="w-24 h-24 bg-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                        <XCircle className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-display font-black text-slate-900 mb-4 tracking-tight">Test Cancelled</h2>
                    <p className="text-slate-500 text-lg leading-relaxed mb-8">
                        Your assessment has been terminated due to <span className="text-rose-600 font-bold">Multiple Integrity Violations</span>. The proctoring system has flagged this session for manual review.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System Report</p>
                        <div className="flex items-center space-x-3 text-sm text-slate-700 font-medium">
                            <div className="w-2 h-2 bg-rose-500 rounded-full" />
                            <span>Status: DISQUALIFIED_BY_AI</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-slate-700 font-medium mt-2">
                            <div className="w-2 h-2 bg-rose-500 rounded-full" />
                            <span>Reason: Security breach (Tab switch/Copy-Paste/Motion)</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-10">This instance has been reported to the hiring manager.</p>
                </motion.div>
            </div>
        );
    }

    if (error && !assessment) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100 max-w-md text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Assessment Not Found</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200/60 max-w-lg w-full text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><CheckCircle2 className="w-10 h-10 text-white" /></div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Assessment Complete!</h2>
                    <p className="text-slate-500 mb-8">Thank you for your submission, {result.candidate_name}.</p>
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 mb-6 border border-indigo-100">
                        <p className="text-sm font-medium text-indigo-600 mb-2">Your Score</p>
                        <p className="text-5xl font-bold text-indigo-900">{result.score}<span className="text-2xl text-indigo-400">/100</span></p>
                    </div>
                    {result.feedback && (
                        <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Feedback</p>
                            <p className="text-sm text-slate-700">{result.feedback}</p>
                        </div>
                    )}
                    <p className="text-xs text-slate-400 mt-6">You'll be contacted with the next steps shortly.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 select-none">
            <TestRulesOverlay 
                isOpen={isRulesOpen} 
                onAccept={() => { setIsRulesOpen(false); setIsStarted(true); }} 
                candidateName={assessment?.candidate_name || 'Candidate'} 
            />
            
            <ProctoringSystem 
                isActive={isStarted && !isDisqualified} 
                onViolation={(type) => triggerViolation(type === 'motion' ? 'Proctored Movement' : type)} 
            />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">Recruitment OS — <span className="text-indigo-600">SECURE_MODE</span></span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {/* Warning HUD */}
                        <div className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                            <ShieldAlert className={`w-4 h-4 ${warnings > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Warnings: {warnings}/{MAX_WARNINGS}</span>
                        </div>

                        {timeLeft !== null && (
                            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-sm font-bold ${timeLeft < 300 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                <Clock className="w-4 h-4" />
                                <span>{formatTime(timeLeft)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Violation Alert */}
            <AnimatePresence>
                {lastViolation && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 24, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm"
                    >
                        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-4 border-2 border-rose-400">
                            <div className="bg-white/20 p-2 rounded-full"><ShieldAlert className="w-6 h-6" /></div>
                            <div>
                                <h4 className="font-bold text-sm">SECURITY VIOLATION</h4>
                                <p className="text-[11px] opacity-90">{lastViolation}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-5xl mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {assessment?.candidate_name} 👋</h1>
                        <p className="text-lg text-slate-500">{assessment?.assessment_title}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-1 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm border-l-4 border-l-indigo-500">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center text-sm">
                                    <BookOpen className="w-4 h-4 mr-2 text-indigo-500" />
                                    Instructions
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed">{assessment?.instructions}</p>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center text-sm">
                                    <Award className="w-4 h-4 mr-2 text-indigo-500" />
                                    Skills Tested
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {assessment?.skills.map(s => (
                                        <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">{s}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-indigo-950 p-5 rounded-2xl text-white shadow-xl shadow-indigo-900/10">
                                <div className="flex items-center space-x-2 mb-2">
                                    <ShieldAlert className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-60">PROCTOR_SYSTEM</span>
                                </div>
                                <p className="text-xs leading-relaxed opacity-80">
                                    Continuous AI-monitoring active. Multiple violations will result in automatic test failure.
                                </p>
                            </div>
                        </div>

                        <div className="col-span-2 space-y-4">
                            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                                <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex space-x-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                                        <div className="h-4 w-px bg-white/10 mx-2" />
                                        <span className="text-xs font-mono text-slate-400">solution.py</span>
                                    </div>
                                    <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Editor</span></div>
                                </div>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="# Write your solution here...&#10;&#10;def solve():&#10;    pass"
                                    className="w-full h-96 px-6 py-6 font-mono text-base bg-slate-950 text-indigo-300 resize-none outline-none placeholder-slate-700 leading-relaxed"
                                    spellCheck={false}
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                    {error}
                                </div>
                            )}

                            <motion.button
                                onClick={handleSubmit}
                                disabled={submitting || !code.trim() || !isStarted}
                                className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold text-lg shadow-xl hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-3"
                                whileHover={{ scale: (submitting || !isStarted) ? 1 : 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                {submitting ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> <span>AI Evaluating Results...</span></>
                                ) : (
                                    <><Send className="w-5 h-5" /> <span>Submit secure assessment</span></>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
