import React, { useState } from 'react';
import { api } from '../lib/api';
import { Mail, Phone, Star, FileText, Anchor, GripVertical, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const KANBAN_COLUMNS = ['Applied', 'Screening', 'Assessment', 'Interview', 'Offer', 'Rejected'];

interface Candidate {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    parsed_skills: string[];
    match_score: number | null;
}

export const JobPipeline: React.FC<{ jobId: string, onBack: () => void }> = ({ jobId, onBack }) => {
    const [candidates, setCandidates] = React.useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        fetchCandidates();
    }, [jobId]);

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
        // Optimistic UI update
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
        try {
            await api.patch(`/candidates/${candidateId}/status`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update status", error);
            fetchCandidates(); // Revert on failure
        }
    };

    const getCandidatesByStatus = (status: string) => candidates.filter(c => c.status === status);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-24 text-slate-500 min-h-[500px]">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
                <Anchor className="w-8 h-8 text-indigo-500 mb-4" />
            </motion.div>
            <p className="font-medium animate-pulse">Loading Pipeline...</p>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col h-full space-y-6"
        >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                <div className="flex items-center space-x-6">
                    <button
                        onClick={onBack}
                        className="flex items-center justify-center w-10 h-10 bg-white border border-slate-200 rounded-xl text-slate-500 shadow-sm hover:shadow-md hover:text-indigo-600 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Backend Engineering Lead</h1>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">Recruitment Pipeline Visualizer</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 flex items-center">
                        Total Pool: {candidates.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden hide-scrollbar pb-6 pt-2">
                <div className="flex space-x-5 h-full items-start">
                    {KANBAN_COLUMNS.map((column, colIdx) => (
                        <motion.div
                            key={column}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: colIdx * 0.05 }}
                            className="flex-shrink-0 w-[340px] flex flex-col bg-slate-50/50 rounded-2xl min-h-[60vh] max-h-[80vh] border border-slate-200/60 shadow-inner overflow-hidden"
                        >
                            <div className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-200/60 backdrop-blur-md sticky top-0 z-10">
                                <h3 className="font-display font-semibold text-slate-800 tracking-wide text-sm uppercase">{column}</h3>
                                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200/80">
                                    {getCandidatesByStatus(column).length}
                                </span>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1 hide-scrollbar">
                                <AnimatePresence>
                                    {getCandidatesByStatus(column).map((candidate) => (
                                        <motion.div
                                            key={candidate.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-premium transition-all duration-300 group relative"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center">
                                                    <GripVertical className="w-4 h-4 text-slate-300 mr-1.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
                                                    {candidate.name}
                                                </h4>
                                                {candidate.match_score && (
                                                    <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/50">
                                                        <Star className="w-3.5 h-3.5 mr-1 fill-amber-500 text-amber-500" />
                                                        {candidate.match_score}% Match
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {candidate.email && (
                                                    <div className="flex items-center text-xs font-medium text-slate-500">
                                                        <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> <span className="truncate">{candidate.email}</span>
                                                    </div>
                                                )}
                                                {candidate.phone && (
                                                    <div className="flex items-center text-xs font-medium text-slate-500">
                                                        <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" /> <span className="truncate">{candidate.phone}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {candidate.parsed_skills && candidate.parsed_skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-5">
                                                    {candidate.parsed_skills.slice(0, 3).map(skill => (
                                                        <span key={skill} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] uppercase font-bold tracking-wider rounded-md border border-indigo-100">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {candidate.parsed_skills.length > 3 && (
                                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider rounded-md border border-slate-200">
                                                            +{candidate.parsed_skills.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-4 border-t border-slate-100/80">
                                                <button className="text-[11px] uppercase font-bold tracking-wider text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 flex items-center transition-colors">
                                                    <FileText className="w-3 h-3 mr-1.5" /> Resume
                                                </button>

                                                <select
                                                    value={candidate.status}
                                                    onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                                                    className="text-[11px] uppercase font-bold tracking-wider border-slate-200 rounded-lg text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-sm py-1.5 pl-3 pr-8 appearance-none cursor-pointer outline-none hover:border-slate-300 transition-colors"
                                                >
                                                    {KANBAN_COLUMNS.map(col => (
                                                        <option key={col} value={col}>{col}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {getCandidatesByStatus(column).length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-50 p-6 text-center">
                                        <div className="w-12 h-12 border-2 border-dashed border-slate-300 rounded-xl mb-3"></div>
                                        <p className="text-sm font-medium text-slate-500">No candidates in {column}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
