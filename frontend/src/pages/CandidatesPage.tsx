import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Loader2, ChevronDown, Star, Mail, Clock, Award, FileText,
    Sparkles, ExternalLink, Copy, CheckCircle2
} from 'lucide-react';

interface Candidate {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    parsed_skills: string[] | null;
    ai_score: number | null;
    ai_reasoning: string | null;
    experience_years: number | null;
    education: string | null;
    current_company: string | null;
    source: string;
    interview_questions: string[] | null;
    created_at: string;
}

interface Job {
    id: string;
    title: string;
}

const STATUS_COLORS: Record<string, string> = {
    Applied: 'bg-blue-50 text-blue-700 border-blue-200',
    Screening: 'bg-amber-50 text-amber-700 border-amber-200',
    Assessment: 'bg-gray-50 text-gray-700 border-gray-200',
    Interview: 'bg-gray-50 text-gray-700 border-gray-200',
    Offer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
};

const PIPELINE_STAGES = ['All', 'Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Rejected'];

export const CandidatesPage: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [jobsLoading, setJobsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stageFilter, setStageFilter] = useState('All');
    const [sortBy, setSortBy] = useState<'name' | 'score' | 'date'>('score');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        api.get('/jobs/').then(({ data }) => {
            setJobs(data);
            if (data.length > 0) {
                setSelectedJobId(data[0].id);
            }
            setJobsLoading(false);
        }).catch(() => setJobsLoading(false));
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            setLoading(true);
            api.get(`/candidates/?job_id=${selectedJobId}`).then(({ data }) => {
                setCandidates(data);
            }).catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [selectedJobId]);

    const handleStatusChange = async (candidateId: string, newStatus: string) => {
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
        try {
            await api.patch(`/candidates/${candidateId}/status`, { status: newStatus });
        } catch {
            // Revert
            const { data } = await api.get(`/candidates/?job_id=${selectedJobId}`);
            setCandidates(data);
        }
    };

    // ── AI Assessment Generation ──
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [assessmentResult, setAssessmentResult] = useState<{
        candidateId: string;
        title: string;
        portalUrl: string;
    } | null>(null);

    const generateAssessment = async (candidateId: string) => {
        setGeneratingId(candidateId);
        setAssessmentResult(null);
        try {
            const { data } = await api.post(`/assessments/generate/${candidateId}`);
            // Update candidate status locally
            setCandidates(prev => prev.map(c =>
                c.id === candidateId ? { ...c, status: 'Assessment' } : c
            ));
            setAssessmentResult({
                candidateId,
                title: data.assessment_title,
                portalUrl: data.portal_url,
            });
        } catch (err: any) {
            console.error('Failed to generate assessment:', err);
            alert(err?.response?.data?.detail || 'Failed to generate AI assessment. Check your OpenAI API key.');
        } finally {
            setGeneratingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const filtered = candidates
        .filter(c => stageFilter === 'All' || c.status === stageFilter)
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'score') return (b.ai_score || 0) - (a.ai_score || 0);
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    const stageCounts = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage] = stage === 'All' ? candidates.length : candidates.filter(c => c.status === stage).length;
        return acc;
    }, {} as Record<string, number>);

    if (jobsLoading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-display font-black text-gray-900 tracking-tight text-glow">Candidates</h1>
                <p className="text-gray-500 mt-2 font-medium">Track and manage candidates across all pipeline stages.</p>
            </div>

            {/* Job Selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Job</label>
                <select
                    value={selectedJobId}
                    onChange={e => setSelectedJobId(e.target.value)}
                    className="w-full max-w-md px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 outline-none bg-white appearance-none cursor-pointer"
                >
                    <option value="">Choose a job...</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
            </div>

            {/* Pipeline Stages */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
                {PIPELINE_STAGES.map(stage => (
                    <button
                        key={stage}
                        onClick={() => setStageFilter(stage)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${stageFilter === stage
                            ? 'bg-gray-600 text-white border-gray-600 shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {stage}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${stageFilter === stage ? 'bg-white' : 'bg-gray-100'
                            }`}>
                            {stageCounts[stage] || 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search + Sort */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all outline-none bg-white"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none cursor-pointer"
                >
                    <option value="score">Sort by Score</option>
                    <option value="name">Sort by Name</option>
                    <option value="date">Sort by Date</option>
                </select>
            </div>

            {/* Candidate List */}
            {!selectedJobId ? (
                <div className="text-center py-20">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a job to view candidates</h3>
                    <p className="text-gray-500">Choose a job from the dropdown above.</p>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {candidates.length === 0 ? 'No candidates yet' : 'No matches found'}
                    </h3>
                    <p className="text-gray-500">
                        {candidates.length === 0 ? 'Upload resumes or run a bulk hire campaign.' : 'Try adjusting your filters.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((c, i) => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.03 }}
                            className="card-3d mb-4 overflow-hidden"
                        >
                            <div
                                className="flex items-center px-6 py-4 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {c.name.charAt(0)}
                                </div>

                                {/* Info */}
                                <div className="ml-4 flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-gray-900">{c.name}</span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${STATUS_COLORS[c.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1">
                                        {c.email && <span className="text-sm text-gray-500 flex items-center"><Mail className="w-3.5 h-3.5 mr-1" />{c.email}</span>}
                                        {c.experience_years && <span className="text-sm text-gray-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />{c.experience_years}y exp</span>}
                                    </div>
                                </div>

                                {/* Score */}
                                <div className="flex items-center gap-4">
                                    {c.ai_score != null && (
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-sm ${c.ai_score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                                            c.ai_score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            <Star className="w-4 h-4" />{c.ai_score}
                                        </div>
                                    )}
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === c.id ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded Detail */}
                            <AnimatePresence>
                                {expandedId === c.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-6 pb-5 overflow-hidden"
                                    >
                                        <div className="pt-3 border-t border-gray-100">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                {c.education && (
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500 font-medium mb-1">Education</p>
                                                        <p className="text-sm text-gray-800">{c.education}</p>
                                                    </div>
                                                )}
                                                {c.current_company && (
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <p className="text-xs text-gray-500 font-medium mb-1">Current Company</p>
                                                        <p className="text-sm text-gray-800">{c.current_company}</p>
                                                    </div>
                                                )}
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 font-medium mb-1">Source</p>
                                                    <p className="text-sm text-gray-800 capitalize">{c.source || 'manual'}</p>
                                                </div>
                                            </div>

                                            {/* Skills */}
                                            {c.parsed_skills && c.parsed_skills.length > 0 && (
                                                <div className="mb-4">
                                                    <p className="text-xs text-gray-500 font-medium mb-2">Skills</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {c.parsed_skills.map((s, si) => (
                                                            <span key={si} className="text-xs bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full font-medium border border-gray-100">
                                                                {s}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* AI Reasoning */}
                                            {c.ai_reasoning && (
                                                <div className="mb-4 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                    <p className="text-xs text-gray-600 font-medium mb-1 flex items-center"><Award className="w-3.5 h-3.5 mr-1" /> AI Assessment</p>
                                                    <p className="text-sm text-gray-900">{c.ai_reasoning}</p>
                                                </div>
                                            )}

                                            {/* Personalized Interview Questions */}
                                            {c.interview_questions && c.interview_questions.length > 0 && (
                                                <div className="mb-5 bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                                                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                                        <FileText className="w-4 h-4 mr-1.5 text-gray-600" />
                                                        Personalized Interview Guide
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {c.interview_questions.map((q: string, qIndex: number) => (
                                                            <li key={qIndex} className="text-sm text-gray-700 flex items-start">
                                                                <span className="text-gray-400 font-bold mr-2 mt-0.5">•</span>
                                                                <span>{q}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* ── AI Assessment Generation ── */}
                                            <div className="mb-5">
                                                {assessmentResult && assessmentResult.candidateId === c.id ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                            <h4 className="text-sm font-bold text-emerald-900">Assessment Generated!</h4>
                                                        </div>
                                                        <p className="text-xs text-emerald-700 mb-3">{assessmentResult.title}</p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => copyToClipboard(assessmentResult.portalUrl)}
                                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all font-medium"
                                                            >
                                                                <Copy className="w-3 h-3" /> Copy Link
                                                            </button>
                                                            <a
                                                                href={assessmentResult.portalUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium"
                                                            >
                                                                <ExternalLink className="w-3 h-3" /> Open Portal
                                                            </a>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <button
                                                        onClick={() => generateAssessment(c.id)}
                                                        disabled={generatingId === c.id || c.status === 'Rejected'}
                                                        className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                                                    >
                                                        {generatingId === c.id ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span>Generating Personalized Challenge...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-4 h-4" />
                                                                <span>Generate AI Assessment</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Status Change */}
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium mb-2">Move to Stage</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Rejected'].map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => handleStatusChange(c.id, s)}
                                                            disabled={c.status === s}
                                                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${c.status === s
                                                                ? 'bg-black text-white border border-gray-200'
                                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
