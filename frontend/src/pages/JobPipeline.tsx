import React, { useState } from 'react';
import { api } from '../lib/api';
import { Mail, Phone, FileText, ChevronLeft, Loader2, Send, ChevronRight, X, BarChart3, MessageSquare, AlertTriangle } from 'lucide-react';

const PIPELINE_STAGES = ['Applied', 'Screening', 'Mock Interview', 'Founder Round', 'Technical', 'Offer', 'Rejected'] as const;

interface Candidate {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    parsed_skills: string[];
    match_score: number | null;
    ai_score: number | null;
    resume_text: string | null;
    recommendation: string | null;
}

interface Debrief {
    status: 'completed' | 'no_interview';
    score: number | null;
    verdict: string | null;
    debrief_markdown: string | null;
    recruiter_summary: string | null;
    transcript: { role: string; content: string; ts?: string }[];
    violations: number;
}

// ── Debrief / Transcript Modal ───────────────────────────────────────────────

const DebriefModal: React.FC<{ candidate: Candidate; onClose: () => void }> = ({ candidate, onClose }) => {
    const [debrief, setDebrief] = useState<Debrief | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'debrief' | 'transcript' | 'resume'>('debrief');

    React.useEffect(() => {
        api.get(`/candidates/${candidate.id}/debrief`)
            .then(({ data }) => setDebrief(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [candidate.id]);

    const verdictColor = (v: string | null) => {
        if (!v) return 'text-gray-500';
        if (v === 'advance') return 'text-black';
        if (v === 'reject') return 'text-gray-400';
        return 'text-black';
    };

    const verdictLabel = (v: string | null) => {
        if (v === 'advance') return 'Recommended to advance';
        if (v === 'reject') return 'Not recommended';
        return v || '—';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-black">{candidate.name}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{candidate.email}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
                    {[
                        { key: 'debrief' as const, label: 'AI Debrief', icon: BarChart3 },
                        { key: 'transcript' as const, label: 'Transcript', icon: MessageSquare },
                        { key: 'resume' as const, label: 'Resume', icon: FileText },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex items-center px-1 py-3 mr-6 text-xs font-semibold border-b-2 transition-colors ${
                                tab === key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-black'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5 mr-1.5" />{label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                    ) : tab === 'debrief' ? (
                        debrief?.status === 'no_interview' ? (
                            <div className="text-center py-12">
                                <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-black mb-1">No interview completed yet</p>
                                <p className="text-xs text-gray-400">The AI debrief will appear here once the candidate completes their interview.</p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Score + verdict */}
                                <div className="flex items-center space-x-4">
                                    {debrief?.score != null && (
                                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-black text-white">
                                            <span className="text-xl font-bold">{debrief.score}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className={`text-base font-bold ${verdictColor(debrief?.verdict ?? null)}`}>
                                            {verdictLabel(debrief?.verdict ?? null)}
                                        </p>
                                        {debrief?.violations != null && debrief.violations > 0 && (
                                            <p className="flex items-center text-xs text-gray-500 mt-1">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                {debrief.violations} integrity violation{debrief.violations !== 1 ? 's' : ''} flagged
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Recruiter summary */}
                                {debrief?.recruiter_summary && (
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-bold text-black uppercase tracking-wide mb-2">Summary</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{debrief.recruiter_summary}</p>
                                    </div>
                                )}

                                {/* Full debrief */}
                                {debrief?.debrief_markdown && (
                                    <div>
                                        <p className="text-xs font-bold text-black uppercase tracking-wide mb-3">Full Debrief</p>
                                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4">
                                            {debrief.debrief_markdown}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    ) : tab === 'transcript' ? (
                        !debrief?.transcript?.length ? (
                            <div className="text-center py-12">
                                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-black mb-1">No transcript yet</p>
                                <p className="text-xs text-gray-400">The interview transcript will appear here once completed.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {debrief.transcript.map((turn, i) => (
                                    <div key={i} className={`flex ${turn.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                                        <div className="max-w-[85%]">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                                {turn.role === 'agent' ? 'AI Interviewer' : candidate.name}
                                            </p>
                                            <div className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
                                                turn.role === 'candidate' ? 'bg-black text-white' : 'bg-gray-100 text-black'
                                            }`}>
                                                {turn.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        /* Resume tab */
                        !candidate.resume_text || candidate.resume_text === '(Self-registered via public demo portal)' ? (
                            <div className="text-center py-12">
                                <FileText className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-semibold text-black mb-1">No resume on file</p>
                                <p className="text-xs text-gray-400">Upload a resume from the Dashboard or the candidate can upload their own.</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-xs font-bold text-black uppercase tracking-wide mb-3">Parsed resume text</p>
                                <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4">
                                    {candidate.resume_text}
                                </pre>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main pipeline ─────────────────────────────────────────────────────────────

export const JobPipeline: React.FC<{ jobId: string; onBack: () => void }> = ({ jobId, onBack }) => {
    const [candidates, setCandidates] = React.useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState<string | null>(null);
    const [advancing, setAdvancing] = useState<string | null>(null);
    const [debriefCandidate, setDebriefCandidate] = useState<Candidate | null>(null);

    React.useEffect(() => { fetchCandidates(); }, [jobId]);

    const fetchCandidates = async () => {
        try {
            const { data } = await api.get(`/candidates/?job_id=${jobId}`);
            setCandidates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (candidateId: string, newStatus: string) => {
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
        try {
            await api.patch(`/candidates/${candidateId}/status`, { status: newStatus });
        } catch {
            fetchCandidates();
        }
    };

    const getByCandidateStatus = (status: string) => candidates.filter(c => c.status === status);

    const handleInvite = async (candidateId: string) => {
        setInviting(candidateId);
        try {
            await api.post('/pipeline/invite', { candidate_id: candidateId, base_url: window.location.origin });
            alert('Invitation sent! The candidate will receive an email with their portal link.');
            fetchCandidates();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to send invitation.');
        } finally {
            setInviting(null);
        }
    };

    const handleAdvance = async (candidateId: string) => {
        setAdvancing(candidateId);
        try {
            const { data } = await api.post(`/pipeline/advance/${candidateId}`);
            alert(`Candidate advanced to: ${data.new_status}`);
            fetchCandidates();
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to advance candidate.');
        } finally {
            setAdvancing(null);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Loading pipeline...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-6">
            {debriefCandidate && (
                <DebriefModal candidate={debriefCandidate} onClose={() => setDebriefCandidate(null)} />
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="btn-ghost flex items-center p-2">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-display font-bold text-black">Pipeline</h1>
                        <p className="text-xs text-gray-400 mt-0.5">{candidates.length} candidates</p>
                    </div>
                </div>
                <div className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">
                    {candidates.length} total
                </div>
            </div>

            {/* Kanban */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar pb-6">
                <div className="flex space-x-4 h-full items-start min-w-max">
                    {PIPELINE_STAGES.map((stage) => (
                        <div key={stage} className="flex-shrink-0 w-72 flex flex-col bg-gray-50 rounded-xl min-h-[60vh] max-h-[80vh] border border-gray-200 overflow-hidden">
                            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
                                <h3 className="text-xs font-bold text-black uppercase tracking-wider">{stage}</h3>
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {getByCandidateStatus(stage).length}
                                </span>
                            </div>

                            <div className="p-3 space-y-3 overflow-y-auto flex-1 hide-scrollbar">
                                {getByCandidateStatus(stage).map((candidate) => (
                                    <div key={candidate.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-semibold text-black text-sm">{candidate.name}</h4>
                                            {(candidate.ai_score != null || candidate.match_score != null) && (() => {
                                                const score = candidate.ai_score ?? candidate.match_score ?? 0;
                                                const verdict = candidate.recommendation;
                                                const isAdvance = verdict === 'advance';
                                                const isReject = verdict === 'reject';
                                                return (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                                            isAdvance ? 'bg-green-100 text-green-700' :
                                                            isReject  ? 'bg-red-100 text-red-600' :
                                                            'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {score}/100
                                                        </span>
                                                        {verdict && (
                                                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                                                isAdvance ? 'text-green-600' : 'text-red-500'
                                                            }`}>
                                                                {isAdvance ? '✓ Advance' : '✗ Reject'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="space-y-1.5 mb-3">
                                            {candidate.email && (
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Mail className="w-3 h-3 mr-2 flex-shrink-0" />
                                                    <span className="truncate">{candidate.email}</span>
                                                </div>
                                            )}
                                            {candidate.phone && (
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                                                    <span className="truncate">{candidate.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {candidate.parsed_skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {candidate.parsed_skills.slice(0, 3).map(skill => (
                                                    <span key={skill} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold uppercase tracking-wide rounded">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {candidate.parsed_skills.length > 3 && (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded">
                                                        +{candidate.parsed_skills.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <button
                                                    onClick={() => setDebriefCandidate(candidate)}
                                                    className="text-[11px] font-semibold text-gray-500 flex items-center hover:text-black transition-colors"
                                                >
                                                    <BarChart3 className="w-3 h-3 mr-1" /> Debrief
                                                </button>
                                                <select
                                                    value={candidate.status}
                                                    onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                                                    className="text-[11px] font-bold border border-gray-200 rounded-lg text-black bg-white py-1 pl-2 pr-6 appearance-none cursor-pointer outline-none hover:border-gray-400 transition-colors"
                                                >
                                                    {PIPELINE_STAGES.map(col => (
                                                        <option key={col} value={col}>{col}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleInvite(candidate.id)}
                                                    disabled={inviting === candidate.id}
                                                    className="flex-1 btn-ghost py-1.5 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center"
                                                >
                                                    {inviting === candidate.id
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <><Send className="w-3 h-3 mr-1" />Invite</>}
                                                </button>
                                                <button
                                                    onClick={() => handleAdvance(candidate.id)}
                                                    disabled={advancing === candidate.id || candidate.status === 'Offer' || candidate.status === 'Rejected'}
                                                    className="flex-1 btn py-1.5 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center disabled:opacity-40"
                                                >
                                                    {advancing === candidate.id
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <>Advance<ChevronRight className="w-3 h-3 ml-0.5" /></>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {getByCandidateStatus(stage).length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                        <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-lg mb-2" />
                                        <p className="text-xs text-gray-400">No candidates</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
