import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileSpreadsheet, Target, Zap, CheckCircle2,
    XCircle, Loader2, Users, Award, BarChart3,
    Sparkles
} from 'lucide-react';

interface Campaign {
    id: string;
    status: string;
    total_uploaded: number;
    target_shortlist: number;
    scored_count: number;
    shortlisted_count: number;
    rejected_count: number;
    progress_percent: number;
}

interface ShortlistedCandidate {
    id: string;
    name: string;
    email: string;
    ai_score: number;
    ai_reasoning: string;
    skills: string[];
    experience_years: number;
    education: string;
    status: string;
    assessment?: {
        submission_id: string;
        status: string;
        score: number | null;
        assessment_link: string;
    } | null;
    notification?: {
        type: string;
        status: string;
        sent_at: string;
        assessment_link: string;
    } | null;
}

interface CampaignResults {
    campaign: { id: string; status: string; total_uploaded: number; target_shortlist: number };
    shortlisted: ShortlistedCandidate[];
    rejected_count: number;
    notifications_sent: number;
    score_distribution: { "90+": number; "70-89": number; "50-69": number; below_50: number };
}

export const BulkUpload: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [targetCount, setTargetCount] = useState(10);
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Inline job creation
    const [jobMode, setJobMode] = useState<'existing' | 'custom'>('custom');
    const [customJobTitle, setCustomJobTitle] = useState('');
    const [customSkills, setCustomSkills] = useState('');

    const [processing, setProcessing] = useState(false);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [results, setResults] = useState<CampaignResults | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            api.get('/jobs/').then(({ data }) => setJobs(data));
        }
    }, [user]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setError('');
        } else {
            setError('Please upload an Excel (.xlsx) or CSV file.');
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a CSV or Excel file first.');
            return;
        }

        setProcessing(true);
        setError('');
        setCampaign(null);
        setResults(null);

        try {
            let jobId = selectedJobId;

            // If custom mode, create the job first
            if (jobMode === 'custom') {
                if (!customJobTitle) {
                    setError('Please enter a job title.');
                    setProcessing(false);
                    return;
                }
                const skillsList = customSkills.split(',').map(s => s.trim()).filter(Boolean);
                const { data: newJob } = await api.post('/jobs/', {
                    title: customJobTitle,
                    description: `Hiring for ${customJobTitle}. Required skills: ${skillsList.join(', ')}`,
                    skills_required: skillsList,
                });
                jobId = newJob.id;
            }

            if (!jobId) {
                setError('Please select or create a job first.');
                setProcessing(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('job_id', jobId);
            formData.append('target_shortlist', targetCount.toString());

            const { data } = await api.post('/bulk/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCampaign(data);

            // Fetch detailed results
            const resultsRes = await api.get(`/bulk/campaign/${data.id}/results`);
            setResults(resultsRes.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setCampaign(null);
        setResults(null);
        setError('');
    };

    // ─── Results View ───
    if (results && campaign) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mr-3" />
                            Campaign Complete
                        </h1>
                        <p className="text-slate-500 mt-1">AI has processed all {campaign.total_uploaded} candidates and shortlisted the top {campaign.shortlisted_count}.</p>
                    </div>
                    <button onClick={handleReset} className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-xl shadow-md hover:bg-slate-800 transition-all text-sm font-medium">
                        <Zap className="w-4 h-4 mr-2" />
                        New Campaign
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-5">
                    {[
                        { label: 'Total Uploaded', value: campaign.total_uploaded, icon: Upload, color: 'indigo' },
                        { label: 'AI Scored', value: campaign.scored_count, icon: Sparkles, color: 'violet' },
                        { label: 'Shortlisted', value: campaign.shortlisted_count, icon: Award, color: 'emerald' },
                        { label: 'Rejected', value: campaign.rejected_count, icon: XCircle, color: 'rose' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
                            </div>
                            <p className="text-3xl font-display font-bold text-slate-900 mt-2">{stat.value}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Score Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <h3 className="font-display font-semibold text-slate-900 mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                        Score Distribution
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { range: '90+', count: results.score_distribution['90+'], color: 'bg-emerald-500', label: 'Excellent' },
                            { range: '70-89', count: results.score_distribution['70-89'], color: 'bg-blue-500', label: 'Good' },
                            { range: '50-69', count: results.score_distribution['50-69'], color: 'bg-amber-500', label: 'Average' },
                            { range: '<50', count: results.score_distribution.below_50, color: 'bg-rose-500', label: 'Poor' },
                        ].map((bucket) => (
                            <div key={bucket.range} className="text-center">
                                <div className="h-24 flex items-end justify-center mb-2">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.max(10, (bucket.count / campaign.total_uploaded) * 100)}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        className={`w-12 ${bucket.color} rounded-t-lg`}
                                    />
                                </div>
                                <p className="text-sm font-bold text-slate-700">{bucket.count}</p>
                                <p className="text-xs text-slate-500">{bucket.label} ({bucket.range})</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pipeline Progress */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                    <h3 className="font-display font-semibold text-slate-900 mb-4 flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-violet-500" />
                        Pipeline Progress
                    </h3>
                    <div className="flex items-center justify-between">
                        {[
                            { step: 'Upload', done: true },
                            { step: 'AI Scoring', done: true },
                            { step: 'Shortlisted', done: true },
                            { step: 'Assessments Sent', done: (results.notifications_sent || 0) > 0 },
                            { step: 'Final Ranking', done: results.shortlisted.some((c: any) => c.assessment?.status === 'completed') },
                        ].map((s, i) => (
                            <React.Fragment key={s.step}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                        }`}>{i + 1}</div>
                                    <p className={`text-xs mt-1.5 font-medium ${s.done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.step}</p>
                                </div>
                                {i < 4 && <div className={`flex-1 h-0.5 mx-2 mt-[-16px] ${s.done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Shortlisted Candidates Table */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="font-display font-semibold text-slate-900 flex items-center">
                            <Award className="w-5 h-5 text-emerald-500 mr-2" />
                            Shortlisted Candidates ({results.shortlisted.length})
                        </h3>
                        {(results.notifications_sent || 0) > 0 && (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                📧 {results.notifications_sent} notifications sent
                            </span>
                        )}
                    </div>
                    <div className="divide-y divide-slate-100">
                        {results.shortlisted.map((candidate: any, i: number) => (
                            <motion.div
                                key={candidate.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-5 hover:bg-slate-50/80 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                            {candidate.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-slate-900">{candidate.name}</h4>
                                            <p className="text-sm text-slate-500 truncate">{candidate.email || 'No email'} · {candidate.experience_years || 0} yrs · {candidate.education || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 flex-shrink-0">
                                        {/* Skills */}
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {(candidate.skills || []).slice(0, 2).map((s: string) => (
                                                <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold rounded-md border border-indigo-100">{s}</span>
                                            ))}
                                        </div>
                                        {/* AI Score */}
                                        <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${candidate.ai_score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                            candidate.ai_score >= 60 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                            {candidate.ai_score}%
                                        </div>
                                        {/* Assessment Status */}
                                        {candidate.assessment && (
                                            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${candidate.assessment.status === 'completed'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : candidate.assessment.status === 'pending'
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                                                }`}>
                                                {candidate.assessment.status === 'completed'
                                                    ? `✅ ${candidate.assessment.score}pts`
                                                    : '⏳ Pending'}
                                            </div>
                                        )}
                                        {/* Notification badge */}
                                        {candidate.notification && (
                                            <span className="text-xs" title={`Email: ${candidate.notification.type}`}>📧</span>
                                        )}
                                    </div>
                                </div>
                                {/* Assessment link */}
                                {candidate.assessment?.assessment_link && (
                                    <div className="mt-2 ml-14">
                                        <a
                                            href={candidate.assessment.assessment_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                                        >
                                            🔗 Assessment Link: {candidate.assessment.assessment_link}
                                        </a>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    // ─── Upload View ───
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center">
                    <Zap className="w-8 h-8 text-indigo-500 mr-3" />
                    Bulk Hire — AI Automation
                </h1>
                <p className="text-slate-500 mt-1">Upload a spreadsheet of candidates. AI will score, rank, and auto-shortlist the top matches.</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Column — Configuration */}
                <div className="col-span-1 space-y-5">
                    {/* Job Configuration */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            <Target className="w-4 h-4 inline mr-1.5 text-indigo-500" />
                            Job Requirements
                        </label>

                        {/* Tabs */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5 mb-4">
                            <button
                                onClick={() => setJobMode('custom')}
                                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${jobMode === 'custom' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                ✨ Custom
                            </button>
                            <button
                                onClick={() => setJobMode('existing')}
                                className={`flex-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${jobMode === 'existing' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                📋 Existing
                            </button>
                        </div>

                        {jobMode === 'custom' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Job Title</label>
                                    <input
                                        type="text"
                                        value={customJobTitle}
                                        onChange={(e) => setCustomJobTitle(e.target.value)}
                                        placeholder="e.g. Senior Python Developer"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Required Skills</label>
                                    <input
                                        type="text"
                                        value={customSkills}
                                        onChange={(e) => setCustomSkills(e.target.value)}
                                        placeholder="Python, Django, AWS, Docker"
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Comma-separated. AI uses these to score each candidate.</p>
                                </div>
                            </div>
                        ) : (
                            <select
                                value={selectedJobId}
                                onChange={(e) => setSelectedJobId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm"
                            >
                                <option value="">Choose a job...</option>
                                {jobs.map(j => (
                                    <option key={j.id} value={j.id}>{j.title}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Target Count */}
                    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            <Users className="w-4 h-4 inline mr-1.5 text-indigo-500" />
                            Target Shortlist Count
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={500}
                            value={targetCount}
                            onChange={(e) => setTargetCount(parseInt(e.target.value) || 10)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-2">AI will shortlist the top {targetCount} candidates by score.</p>
                    </div>

                    {/* Expected Format */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                        <h4 className="text-sm font-bold text-indigo-900 mb-2">📋 Expected Columns</h4>
                        <ul className="text-xs text-indigo-700 space-y-1">
                            <li><strong>Name</strong> (required)</li>
                            <li>Email, Phone</li>
                            <li>Skills / Tech Stack</li>
                            <li>Experience (years)</li>
                            <li>Education / Degree</li>
                            <li>Current Company</li>
                        </ul>
                    </div>
                </div>

                {/* Right Column — Upload Zone */}
                <div className="col-span-2">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${isDragging
                            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                            : file
                                ? 'border-emerald-300 bg-emerald-50/30'
                                : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/20'
                            }`}
                    >
                        <div className="flex flex-col items-center justify-center py-16 px-8">
                            {file ? (
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                                    <FileSpreadsheet className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                    <p className="text-lg font-semibold text-slate-900">{file.name}</p>
                                    <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="mt-4 text-sm text-rose-600 hover:text-rose-700 font-medium"
                                    >
                                        Remove file
                                    </button>
                                </motion.div>
                            ) : (
                                <>
                                    <Upload className={`w-16 h-16 mb-4 ${isDragging ? 'text-indigo-500' : 'text-slate-300'} transition-colors`} />
                                    <p className="text-lg font-semibold text-slate-700">
                                        {isDragging ? 'Drop your file here!' : 'Drag & drop your spreadsheet'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1 mb-4">Excel (.xlsx) or CSV files</p>
                                    <label className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium cursor-pointer hover:bg-indigo-700 transition-colors shadow-md text-sm">
                                        Browse Files
                                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium flex items-center">
                                <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Launch Button */}
                    <motion.button
                        onClick={handleUpload}
                        disabled={processing}
                        className={`w-full mt-6 py-4 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center ${processing
                            ? 'bg-slate-400 cursor-not-allowed'
                            : file && (jobMode === 'custom' ? customJobTitle : selectedJobId)
                                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700'
                                : 'bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500'
                            }`}
                        whileHover={{ scale: processing ? 1 : 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                AI is processing candidates...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-6 h-6 mr-3" />
                                Launch AI Automation
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
