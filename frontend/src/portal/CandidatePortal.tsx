import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { candidateApi } from '../lib/candidateApi';
import { ChatInterview } from './ChatInterview';
import { Loader2, FileText, Circle, CheckCircle2, UploadCloud, Check } from 'lucide-react';

type Tab = 'overview' | 'profile' | 'timeline' | 'schedule' | 'messages' | 'settings' | 'about';

interface Me {
    candidate_name: string;
    email: string;
    application_id: string;
    status: string;
    closed: boolean;
    job_title: string;
    applied_at: string | null;
    agent_name: string;
    agent_tagline: string;
    company_name: string;
}

const NAV: { key: Tab; label: string; group: 'workspace' | 'account' }[] = [
    { key: 'overview', label: 'Overview', group: 'workspace' },
    { key: 'profile', label: 'Profile', group: 'workspace' },
    { key: 'timeline', label: 'Timeline', group: 'workspace' },
    { key: 'schedule', label: 'Schedule', group: 'workspace' },
    { key: 'messages', label: 'Messages', group: 'workspace' },
    { key: 'settings', label: 'Settings', group: 'account' },
    { key: 'about', label: 'About', group: 'account' },
];

function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return '—'; }
}

const StatusPill: React.FC<{ status: string; closed: boolean }> = ({ status, closed }) => (
    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-gray-200">
        <span className={`w-1.5 h-1.5 rounded-full ${closed ? 'bg-gray-400' : 'bg-black'}`} />
        <span className="text-xs font-mono font-semibold text-black">{status}</span>
    </div>
);

export const CandidatePortal: React.FC = () => {
    const navigate = useNavigate();
    const { tab } = useParams<{ tab: string }>();
    const active = (tab as Tab) || 'overview';

    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        candidateApi.get('/candidate/me')
            .then(({ data }) => setMe(data))
            .catch(() => navigate('/portal/login'))
            .finally(() => setLoading(false));
    }, []);

    const logout = () => {
        sessionStorage.removeItem('candidate_token');
        navigate('/portal/login');
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );
    if (!me) return null;

    const idx = (k: Tab) => String(NAV.findIndex(n => n.key === k) + 1).padStart(2, '0');

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar */}
            <aside className="w-60 flex-shrink-0 border-r border-gray-200 flex flex-col h-screen sticky top-0">
                {/* Brand */}
                <div className="px-6 py-6">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-md border-2 border-black flex items-center justify-center">
                            <div className="w-3 h-3 bg-black rounded-sm rotate-45" />
                        </div>
                        <div>
                            <p className="text-base font-display font-bold text-black leading-none tracking-tight">{me.agent_name}</p>
                            <p className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] mt-1">{me.agent_tagline.toUpperCase()}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 overflow-y-auto hide-scrollbar">
                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">Workspace</p>
                    {NAV.filter(n => n.group === 'workspace').map(n => (
                        <button
                            key={n.key}
                            onClick={() => navigate(`/portal/${n.key}`)}
                            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                                active === n.key ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'
                            }`}
                        >
                            <span className={`text-[11px] font-mono mr-3 ${active === n.key ? 'text-gray-400' : 'text-gray-300'}`}>{idx(n.key)}</span>
                            {n.label}
                        </button>
                    ))}

                    <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-5">Account</p>
                    {NAV.filter(n => n.group === 'account').map(n => (
                        <button
                            key={n.key}
                            onClick={() => navigate(`/portal/${n.key}`)}
                            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                                active === n.key ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'
                            }`}
                        >
                            <span className={`text-[11px] font-mono mr-3 ${active === n.key ? 'text-gray-400' : 'text-gray-300'}`}>{idx(n.key)}</span>
                            {n.label}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top bar */}
                <div className="px-10 py-5 flex items-center justify-between border-b border-gray-100">
                    <StatusPill status={me.closed ? 'Closed' : me.status} closed={me.closed} />
                    <button onClick={logout} className="text-xs font-semibold text-gray-400 hover:text-black transition-colors">
                        Sign out
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-10 py-10 hide-scrollbar">
                    <div className="max-w-3xl">
                        {active === 'overview' && <OverviewTab me={me} onGoSchedule={() => navigate('/portal/schedule')} />}
                        {active === 'profile' && <ProfileTab />}
                        {active === 'timeline' && <TimelineTab />}
                        {active === 'schedule' && <ScheduleTab me={me} />}
                        {active === 'messages' && <MessagesTab agentName={me.agent_name} />}
                        {active === 'settings' && <SettingsTab me={me} />}
                        {active === 'about' && <AboutTab me={me} />}
                    </div>
                </div>
            </main>
        </div>
    );
};

// ── Overview ──────────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ me: Me; onGoSchedule: () => void }> = ({ me, onGoSchedule }) => (
    <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{me.company_name}</p>
        <h1 className="text-3xl font-display font-bold text-black mb-8">Welcome, {me.candidate_name.split(' ')[0]}.</h1>
        {me.closed ? (
            <div className="card p-8 text-center">
                <p className="font-bold text-black mb-1">Closed</p>
                <p className="text-sm text-gray-500">This application is closed. We appreciate the time you put into applying.</p>
            </div>
        ) : (
            <div className="card p-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Role you applied for</p>
                <p className="text-lg font-bold text-black mb-0.5">{me.job_title}</p>
                <p className="text-sm text-gray-400 mb-5">at {me.company_name}</p>
                <div className="border-t border-gray-100 pt-4 mb-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Current step</p>
                    <p className="text-sm font-bold text-black">{me.status}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Your first-round AI interview with {me.agent_name} is ready whenever you are.
                        Upload your resume on the Schedule tab before starting.
                    </p>
                </div>
                <button onClick={onGoSchedule} className="btn px-5 py-2.5 text-sm">Go to interview</button>
            </div>
        )}
    </div>
);

// ── Profile ───────────────────────────────────────────────────────────────────

const ProfileTab: React.FC = () => {
    const [p, setP] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        candidateApi.get('/candidate/profile').then(({ data }) => setP(data)).catch(() => {}).finally(() => setLoading(false));
    }, []);
    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
    if (!p) return null;

    return (
        <div>
            <p className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest mb-2">Application · {p.application_id}</p>
            <h1 className="text-3xl font-display font-bold text-black mb-1">Profile</h1>
            <p className="text-sm text-gray-500 mb-8">Pulled from your CV. We'll update this as we learn more.</p>

            {p.locked && (
                <div className="card p-4 mb-6 text-sm text-gray-500">This application is closed, so your profile is locked.</div>
            )}

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Identity</p>
            <div className="card p-5 mb-8">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Current role</p>
                        <p className="text-sm font-semibold text-black">{p.current_role}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 mb-1">Experience</p>
                        <p className="text-sm font-semibold text-black">{p.experience_years} {p.experience_years === 1 ? 'year' : 'years'}</p>
                    </div>
                </div>
            </div>

            {p.has_cv && (
                <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Files you've sent</p>
                    <div className="card p-5 mb-8 flex items-center justify-between">
                        <div className="flex items-center">
                            <FileText className="w-5 h-5 text-black mr-3" />
                            <div>
                                <p className="text-sm font-semibold text-black flex items-center">
                                    CV.pdf
                                    <span className="ml-2 text-[10px] font-bold text-black bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">Primary CV</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Received and parsed</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {p.skills?.length > 0 && (
                <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Skills</p>
                    <div className="card p-5">
                        <div className="flex flex-wrap gap-2">
                            {p.skills.map((s: string) => (
                                <span key={s} className="px-2.5 py-1 border border-gray-200 rounded-full text-xs font-medium text-black">{s}</span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// ── Timeline ──────────────────────────────────────────────────────────────────

const TimelineTab: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        candidateApi.get('/candidate/timeline').then(({ data }) => setEvents(data)).catch(() => {}).finally(() => setLoading(false));
    }, []);
    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-black mb-1">Timeline</h1>
            <p className="text-sm text-gray-500 mb-8">Everything that's happened with your application.</p>

            {events.length === 0 ? (
                <div className="card p-8 text-center text-sm text-gray-400">No events yet.</div>
            ) : (
                <div className="relative pl-6">
                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-200" />
                    {events.map((e, i) => (
                        <div key={i} className="relative mb-7 last:mb-0">
                            <div className="absolute -left-[1.05rem] top-1 w-2.5 h-2.5 rounded-full bg-black border-2 border-white" />
                            <p className="text-sm font-semibold text-black">{e.title}</p>
                            {e.detail && <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{e.detail}</p>}
                            <p className="text-[11px] font-mono text-gray-400 mt-1">{fmtDate(e.at)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Schedule (hosts the chat interview) ───────────────────────────────────────

const ScheduleTab: React.FC<{ me: Me }> = ({ me }) => {
    const [rounds, setRounds] = useState<any[]>([]);
    const [currentStatus, setCurrentStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [launchInterview, setLaunchInterview] = useState(false);
    const [hasResume, setHasResume] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadDone, setUploadDone] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        Promise.all([
            candidateApi.get('/candidate/schedule'),
            candidateApi.get('/candidate/profile'),
        ]).then(([sched, prof]) => {
            setRounds(sched.data.rounds);
            setCurrentStatus(sched.data.current_status);
            // has_cv is true if resume_text is set and not the placeholder
            setHasResume(prof.data.has_cv && prof.data.current_role !== '—');
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError('');
        const fd = new FormData();
        fd.append('file', file);
        try {
            await candidateApi.post('/candidate/resume/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setHasResume(true);
            setUploadDone(true);
        } catch (err: any) {
            setUploadError(err.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
    if (launchInterview) return <ChatInterview onComplete={() => {}} />;

    const round1Available = ['Mock Interview', 'Applied', 'Screening'].includes(currentStatus);
    const round1Done = !round1Available && !me.closed;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-black mb-1">Schedule</h1>
            <p className="text-sm text-gray-500 mb-8">Your interview rounds. Round 1 is ready — upload your CV first.</p>

            {/* Resume upload step */}
            {round1Available && (
                <div className={`card p-5 mb-6 ${hasResume ? 'border-black' : ''}`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start">
                            {hasResume
                                ? <CheckCircle2 className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                                : <UploadCloud className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            }
                            <div>
                                <p className="text-sm font-bold text-black">Step 1 — Upload your CV</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {hasResume
                                        ? 'Resume received and parsed. You\'re ready to begin.'
                                        : 'Required before you can start the interview. PDF only, max 10 MB.'}
                                </p>
                                {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                                {uploadDone && <p className="text-xs text-black font-semibold mt-1">✓ Resume uploaded successfully</p>}
                            </div>
                        </div>
                        {!hasResume && (
                            <label className="btn px-4 py-2 text-xs flex-shrink-0 ml-4 cursor-pointer flex items-center">
                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UploadCloud className="w-3.5 h-3.5 mr-1.5" />Upload CV</>}
                                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                            </label>
                        )}
                        {hasResume && (
                            <span className="text-[11px] font-bold text-black uppercase tracking-wide flex-shrink-0 ml-4 flex items-center">
                                <Check className="w-3.5 h-3.5 mr-1" />Done
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {rounds.map((r, i) => {
                    const isRound1 = i === 0;
                    const done = isRound1 ? round1Done : false;
                    const canBegin = isRound1 && round1Available && hasResume;
                    return (
                        <div key={i} className="card p-5 flex items-start justify-between">
                            <div className="flex items-start">
                                {done
                                    ? <CheckCircle2 className="w-5 h-5 text-black mr-3 mt-0.5 flex-shrink-0" />
                                    : <Circle className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />}
                                <div>
                                    <p className="text-sm font-bold text-black">{r.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.description}</p>
                                    {isRound1 && round1Available && !hasResume && (
                                        <p className="text-xs text-gray-400 mt-1 italic">Upload your CV above to unlock this.</p>
                                    )}
                                </div>
                            </div>
                            {canBegin && (
                                <button onClick={() => setLaunchInterview(true)} className="btn px-4 py-2 text-xs flex-shrink-0 ml-4">
                                    Begin
                                </button>
                            )}
                            {isRound1 && round1Available && !hasResume && (
                                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide flex-shrink-0 ml-4">Locked</span>
                            )}
                            {isRound1 && done && (
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex-shrink-0 ml-4">Done</span>
                            )}
                            {!isRound1 && (
                                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide flex-shrink-0 ml-4">Upcoming</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Messages ──────────────────────────────────────────────────────────────────

const MessagesTab: React.FC<{ agentName: string }> = ({ agentName }) => {
    const [msgs, setMsgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        candidateApi.get('/candidate/messages').then(({ data }) => setMsgs(data)).catch(() => {}).finally(() => setLoading(false));
    }, []);
    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-black mb-1">Messages</h1>
            <p className="text-sm text-gray-500 mb-8">Your thread with {agentName}.</p>
            {msgs.length === 0 ? (
                <div className="card p-8 text-center text-sm text-gray-400">No messages yet.</div>
            ) : (
                <div className="space-y-5">
                    {msgs.map((m, i) => (
                        <div key={i} className={`flex ${m.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[80%]">
                                {m.sender === 'agent' && (
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{agentName}</p>
                                )}
                                <div className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
                                    m.sender === 'candidate' ? 'bg-black text-white' : 'bg-gray-100 text-black'
                                }`}>
                                    {m.body}
                                </div>
                                <p className="text-[10px] font-mono text-gray-400 mt-1">{fmtDate(m.at)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Settings ──────────────────────────────────────────────────────────────────

const SettingsTab: React.FC<{ me: Me }> = ({ me }) => (
    <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Account</p>
        <h1 className="text-3xl font-display font-bold text-black mb-1">Settings</h1>
        <p className="text-sm text-gray-500 mb-8">Your sign-in identity and application controls.</p>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Account</p>
        <div className="card p-5 mb-8">
            <p className="text-sm font-bold text-black">{me.candidate_name}</p>
            <p className="text-xs font-mono text-gray-400 mb-4">{me.email}</p>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="text-xs text-gray-400">Sign-in method</span>
                <span className="text-xs font-semibold text-black">Email</span>
            </div>
        </div>

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Application</p>
        <div className="card p-5">
            <div className="flex justify-between py-1.5">
                <span className="text-xs text-gray-400">Application ID</span>
                <span className="text-xs font-mono font-semibold text-black">{me.application_id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-gray-100">
                <span className="text-xs text-gray-400">Status</span>
                <span className="text-xs font-mono font-semibold text-black">{me.closed ? 'CLOSED' : me.status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-t border-gray-100">
                <span className="text-xs text-gray-400">Applied</span>
                <span className="text-xs font-semibold text-black">{fmtDate(me.applied_at)}</span>
            </div>
        </div>
    </div>
);

const AboutTab: React.FC<{ me: Me }> = ({ me }) => (
    <div>
        <h1 className="text-3xl font-display font-bold text-black mb-1">About {me.agent_name}</h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-xl">
            {me.agent_name} is an AI hiring agent. It reviews applications, runs first-round
            interviews over chat, and keeps you updated at every step — so the process is fast, fair, and
            transparent. A real person from the team handles every round after this one.
        </p>
        <div className="card p-5 text-sm text-gray-500">
            Powered by HireOS — an AI hiring platform.
        </div>
    </div>
);
