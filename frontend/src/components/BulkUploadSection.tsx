import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, Target, Zap, CheckCircle2,
    XCircle, Loader2, Users, Award, BarChart3,
    Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

interface Campaign {
    id: string; status: string; total_uploaded: number; target_shortlist: number;
    scored_count: number; shortlisted_count: number; rejected_count: number; progress_percent: number;
}
interface ShortlistedCandidate {
    id: string; name: string; email: string; ai_score: number; ai_reasoning: string;
    skills: string[]; experience_years: number; education: string; status: string;
    assessment?: { submission_id: string; status: string; score: number | null; assessment_link: string } | null;
    notification?: { type: string; status: string; sent_at: string; assessment_link: string } | null;
}
interface CampaignResults {
    campaign: { id: string; status: string; total_uploaded: number; target_shortlist: number };
    shortlisted: ShortlistedCandidate[]; rejected_count: number; notifications_sent: number;
    score_distribution: { "90+": number; "70-89": number; "50-69": number; below_50: number };
}

export const BulkUploadSection: React.FC<{ onCampaignComplete?: () => void }> = ({ onCampaignComplete }) => {
    const [expanded, setExpanded] = useState(false);
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [targetCount, setTargetCount] = useState(10);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [jobMode, setJobMode] = useState<'existing' | 'custom'>('custom');
    const [customJobTitle, setCustomJobTitle] = useState('');
    const [customSkills, setCustomSkills] = useState('');
    const [processing, setProcessing] = useState(false);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [results, setResults] = useState<CampaignResults | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { api.get('/jobs/').then(({ data }) => setJobs(data)).catch(() => {}); }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => { setIsDragging(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv') || f.name.endsWith('.xls'))) { setFile(f); setError(''); }
        else { setError('Please upload an Excel (.xlsx) or CSV file.'); }
    }, []);
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const s = e.target.files?.[0]; if (s) { setFile(s); setError(''); } };

    const handleUpload = async () => {
        if (!file) { setError('Please select a file first.'); return; }
        setProcessing(true); setError(''); setCampaign(null); setResults(null);
        try {
            let jobId = selectedJobId;
            if (jobMode === 'custom') {
                if (!customJobTitle) { setError('Please enter a job title.'); setProcessing(false); return; }
                const skillsList = customSkills.split(',').map(s => s.trim()).filter(Boolean);
                const { data: newJob } = await api.post('/jobs/', { title: customJobTitle, description: `Hiring for ${customJobTitle}. Required skills: ${skillsList.join(', ')}`, skills_required: skillsList });
                jobId = newJob.id;
            }
            if (!jobId) { setError('Please select or create a job first.'); setProcessing(false); return; }
            const formData = new FormData();
            formData.append('file', file); formData.append('job_id', jobId); formData.append('target_shortlist', targetCount.toString());
            const { data } = await api.post('/bulk/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setCampaign(data);
            const resultsRes = await api.get(`/bulk/campaign/${data.id}/results`);
            setResults(resultsRes.data);
            // Notify parent to refresh analytics in real-time
            onCampaignComplete?.();
        } catch (err: any) { setError(err.response?.data?.detail || 'Upload failed.'); } finally { setProcessing(false); }
    };

    const handleReset = () => { setFile(null); setCampaign(null); setResults(null); setError(''); };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }} className="card-3d overflow-hidden">
            {/* Header Toggle */}
            <button onClick={() => setExpanded(!expanded)} className="w-full px-6 py-5 flex items-center justify-between bg-gray-50 transition-all group">
                <div className="flex items-center">
                    <div className="p-2.5 bg-black rounded-xl mr-4 group-hover:scale-105 transition-transform">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-display font-bold text-gray-900">Bulk Hire — AI Automation</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Upload a spreadsheet of candidates. AI will score, rank, and auto-shortlist.</p>
                    </div>
                </div>
                {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        {/* Results View */}
                        {results && campaign ? (
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center"><CheckCircle2 className="w-6 h-6 text-emerald-500 mr-2" /><h4 className="font-display font-bold text-gray-900">Campaign Complete — {campaign.shortlisted_count} shortlisted from {campaign.total_uploaded}</h4></div>
                                    <button onClick={handleReset} className="flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl shadow-sm hover:bg-gray-800 transition-all text-sm font-medium"><Zap className="w-4 h-4 mr-1.5" />New Campaign</button>
                                </div>
                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                    {[{ label: 'Uploaded', value: campaign.total_uploaded, icon: Upload, color: 'gray' }, { label: 'AI Scored', value: campaign.scored_count, icon: Sparkles, color: 'gray' }, { label: 'Shortlisted', value: campaign.shortlisted_count, icon: Award, color: 'emerald' }, { label: 'Rejected', value: campaign.rejected_count, icon: XCircle, color: 'rose' }].map((s, i) => (
                                        <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-gray-50 rounded-xl border border-gray-200/60 p-4">
                                            <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-500">{s.label}</p><s.icon className={`w-4 h-4 text-${s.color}-500`} /></div>
                                            <p className="text-2xl font-display font-bold text-gray-900 mt-1">{s.value}</p>
                                        </motion.div>
                                    ))}
                                </div>
                                {/* Score Distribution */}
                                <div className="bg-gray-50 rounded-xl border border-gray-200/60 p-5">
                                    <h4 className="font-display font-semibold text-gray-900 mb-3 flex items-center text-sm"><BarChart3 className="w-4 h-4 mr-2 text-gray-500" />Score Distribution</h4>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[{ range: '90+', count: results.score_distribution['90+'], color: 'bg-emerald-500', label: 'Excellent' }, { range: '70-89', count: results.score_distribution['70-89'], color: 'bg-blue-500', label: 'Good' }, { range: '50-69', count: results.score_distribution['50-69'], color: 'bg-amber-500', label: 'Average' }, { range: '<50', count: results.score_distribution.below_50, color: 'bg-rose-500', label: 'Poor' }].map((b) => (
                                            <div key={b.range} className="text-center">
                                                <div className="h-16 flex items-end justify-center mb-1.5"><motion.div initial={{ height: 0 }} animate={{ height: `${Math.max(10, (b.count / campaign.total_uploaded) * 100)}%` }} transition={{ duration: 0.8 }} className={`w-10 ${b.color} rounded-t-lg`} /></div>
                                                <p className="text-sm font-bold text-gray-700">{b.count}</p><p className="text-[10px] text-gray-500">{b.label} ({b.range})</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Shortlisted Table */}
                                <div className="bg-gray-50 rounded-xl border border-gray-200/60 overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-gray-200/60 flex items-center justify-between">
                                        <h4 className="font-display font-semibold text-gray-900 flex items-center text-sm"><Award className="w-4 h-4 text-emerald-500 mr-2" />Shortlisted ({results.shortlisted.length})</h4>
                                        {(results.notifications_sent || 0) > 0 && <span className="text-[10px] font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">📧 {results.notifications_sent} sent</span>}
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                        {results.shortlisted.map((c, i) => (
                                            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="px-5 py-3 flex items-center justify-between hover:bg-white transition-colors">
                                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">{c.name.charAt(0)}</div>
                                                    <div className="min-w-0"><h5 className="font-semibold text-gray-900 text-sm truncate">{c.name}</h5><p className="text-xs text-gray-500 truncate">{c.email || 'No email'} · {c.experience_years || 0} yrs</p></div>
                                                </div>
                                                <div className="flex items-center space-x-2 flex-shrink-0">
                                                    <div className="flex gap-1">{(c.skills || []).slice(0, 2).map((s: string) => <span key={s} className="px-1.5 py-0.5 bg-gray-50 text-gray-700 text-[9px] uppercase font-bold rounded border border-gray-100">{s}</span>)}</div>
                                                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${c.ai_score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : c.ai_score >= 60 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{c.ai_score}%</div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Upload View */
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-5">
                                    {/* Config Column */}
                                    <div className="col-span-1 space-y-4">
                                        <div className="bg-gray-50 rounded-xl border border-gray-200/60 p-4">
                                            <label className="block text-xs font-semibold text-gray-700 mb-2"><Target className="w-3.5 h-3.5 inline mr-1 text-gray-500" />Job Requirements</label>
                                            <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
                                                <button onClick={() => setJobMode('custom')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${jobMode === 'custom' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500'}`}>✨ Custom</button>
                                                <button onClick={() => setJobMode('existing')} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${jobMode === 'existing' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500'}`}>📋 Existing</button>
                                            </div>
                                            {jobMode === 'custom' ? (
                                                <div className="space-y-2.5">
                                                    <div><label className="block text-[11px] font-medium text-gray-600 mb-1">Job Title</label><input type="text" value={customJobTitle} onChange={(e) => setCustomJobTitle(e.target.value)} placeholder="e.g. Senior Python Developer" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all outline-none text-sm" /></div>
                                                    <div><label className="block text-[11px] font-medium text-gray-600 mb-1">Required Skills</label><input type="text" value={customSkills} onChange={(e) => setCustomSkills(e.target.value)} placeholder="Python, Django, AWS" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all outline-none text-sm" /><p className="text-[10px] text-gray-400 mt-0.5">Comma-separated</p></div>
                                                </div>
                                            ) : (
                                                <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500/50 outline-none text-sm"><option value="">Choose a job...</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
                                            )}
                                        </div>
                                        <div className="bg-gray-50 rounded-xl border border-gray-200/60 p-4">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5"><Users className="w-3.5 h-3.5 inline mr-1 text-gray-500" />Target Shortlist</label>
                                            <input type="number" min={1} max={500} value={targetCount} onChange={(e) => setTargetCount(parseInt(e.target.value) || 10)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500/50 outline-none text-sm" />
                                        </div>
                                    </div>
                                    {/* Upload Zone */}
                                    <div className="col-span-2">
                                        <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${isDragging ? 'border-gray-500 bg-gray-50/50 scale-[1.01]' : file ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                                            <div className="flex flex-col items-center justify-center py-12 px-6">
                                                {file ? (
                                                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                                                        <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                                        <p className="font-semibold text-gray-900">{file.name}</p>
                                                        <p className="text-sm text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                                                        <button onClick={() => setFile(null)} className="mt-3 text-sm text-rose-600 hover:text-rose-700 font-medium">Remove</button>
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        <Upload className={`w-12 h-12 mb-3 ${isDragging ? 'text-gray-500' : 'text-gray-300'} transition-colors`} />
                                                        <p className="font-semibold text-gray-700">{isDragging ? 'Drop here!' : 'Drag & drop your spreadsheet'}</p>
                                                        <p className="text-sm text-gray-400 mt-1 mb-3">Excel (.xlsx) or CSV files</p>
                                                        <label className="px-4 py-2 bg-gray-600 text-white rounded-xl font-medium cursor-pointer hover:bg-gray-700 transition-colors text-sm">Browse Files<input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} /></label>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium flex items-center"><XCircle className="w-4 h-4 mr-2 flex-shrink-0" />{error}</motion.div>}</AnimatePresence>
                                        <motion.button onClick={handleUpload} disabled={processing} className={`w-full mt-4 py-3.5 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center ${processing ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`} whileHover={{ scale: processing ? 1 : 1.01 }} whileTap={{ scale: 0.99 }}>
                                            {processing ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />AI is processing...</> : <><Sparkles className="w-5 h-5 mr-2" />Launch AI Automation</>}
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
