import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, Briefcase, FileText, UploadCloud, Sparkles, Plus, Loader2, X, ChevronRight, TrendingUp } from 'lucide-react';
import { JobPipeline } from './JobPipeline';
import { motion, AnimatePresence } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, trend, delay }: { title: string, value: string, icon: any, trend: string, delay: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-premium hover:shadow-premium-hover hover:-translate-y-1 transition-all duration-300"
    >
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <h3 className="text-3xl font-display font-bold text-slate-900 mt-2 tracking-tight">{value}</h3>
            </div>
            <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100/50">
                <Icon className="w-6 h-6 text-indigo-600 drop-shadow-sm" />
            </div>
        </div>
        <div className="mt-5 flex items-center text-sm">
            <div className="flex items-center text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {trend}
            </div>
            <span className="text-slate-400 ml-2 text-xs font-medium">vs last month</span>
        </div>
    </motion.div>
);

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

    const fetchJobs = async () => {
        try {
            const { data } = await api.get('/jobs/');
            setJobs(data);
        } catch (err) {
            console.error("Failed to fetch jobs", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [user]);

    const handleGenerateJD = async () => {
        if (!newTitle || !newSkills) return;
        setGenerating(true);
        try {
            const { data } = await api.post('/jobs/generate-jd', {
                title: newTitle,
                skills: newSkills.split(',').map(s => s.trim())
            });
            setGeneratedJD(data.generated_jd);
        } catch (error) {
            console.error(error);
            alert("Failed to generate JD");
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveJob = async () => {
        try {
            await api.post('/jobs/', {
                title: newTitle,
                description: generatedJD,
                skills_required: newSkills.split(',').map(s => s.trim())
            });
            setIsModalOpen(false);
            setNewTitle('');
            setNewSkills('');
            setGeneratedJD('');
            fetchJobs();
        } catch (error) {
            console.error(error);
            alert("Failed to save job");
        }
    };

    const handleResumeUpload = async (jobId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('job_id', jobId);

        try {
            await api.post('/resumes/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Resume parsed successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to parse resume.");
        }
    };

    if (selectedJobId) {
        return <JobPipeline jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
    }

    return (
        <div className="space-y-8 relative pb-10">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
                className="flex items-end justify-between"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 mt-1">Manage your active reqs and track candidate flow.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-xl shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] hover:bg-slate-800 hover:shadow-lg transition-all duration-200 text-sm font-medium"
                >
                    <Plus className="w-5 h-5 mr-1.5" />
                    Create New Job
                </button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Jobs" value={jobs.length.toString()} icon={Briefcase} trend="2.5%" delay={0.1} />
                <StatCard title="Total Candidates" value="845" icon={Users} trend="12.3%" delay={0.2} />
                <StatCard title="Resumes Parsed" value="620" icon={FileText} trend="24.1%" delay={0.3} />
                <StatCard title="Auto-Shortlisted" value="142" icon={Sparkles} trend="8.4%" delay={0.4} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white border border-slate-200/60 rounded-2xl shadow-premium overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-display font-semibold text-slate-900">Active Requisitions</h3>
                    <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {jobs.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Briefcase className="w-8 h-8 text-slate-400" />
                                </div>
                                <p className="text-slate-500 font-medium">No open jobs found.</p>
                                <p className="text-slate-400 text-sm mt-1">Create your first job req to start hiring.</p>
                            </div>
                        ) : jobs.map((job) => (
                            <div key={job.id} className="p-5 hover:bg-slate-50/80 transition-colors flex items-center justify-between group">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100 mr-4">
                                        <Briefcase className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{job.title}</h4>
                                        <div className="mt-1 flex items-center space-x-3 text-sm text-slate-500">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${job.status === 'Open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {job.status}
                                            </span>
                                            <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1" /> 0 applicants</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-3 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded-lg hover:bg-indigo-100 hover:border-indigo-300 flex items-center shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2">
                                        <UploadCloud className="w-4 h-4 mr-1.5" />
                                        Upload Resume
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf"
                                            onChange={(e) => handleResumeUpload(job.id, e)}
                                        />
                                    </label>
                                    <button
                                        onClick={() => setSelectedJobId(job.id)}
                                        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 border border-transparent rounded-lg hover:bg-slate-800 shadow-sm hover:shadow-md flex items-center transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                                    >
                                        Pipeline
                                        <ChevronRight className="w-4 h-4 ml-1.5 opacity-70" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/50"
                        >
                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                                <h2 className="text-xl font-display font-bold text-slate-900 flex items-center">
                                    <div className="p-1.5 bg-indigo-100 rounded-md mr-3">
                                        <Sparkles className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    AI Job Generation
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/30">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Title</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        placeholder="e.g. Senior Staff Engineer"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none shadow-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Core Skills (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={newSkills}
                                        onChange={(e) => setNewSkills(e.target.value)}
                                        placeholder="e.g. React, Next.js, Node.js, GraphqL"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none shadow-sm"
                                    />
                                </div>

                                <button
                                    onClick={handleGenerateJD}
                                    disabled={generating || !newTitle}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed flex justify-center items-center shadow-md transition-all duration-300 group"
                                >
                                    {generating ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-white/80" />
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                            Auto-Generate Description
                                        </>
                                    )}
                                </button>

                                {generatedJD && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                                        <label className="block text-sm font-bold text-slate-900 mb-2">Review Generated JD</label>
                                        <div className="relative">
                                            <textarea
                                                value={generatedJD}
                                                onChange={(e) => setGeneratedJD(e.target.value)}
                                                rows={12}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none shadow-sm font-sans leading-relaxed resize-none"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end space-x-3">
                                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors focus:ring-2 focus:ring-slate-200 outline-none">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveJob}
                                    disabled={!generatedJD}
                                    className="px-6 py-2.5 text-sm bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 outline-none"
                                >
                                    Publish Active Requisition
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
