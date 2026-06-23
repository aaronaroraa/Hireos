import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown, Save } from 'lucide-react';

interface Stage {
    name: string;
    description: string;
    email_subject: string;
    email_body: string;
}

const DEFAULT_STAGE: Stage = {
    name: '',
    description: '',
    email_subject: '',
    email_body: '',
};

export const PipelineConfigPage: React.FC = () => {
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

    const [agentName, setAgentName] = useState('HireOS');
    const [agentTagline, setAgentTagline] = useState('AI Hiring Platform');
    const [savingPersona, setSavingPersona] = useState(false);
    const [personaSaved, setPersonaSaved] = useState(false);

    useEffect(() => {
        api.get('/pipeline/persona')
            .then(({ data }) => { setAgentName(data.agent_name); setAgentTagline(data.agent_tagline); })
            .catch(() => {});
    }, []);

    const savePersona = async () => {
        setSavingPersona(true);
        try {
            await api.put('/pipeline/persona', { agent_name: agentName, agent_tagline: agentTagline });
            setPersonaSaved(true);
            setTimeout(() => setPersonaSaved(false), 3000);
        } catch { alert('Failed to save persona.'); }
        finally { setSavingPersona(false); }
    };

    useEffect(() => {
        Promise.all([
            api.get('/pipeline/').catch(() => ({ data: [] })),
            api.get('/pipeline/defaults'),
        ]).then(([configRes, defaultRes]) => {
            const configs = configRes.data as any[];
            if (configs.length > 0 && configs[0].stages?.length > 0) {
                setStages(configs[0].stages);
            } else {
                setStages(defaultRes.data.stages);
            }
        }).catch(() => {
            setStages([
                { name: 'Founder Round', description: 'A 45-minute conversation with the founding team.', email_subject: '', email_body: '' },
                { name: 'Technical Interview', description: 'A 60-minute technical deep-dive.', email_subject: '', email_body: '' },
            ]);
        }).finally(() => setLoading(false));
    }, []);

    const addStage = () => {
        setStages(s => [...s, { ...DEFAULT_STAGE }]);
        setExpandedIdx(stages.length);
    };

    const removeStage = (idx: number) => {
        setStages(s => s.filter((_, i) => i !== idx));
        setExpandedIdx(null);
    };

    const updateStage = (idx: number, field: keyof Stage, value: string) => {
        setStages(s => s.map((stage, i) => i === idx ? { ...stage, [field]: value } : stage));
    };

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        setStages(s => { const n = [...s]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; });
        setExpandedIdx(idx - 1);
    };

    const moveDown = (idx: number) => {
        if (idx === stages.length - 1) return;
        setStages(s => { const n = [...s]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; });
        setExpandedIdx(idx + 1);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/pipeline/', { stages });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-black tracking-tight">Pipeline Stages</h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        Configure the interview rounds that follow the AI mock interview. Each stage triggers an automated email.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn flex items-center px-4 py-2.5 text-sm"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving...</>
                    ) : saved ? (
                        <>Saved</>
                    ) : (
                        <><Save className="w-4 h-4 mr-1.5" />Save Changes</>
                    )}
                </button>
            </div>

            {/* Agent persona */}
            <div className="card p-5">
                <p className="text-sm font-bold text-black mb-1">AI Agent Persona</p>
                <p className="text-xs text-gray-400 mb-4">The name your AI hiring agent uses in emails and the candidate portal.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Agent Name</label>
                        <input
                            value={agentName}
                            onChange={e => setAgentName(e.target.value)}
                            placeholder="e.g. HireOS"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Tagline</label>
                        <input
                            value={agentTagline}
                            onChange={e => setAgentTagline(e.target.value)}
                            placeholder="e.g. AI Hiring Platform"
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                        />
                    </div>
                </div>
                <button onClick={savePersona} disabled={savingPersona} className="btn px-4 py-2 text-sm mt-4">
                    {savingPersona ? <Loader2 className="w-4 h-4 animate-spin" /> : personaSaved ? 'Saved' : 'Save Persona'}
                </button>
            </div>

            {/* Fixed first stage */}
            <div className="card p-4 opacity-60">
                <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">1</div>
                    <div>
                        <p className="text-sm font-bold text-black">AI Mock Interview</p>
                        <p className="text-xs text-gray-400">Always first. Automated and self-serve.</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wide">Fixed</span>
                </div>
            </div>

            {/* Configurable stages */}
            <div className="space-y-3">
                {stages.map((stage, idx) => (
                    <div key={idx} className="card overflow-hidden">
                        {/* Stage header */}
                        <div
                            className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white">
                                    {idx + 2}
                                </div>
                                <p className="text-sm font-bold text-black">{stage.name || `Round ${idx + 2}`}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={(e) => { e.stopPropagation(); moveUp(idx); }} disabled={idx === 0} className="p-1.5 text-gray-400 hover:text-black disabled:opacity-20 rounded transition-colors">
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveDown(idx); }} disabled={idx === stages.length - 1} className="p-1.5 text-gray-400 hover:text-black disabled:opacity-20 rounded transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); removeStage(idx); }} className="p-1.5 text-gray-400 hover:text-black rounded transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Expanded editor */}
                        {expandedIdx === idx && (
                            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Stage Name</label>
                                    <input
                                        value={stage.name}
                                        onChange={e => updateStage(idx, 'name', e.target.value)}
                                        placeholder="e.g. Founder Round"
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">Description</label>
                                    <input
                                        value={stage.description}
                                        onChange={e => updateStage(idx, 'description', e.target.value)}
                                        placeholder="Brief description shown in the email to candidates"
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-black focus:border-black outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-black uppercase tracking-wide mb-1.5">
                                        Email Body <span className="text-gray-400 normal-case font-normal">(optional — leave blank to use default template)</span>
                                    </label>
                                    <textarea
                                        value={stage.email_body}
                                        onChange={e => updateStage(idx, 'email_body', e.target.value)}
                                        rows={6}
                                        placeholder={`Hi {candidate_name},\n\nYou've been selected to move to the ${stage.name || 'next round'}...\n\n(Leave blank to use the default template)`}
                                        className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm font-mono leading-relaxed resize-none focus:ring-1 focus:ring-black outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Available variables: {'{candidate_name}'}, {'{job_title}'}, {'{stage_name}'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add stage */}
            <button
                onClick={addStage}
                className="btn-ghost w-full py-3 text-sm flex items-center justify-center border-dashed"
            >
                <Plus className="w-4 h-4 mr-1.5" />Add Stage
            </button>

            {/* Fixed last stage */}
            <div className="card p-4 opacity-60">
                <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold text-gray-500">
                        {stages.length + 2}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-black">Offer / Rejected</p>
                        <p className="text-xs text-gray-400">Final outcome. Automated email dispatched.</p>
                    </div>
                    <span className="ml-auto text-xs font-semibold text-gray-400 uppercase tracking-wide">Fixed</span>
                </div>
            </div>
        </div>
    );
};
