import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase, Plus, Loader2, X, ChevronRight, Clock, Users, Star,
    Sparkles, Search, Filter, MoreHorizontal, Eye, Trash2, Edit3
} from 'lucide-react';

interface Job {
    id: string;
    title: string;
    description: string;
    skills_required: string[];
    company_id: string;
    created_at: string;
}

export const JobsPage: React.FC = () => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // Create Job modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newSkills, setNewSkills] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

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

    useEffect(() => { fetchJobs(); }, []);

    const handleGenerateJD = async () => {
        if (!newTitle || !newSkills) return;
        setGenerating(true);
        try {
            const { data } = await api.post('/jobs/generate-jd', {
                title: newTitle,
                skills: newSkills.split(',').map(s => s.trim())
            });
            setNewDescription(data.generated_jd);
        } catch { alert("Failed to generate JD"); }
        finally { setGenerating(false); }
    };

    const handleSaveJob = async () => {
        setSaving(true);
        try {
            await api.post('/jobs/', {
                title: newTitle,
                description: newDescription,
                skills_required: newSkills.split(',').map(s => s.trim())
            });
            setIsModalOpen(false);
            setNewTitle(''); setNewSkills(''); setNewDescription('');
            fetchJobs();
        } catch { alert("Failed to save job"); }
        finally { setSaving(false); }
    };

    const filteredJobs = jobs.filter(j =>
        j.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                        Jobs & Requisitions
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Manage all your open positions and requirements.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-sm"
                >
                    <Plus className="w-5 h-5 mr-2" /> Create Job
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search jobs by title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-white"
                />
            </div>

            {/* Job Count */}
            <div className="flex items-center space-x-4 mb-6">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold border border-indigo-100">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
            </div>

            {/* Jobs Grid */}
            {filteredJobs.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                >
                    <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No jobs yet</h3>
                    <p className="text-slate-500 mb-6">Create your first job requisition to start hiring.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5 mr-2 inline" /> Create First Job
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredJobs.map((job, i) => (
                        <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                            className={`bg-white rounded-2xl border p-6 cursor-pointer transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1 ${selectedJob?.id === job.id
                                    ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                    : 'border-slate-200/60 shadow-premium'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100/50">
                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-xs text-slate-400 font-medium">
                                    {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-slate-900 mb-2">{job.title}</h3>

                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {(job.skills_required || []).slice(0, 4).map((skill, si) => (
                                    <span key={si} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                                        {skill}
                                    </span>
                                ))}
                                {(job.skills_required || []).length > 4 && (
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                                        +{job.skills_required.length - 4}
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                                {job.description?.substring(0, 120)}{job.description?.length > 120 ? '...' : ''}
                            </p>

                            {/* Expand detail */}
                            <AnimatePresence>
                                {selectedJob?.id === job.id && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-slate-100"
                                    >
                                        <p className="text-sm text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {job.description}
                                        </p>
                                        <div className="mt-4 flex gap-2">
                                            <a
                                                href={`/bulk-upload`}
                                                className="flex-1 text-center text-sm py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
                                            >
                                                Bulk Hire for This Role
                                            </a>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Job Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setIsModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-display font-bold text-slate-900">Create New Job</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                                    <input
                                        type="text"
                                        value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        placeholder="e.g. Senior Backend Engineer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills</label>
                                    <input
                                        type="text"
                                        value={newSkills}
                                        onChange={e => setNewSkills(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        placeholder="Python, FastAPI, PostgreSQL"
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateJD}
                                    disabled={generating || !newTitle}
                                    className="w-full py-2.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl hover:bg-violet-100 transition-all font-medium disabled:opacity-50"
                                >
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Sparkles className="w-4 h-4 inline mr-2" />}
                                    {generating ? 'Generating...' : 'AI Generate Description'}
                                </button>
                                {newDescription && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            value={newDescription}
                                            onChange={e => setNewDescription(e.target.value)}
                                            rows={8}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={handleSaveJob}
                                    disabled={saving || !newTitle}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin inline" /> : 'Publish Job'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
