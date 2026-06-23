import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, Briefcase, FileText, UploadCloud, Sparkles, Plus, Loader2, X, ChevronRight, TrendingUp, Clock, PieChart, Award } from 'lucide-react';
import { JobPipeline } from './JobPipeline';
import { motion, AnimatePresence } from 'framer-motion';
import { BulkUploadSection } from '../components/BulkUploadSection';

// Analytics data type
interface AnalyticsData {
    stat_cards: { active_jobs: number; total_candidates: number; resumes_parsed: number; auto_shortlisted: number };
    candidates_by_stage: { label: string; count: number; color: string }[];
    offer_acceptance: { rate: number; offers_sent: number; accepted: number; declined: number };
    time_to_hire: { role: string; days: number; max: number; candidates: number }[];
    campaigns: { total: number; completed: number };
    notifications_sent: number;
}

// ─── Stat Card ───
const StatCard = ({ title, value, icon: Icon, trend, delay }: { title: string, value: string, icon: any, trend: string, delay: number }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }} className="card-3d p-6 group">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-3xl font-display font-bold text-slate-900 mt-2 tracking-tight group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-violet-500 transition-all duration-300">{value}</h3>
            </div>
            <div className="p-3.5 bg-gradient-to-br from-brand-50 to-violet-50 rounded-xl border border-brand-100/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6 text-brand-600 drop-shadow-sm" />
            </div>
        </div>
        <div className="mt-5 flex items-center text-sm">
            <div className="flex items-center text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md"><TrendingUp className="w-3.5 h-3.5 mr-1" />{trend}</div>
            <span className="text-slate-400 ml-2 text-xs font-medium">vs last month</span>
        </div>
    </motion.div>
);

// ─── Analytics: Time to Hire ───
const TimeToHireChart = ({ data }: { data: { role: string; days: number; max: number }[] }) => {
    const roles = data.length > 0 ? data : [
        { role: 'No data yet', days: 0, max: 35 },
    ];
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="card-3d p-6">
            <div className="flex items-center mb-5">
                <div className="p-2 bg-amber-50 rounded-lg mr-3 border border-amber-100"><Clock className="w-4 h-4 text-amber-600" /></div>
                <h3 className="font-display font-bold text-slate-900">Time to Hire</h3>
                <span className="ml-auto text-xs text-slate-400 font-medium">Avg. days to fill</span>
            </div>
            <div className="space-y-3.5">
                {roles.map((r, i) => (
                    <div key={r.role} className="flex items-center">
                        <span className="text-xs font-medium text-slate-600 w-36 truncate flex-shrink-0">{r.role}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 mx-3 overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(r.days / (r.max || 35)) * 100}%` }} transition={{ duration: 0.8, delay: 0.7 + i * 0.1, ease: 'easeOut' }}
                                className={`h-full rounded-full ${r.days <= 15 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : r.days <= 25 ? 'bg-gradient-to-r from-blue-400 to-indigo-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{r.days}d</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

// ─── Analytics: Candidates by Stage ───
const CandidatesByStageChart = ({ data }: { data: { label: string; count: number; color: string }[] }) => {
    const stages = data.length > 0 ? data : [
        { label: 'Applied', count: 0, color: '#6366f1' },
        { label: 'Screening', count: 0, color: '#8b5cf6' },
        { label: 'Assessment', count: 0, color: '#0ea5e9' },
        { label: 'Interview', count: 0, color: '#f59e0b' },
        { label: 'Offered', count: 0, color: '#10b981' },
    ];
    const total = stages.reduce((a, s) => a + s.count, 0);
    let cumPercent = 0;
    const gradientParts = stages.map(s => {
        const start = cumPercent;
        cumPercent += (s.count / total) * 100;
        return `${s.color} ${start}% ${cumPercent}%`;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="card-3d p-6">
            <div className="flex items-center mb-5">
                <div className="p-2 bg-violet-50 rounded-lg mr-3 border border-violet-100"><PieChart className="w-4 h-4 text-violet-600" /></div>
                <h3 className="font-display font-bold text-slate-900">Candidates by Stage</h3>
            </div>
            <div className="flex items-center gap-6">
                {/* Donut */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 0.8, delay: 0.8, type: 'spring' }}
                        className="w-full h-full rounded-full" style={{ background: `conic-gradient(${gradientParts.join(', ')})` }} />
                    <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <div className="text-center"><p className="text-2xl font-display font-bold text-slate-900">{total}</p><p className="text-[10px] text-slate-500 font-medium">Total</p></div>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex-1 space-y-2">
                    {stages.map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                            <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: s.color }} /><span className="text-xs font-medium text-slate-600">{s.label}</span></div>
                            <span className="text-xs font-bold text-slate-800">{s.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// ─── Analytics: Offer Acceptance Rate ───
const OfferAcceptanceGauge = ({ data }: { data: { rate: number; offers_sent: number; accepted: number; declined: number } }) => {
    const rate = data.rate;
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (rate / 100) * circumference;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="card-3d p-6">
            <div className="flex items-center mb-5">
                <div className="p-2 bg-emerald-50 rounded-lg mr-3 border border-emerald-100"><Award className="w-4 h-4 text-emerald-600" /></div>
                <h3 className="font-display font-bold text-slate-900">Offer Acceptance Rate</h3>
            </div>
            <div className="flex items-center justify-center">
                <div className="relative">
                    <svg width="140" height="140" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <motion.circle cx="60" cy="60" r="54" fill="none" stroke="url(#gaugeGradient)" strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }} transform="rotate(-90 60 60)" />
                        <defs><linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><p className="text-3xl font-display font-bold text-slate-900">{rate}%</p><p className="text-[10px] text-slate-500 font-medium">Accepted</p></div></div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[{ l: 'Offers Sent', v: String(data.offers_sent) }, { l: 'Accepted', v: String(data.accepted) }, { l: 'Declined', v: String(data.declined) }].map(s => (
                    <div key={s.l} className="bg-slate-50 rounded-lg py-2 px-1"><p className="text-lg font-bold text-slate-900">{s.v}</p><p className="text-[10px] text-slate-500 font-medium">{s.l}</p></div>
                ))}
            </div>
        </motion.div>
    );
};

// ─── Recent Shortlisted Feed ───
const ShortlistFeed = () => {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.get('/bulk/recent-shortlisted').then(({ data }) => setCandidates(data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }} className="card-3d overflow-hidden">
            <div className="px-6 py-5 border-b border-white flex items-center justify-between bg-white/50 backdrop-blur-sm">
                <div className="flex items-center">
                    <div className="p-2 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg mr-3 border border-emerald-100"><Sparkles className="w-4 h-4 text-emerald-600" /></div>
                    <h3 className="font-display font-semibold text-slate-900">Recent Shortlisted Candidates</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Cross-job feed</span>
            </div>
            {loading ? (
                <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : candidates.length === 0 ? (
                <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 mx-auto"><Users className="w-6 h-6 text-slate-400" /></div>
                    <p className="text-slate-500 text-sm font-medium">No shortlisted candidates yet.</p>
                    <p className="text-slate-400 text-xs mt-1">Use Bulk Upload above to process candidates.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {candidates.map((c: any, i: number) => (
                        <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.04 }}
                            className="px-6 py-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {c.name?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-semibold text-slate-900 text-sm truncate">{c.name}</h4>
                                    <p className="text-xs text-slate-500 truncate">{c.job_title} · {c.experience_years || 0} yrs</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2.5 flex-shrink-0">
                                <div className="flex gap-1">
                                    {(c.skills || []).slice(0, 2).map((s: string) => (
                                        <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] uppercase font-bold rounded border border-indigo-100">{s}</span>
                                    ))}
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${(c.ai_score || 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : (c.ai_score || 0) >= 60 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                    {c.ai_score}%
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.status === 'Assessment' ? 'bg-violet-100 text-violet-700' : c.status === 'Interview' ? 'bg-amber-100 text-amber-700' : c.status === 'Offer' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {c.status}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

// ─── Main Dashboard ───
export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSkills, setNewSkills] = useState('');
    const [generatedJD, setGeneratedJD] = useState('');
    const [generating, setGenerating] = useState(false);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    const fetchJobs = async () => {
        try { const { data } = await api.get('/jobs/'); setJobs(data); } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    const fetchAnalytics = async () => {
        try { const { data } = await api.get('/analytics/dashboard'); setAnalytics(data); } catch (err) { console.error('Analytics fetch failed:', err); }
    };
    useEffect(() => { fetchJobs(); fetchAnalytics(); }, [user]);

    const handleGenerateJD = async () => {
        if (!newTitle || !newSkills) return;
        setGenerating(true);
        try { const { data } = await api.post('/jobs/generate-jd', { title: newTitle, skills: newSkills.split(',').map(s => s.trim()) }); setGeneratedJD(data.generated_jd); }
        catch (error) { console.error(error); alert("Failed to generate JD"); } finally { setGenerating(false); }
    };

    const handleSaveJob = async () => {
        try {
            await api.post('/jobs/', { title: newTitle, description: generatedJD, skills_required: newSkills.split(',').map(s => s.trim()) });
            setIsModalOpen(false); setNewTitle(''); setNewSkills(''); setGeneratedJD(''); fetchJobs();
        } catch (error) { console.error(error); alert("Failed to save job"); }
    };

    const handleResumeUpload = async (jobId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file); formData.append('job_id', jobId);
        try { await api.post('/resumes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); alert("Resume parsed successfully!"); }
        catch (error) { console.error(error); alert("Failed to parse resume."); }
    };

    if (selectedJobId) return <JobPipeline jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;

    return (
        <div className="space-y-8 relative pb-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight text-glow">Hiring Workspace</h1>
                    <p className="text-slate-500 mt-2 font-medium">Your unified hub for hiring, analytics, and candidate flow. ✨</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-3d flex items-center px-6 py-3 text-sm"><Plus className="w-5 h-5 mr-1.5" />Create New Job</button>
            </motion.div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Jobs" value={analytics ? analytics.stat_cards.active_jobs.toString() : jobs.length.toString()} icon={Briefcase} trend="—" delay={0.1} />
                <StatCard title="Total Candidates" value={analytics ? analytics.stat_cards.total_candidates.toString() : '0'} icon={Users} trend="—" delay={0.2} />
                <StatCard title="Resumes Parsed" value={analytics ? analytics.stat_cards.resumes_parsed.toString() : '0'} icon={FileText} trend="—" delay={0.3} />
                <StatCard title="Auto-Shortlisted" value={analytics ? analytics.stat_cards.auto_shortlisted.toString() : '0'} icon={Sparkles} trend="—" delay={0.4} />
            </div>

            {/* ── Section 1: Embedded Bulk Upload ── */}
            <BulkUploadSection onCampaignComplete={() => { fetchAnalytics(); fetchJobs(); }} />

            {/* ── Section 2: Enhanced Analytics ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <TimeToHireChart data={analytics?.time_to_hire || []} />
                <CandidatesByStageChart data={analytics?.candidates_by_stage || []} />
                <OfferAcceptanceGauge data={analytics?.offer_acceptance || { rate: 0, offers_sent: 0, accepted: 0, declined: 0 }} />
            </div>

            {/* ── Section 3: Active Requisitions ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.85 }} className="card-3d overflow-hidden">
                <div className="px-6 py-5 border-b border-white flex items-center justify-between bg-white/50 backdrop-blur-sm">
                    <h3 className="font-display font-semibold text-slate-900">Active Requisitions</h3>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
                </div>
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {jobs.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Briefcase className="w-8 h-8 text-slate-400" /></div>
                                <p className="text-slate-500 font-medium">No open jobs found.</p>
                                <p className="text-slate-400 text-sm mt-1">Create your first job req to start hiring.</p>
                            </div>
                        ) : jobs.map((job) => (
                            <div key={job.id} className="p-5 hover:bg-slate-50/80 transition-colors flex items-center justify-between group">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 mr-4"><Briefcase className="w-5 h-5 text-indigo-600" /></div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{job.title}</h4>
                                        <div className="mt-1 flex items-center space-x-3 text-sm text-slate-500">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${job.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{job.status}</span>
                                            <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 0 applicants</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-3 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-lg hover:bg-indigo-100 flex items-center shadow-sm transition-all">
                                        <UploadCloud className="w-4 h-4 mr-1.5" />Upload Resume
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleResumeUpload(job.id, e)} />
                                    </label>
                                    <button onClick={() => setSelectedJobId(job.id)} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-sm flex items-center transition-all">
                                        Pipeline<ChevronRight className="w-4 h-4 ml-1.5 opacity-70" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Section 4: Cross-Job Shortlist Feed ── */}
            <ShortlistFeed />

            {/* ── Create Job Modal ── */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative card-3d bg-white/95 w-full max-w-2xl max-h-[90vh] flex flex-col">
                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                                <h2 className="text-xl font-display font-bold text-slate-900 flex items-center"><div className="p-1.5 bg-indigo-100 rounded-md mr-3"><Sparkles className="w-5 h-5 text-indigo-600" /></div>AI Job Generation</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title</label><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Senior Staff Engineer" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none shadow-sm" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Core Skills (Comma separated)</label><input type="text" value={newSkills} onChange={(e) => setNewSkills(e.target.value)} placeholder="e.g. React, Next.js, Node.js, GraphqL" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none shadow-sm" /></div>
                                <button onClick={handleGenerateJD} disabled={generating || !newTitle} className="btn-3d w-full py-3.5 flex justify-center items-center">
                                    {generating ? <Loader2 className="w-5 h-5 animate-spin text-white/80" /> : <><Sparkles className="w-4 h-4 mr-2" />Auto-Generate Description</>}
                                </button>
                                {generatedJD && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Review Generated JD</label>
                                        <textarea value={generatedJD} onChange={(e) => setGeneratedJD(e.target.value)} rows={12} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none shadow-sm font-sans leading-relaxed resize-none" />
                                    </motion.div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm flex justify-end space-x-3 rounded-b-3xl">
                                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                <button onClick={handleSaveJob} disabled={!generatedJD} className="btn-3d px-6 py-2.5 text-sm">Publish Active Requisition</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
