import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Clock, Sparkles, CheckCircle2, AlertTriangle,
    Send, Loader2, Code2, Award, BookOpen
} from 'lucide-react';

interface AssessmentData {
    submission_id: string;
    candidate_name: string;
    assessment_title: string;
    assessment_type: string;
    time_limit_minutes: number;
    instructions: string;
    skills: string[];
    status: string;
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

    useEffect(() => {
        if (!submissionId) return;
        fetch(`http://localhost:8000/api/v1/portal/${submissionId}`)
            .then(r => {
                if (!r.ok) return r.json().then(d => { throw new Error(d.detail || 'Not found'); });
                return r.json();
            })
            .then(data => {
                setAssessment(data);
                setTimeLeft(data.time_limit_minutes * 60);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [submissionId]);

    // Countdown timer
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || result) return;
        const timer = setInterval(() => setTimeLeft(t => (t ? t - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, result]);

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
            const r = await fetch(`http://localhost:8000/api/v1/portal/${submissionId}/submit`, {
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

    // Result view
    if (result) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200/60 max-w-lg w-full text-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
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

    // Assessment view
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">Recruitment OS</span>
                    </div>
                    {timeLeft !== null && (
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-mono text-sm font-bold ${timeLeft < 300 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Welcome */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Welcome, {assessment?.candidate_name} 👋
                        </h1>
                        <p className="text-lg text-slate-500">{assessment?.assessment_title}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {/* Left: Instructions */}
                        <div className="col-span-1 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
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

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                <p className="text-xs text-amber-800 font-medium">
                                    ⏱️ Time limit: <strong>{assessment?.time_limit_minutes} minutes</strong>.
                                    Submit before the timer runs out.
                                </p>
                            </div>
                        </div>

                        {/* Right: Code Editor */}
                        <div className="col-span-2 space-y-4">
                            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Code2 className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-300">solution.py</span>
                                    </div>
                                    <span className="text-xs text-slate-500">Python</span>
                                </div>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="# Write your solution here...&#10;&#10;def solve():&#10;    pass"
                                    className="w-full h-80 px-5 py-4 font-mono text-sm bg-slate-950 text-green-400 resize-none outline-none placeholder-slate-600"
                                    spellCheck={false}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <motion.button
                                onClick={handleSubmit}
                                disabled={submitting || !code.trim()}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                whileHover={{ scale: submitting ? 1 : 1.01 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                {submitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Evaluating your code...</>
                                ) : (
                                    <><Send className="w-5 h-5 mr-2" /> Submit Assessment</>
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
