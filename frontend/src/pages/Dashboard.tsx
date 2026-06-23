import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
    Users, Briefcase, UploadCloud, Plus, Loader2, X,
    ChevronRight, Sparkles, Copy, Check, ExternalLink, Share2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JobPipeline } from './JobPipeline';

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [totalCandidates, setTotalCandidates] = useState(0);

    // Create job modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSkills, setNewSkills] = useState('');
    const [generatedJD, setGeneratedJD] = useState('');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedJobId, setSavedJobId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Share modal for existing jobs
    const [shareJobId, setShareJobId] = useState<string | null>(null);
    const [shareJobTitle, setShareJobTitle] = useState('');
    const [shareCopied, setShareCopied] = useState(false);

    const fetchJobs = async () => {
        try {
            const { data } = await api.get('/jobs/');
            setJobs(data);
        } catch { }
        finally { setLoading(false); }
    };

    const fetchAnalytics = async () => {
        try {
            const { data } = await api.get('/analytics/dashboard');
            setTotalCandidates(data.stat_cards?.total_candidates ?? 0);
        } catch { }
    };

    useEffect(() => { fetchJobs(); fetchAnalytics(); }, [user]);

    const handleGenerateJD = async () => {
        if (!newTitle) return;
        setGenerating(true);
        try {
            const { data } = await api.post('/jobs/generate-jd', {
                title: newTitle,
                skills: newSkills.split(',').map((s: string) => s.trim()).filter(Boolean),
            });
            setGeneratedJD(data.generated_jd);
        } catch { alert('Failed to generate description.'); }
        finally { setGenerating(false); }
    };

    const handleSaveJob = async () => {
        if (!newTitle) return;
        setSaving(true);
        try {
            const { data } = await api.post('/jobs/', {
                title: newTitle,
                description: generatedJD,
                skills_required: newSkills.split(',').map((s: string) => s.trim()).filter(Boolean),
            });
            setSavedJobId(data.id);
            fetchJobs();
            fetchAnalytics();
        } catch { alert('Failed to save job.'); }
        finally { setSaving(false); }
    };

    // Include job_id so self-registering candidates land in this specific company's job
    const applyLink = savedJobId
        ? `${window.location.origin}/portal/login?job=${savedJobId}`
        : `${window.location.origin}/portal/login`;

    const copyToClipboard = (text: string) => {
        try {
            navigator.clipboard.writeText(text);
        } catch {
            const el = document.createElement('textarea');
            el.value = text;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
    };

    const copyLink = () => {
        copyToClipboard(applyLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewTitle(''); setNewSkills(''); setGeneratedJD('');
        setSavedJobId(null); setCopied(false);
    };

    const shareLink = (jobId: string) => `${window.location.origin}/portal/login?job=${jobId}`;

    const openShareModal = (job: any) => {
        setShareJobId(job.id);
        setShareJobTitle(job.title);
        setShareCopied(false);
    };

    const copyShareLink = () => {
        if (!shareJobId) return;
        copyToClipboard(shareLink(shareJobId));
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    const handleResumeUpload = async (jobId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file); fd.append('job_id', jobId);
        try { await api.post('/resumes/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); alert('Resume parsed.'); }
        catch { alert('Failed to parse resume.'); }
    };

    if (selectedJobId) return <JobPipeline jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-black tracking-tight">Hiring Workspace</h1>
                    <p className="text-sm text-gray-400 mt-0.5">All jobs, candidates, and pipeline in one place.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn flex items-center px-4 py-2.5 text-sm">
                    <Plus className="w-4 h-4 mr-1.5" />New Job
                </button>
            </div>

            {/* Stats — just the two that matter */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: 'Active Jobs', value: jobs.length, icon: Briefcase },
                    { label: 'Total Candidates', value: totalCandidates, icon: Users },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="card p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                            <p className="text-3xl font-display font-bold text-black mt-1">{value}</p>
                        </div>
                        <div className="p-2.5 bg-gray-100 rounded-xl">
                            <Icon className="w-5 h-5 text-black" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => navigate('/bulk-hire')} className="card p-5 text-left hover:border-gray-300 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <UploadCloud className="w-5 h-5 text-black" />
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-black">Bulk Hire</p>
                    <p className="text-xs text-gray-400 mt-0.5">Upload a CSV of candidates — AI shortlists the top matches.</p>
                </button>
                <button onClick={() => setIsModalOpen(true)} className="card p-5 text-left hover:border-gray-300 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <Sparkles className="w-5 h-5 text-black" />
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-black">Create a Job</p>
                    <p className="text-xs text-gray-400 mt-0.5">AI writes the description. Invite candidates into the interview pipeline.</p>
                </button>
            </div>

            {/* Jobs table */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-black">Open Positions</h3>
                </div>
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No open jobs. Create one to start hiring.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {jobs.map((job) => (
                            <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-black">{job.title}</p>
                                    {job.skills_required?.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {job.skills_required.slice(0, 4).join(' · ')}
                                            {job.skills_required.length > 4 ? ` +${job.skills_required.length - 4}` : ''}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => openShareModal(job)} className="btn-ghost px-3 py-2 text-xs flex items-center">
                                        <Share2 className="w-3.5 h-3.5 mr-1.5" />Share
                                    </button>
                                    <label className="cursor-pointer btn-ghost px-3 py-2 text-xs flex items-center">
                                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" />Resume
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleResumeUpload(job.id, e)} />
                                    </label>
                                    <button onClick={() => setSelectedJobId(job.id)} className="btn px-3 py-2 text-xs flex items-center">
                                        Pipeline<ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Share Modal — for existing jobs */}
            {shareJobId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShareJobId(null)} />
                    <div className="relative bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-xl p-6 space-y-5">
                        <div className="flex justify-between items-center">
                            <h2 className="text-base font-bold text-black">Share — {shareJobTitle}</h2>
                            <button onClick={() => setShareJobId(null)} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Candidate Portal Link</p>
                            <div className="flex items-center space-x-2">
                                <input
                                    readOnly
                                    value={shareLink(shareJobId)}
                                    onClick={e => (e.target as HTMLInputElement).select()}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 font-mono cursor-text outline-none"
                                />
                                <button onClick={copyShareLink} className="btn-ghost px-3 py-2.5 flex items-center text-xs shrink-0">
                                    {shareCopied ? <Check className="w-3.5 h-3.5 mr-1 text-black" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                    {shareCopied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1.5">Click the link to select it, or use the Copy button. Candidates land directly in this job's pipeline.</p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Google Form</p>
                            <a
                                href="https://docs.google.com/forms/create"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />Open Google Forms
                            </a>
                            <p className="text-[11px] text-gray-400 mt-1.5">Collect applicant emails via form, then invite them from Pipeline.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Job Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
                    <div className="relative bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
                        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-base font-bold text-black">
                                {savedJobId ? 'Job Published' : 'Create Job'}
                            </h2>
                            <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {savedJobId ? (
                            /* ── Post-publish: share options ── */
                            <div className="p-6 space-y-5">
                                <p className="text-sm text-gray-500">Your job is live. Share the portal link or create a Google Form to collect external applications.</p>

                                {/* HireOS portal link */}
                                <div>
                                    <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Candidate Portal Link</p>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-600 font-mono truncate">
                                            {applyLink}
                                        </div>
                                        <button onClick={copyLink} className="btn-ghost px-3 py-2.5 flex items-center text-xs shrink-0">
                                            {copied ? <Check className="w-3.5 h-3.5 mr-1 text-black" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1.5">Share this with invited candidates — they log in with the email their invite was sent to.</p>
                                </div>

                                {/* Google Form shortcut */}
                                <div>
                                    <p className="text-xs font-semibold text-black uppercase tracking-wide mb-2">Google Form</p>
                                    <a
                                        href="https://docs.google.com/forms/create"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-ghost w-full py-2.5 text-sm flex items-center justify-center"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open Google Forms
                                    </a>
                                    <p className="text-[11px] text-gray-400 mt-1.5">Create a form, collect applicant emails, then invite them from the Pipeline view.</p>
                                </div>

                                <button onClick={closeModal} className="btn w-full py-2.5 text-sm">Done</button>
                            </div>
                        ) : (
                            /* ── Create form ── */
                            <>
                                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Job Title</label>
                                        <input
                                            type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="e.g. Senior Backend Engineer"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Core Skills</label>
                                        <input
                                            type="text" value={newSkills} onChange={(e) => setNewSkills(e.target.value)}
                                            placeholder="e.g. React, Node.js, TypeScript"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerateJD}
                                        disabled={generating || !newTitle}
                                        className="btn-ghost w-full py-3 flex justify-center items-center text-sm"
                                    >
                                        {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                        {generating ? 'Generating…' : 'Generate Job Description'}
                                    </button>
                                    {generatedJD && (
                                        <div>
                                            <label className="block text-xs font-semibold text-black mb-1.5 uppercase tracking-wide">Description</label>
                                            <textarea
                                                value={generatedJD} onChange={(e) => setGeneratedJD(e.target.value)}
                                                rows={10}
                                                className="w-full px-3.5 py-3 bg-white border border-gray-200 rounded-xl text-sm text-black focus:ring-1 focus:ring-black outline-none transition-all font-sans leading-relaxed resize-none"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                                    <button onClick={closeModal} className="btn-ghost px-4 py-2.5 text-sm">Cancel</button>
                                    <button
                                        onClick={handleSaveJob}
                                        disabled={saving || !newTitle}
                                        className="btn px-5 py-2.5 text-sm disabled:opacity-40"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Job'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
