import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { candidateApi } from '../lib/candidateApi';
import { Loader2, RefreshCw, Monitor, User } from 'lucide-react';

/**
 * Sales presenter view — recruiter dashboard and candidate portal side by side
 * on one screen, both auto-logged-in to demo accounts. Present from this page:
 * when the candidate answers in the chat (right), the recruiter pipeline (left)
 * reflects it after the interview completes.
 *
 * Both panes are same-origin iframes; they share sessionStorage with this page,
 * so setting the tokens here authenticates both.
 */

const DEMO_CANDIDATE_EMAIL = 'priya@example.com';

export const DemoPresenter: React.FC = () => {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState('');
    const [candidateEmail, setCandidateEmail] = useState(DEMO_CANDIDATE_EMAIL);
    const recruiterFrame = useRef<HTMLIFrameElement>(null);
    const candidateFrame = useRef<HTMLIFrameElement>(null);

    const authenticate = async (email: string) => {
        setReady(false);
        setError('');
        try {
            // Recruiter session
            const r = await api.post('/auth/demo-login');
            sessionStorage.setItem('token', r.data.access_token);
            // Candidate session
            const c = await candidateApi.post('/candidate/login', { email });
            sessionStorage.setItem('candidate_token', c.data.token);
            setReady(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Could not start the demo. Is the backend running?');
        }
    };

    useEffect(() => { authenticate(candidateEmail); }, []);

    const reload = () => {
        if (recruiterFrame.current) recruiterFrame.current.src = '/dashboard';
        if (candidateFrame.current) candidateFrame.current.src = '/portal/overview';
    };

    const switchCandidate = async (email: string) => {
        setCandidateEmail(email);
        await authenticate(email);
        reload();
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Presenter toolbar */}
            <div className="flex-shrink-0 bg-black text-white px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold tracking-tight">HireOS</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Presenter Mode</span>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={candidateEmail}
                        onChange={(e) => switchCandidate(e.target.value)}
                        className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 outline-none"
                    >
                        <option value="priya@example.com">Priya Sharma — Backend</option>
                        <option value="marcus@example.com">Marcus Lee — ML</option>
                        <option value="aisha@example.com">Aisha Khan — Frontend</option>
                    </select>
                    <button onClick={reload} className="flex items-center text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors">
                        <RefreshCw className="w-3 h-3 mr-1.5" />Reset
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-gray-900 text-gray-300 text-xs px-5 py-2 text-center">{error}</div>
            )}

            {/* Split panes */}
            {!ready && !error ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="flex-1 flex gap-2 p-2 min-h-0">
                    {/* Recruiter */}
                    <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200">
                        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 flex items-center text-xs font-semibold text-gray-500">
                            <Monitor className="w-3.5 h-3.5 mr-2" />RECRUITER · what the company sees
                        </div>
                        <iframe ref={recruiterFrame} src="/dashboard" title="Recruiter" className="flex-1 w-full border-0" />
                    </div>
                    {/* Candidate */}
                    <div className="flex-1 flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200">
                        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 flex items-center text-xs font-semibold text-gray-500">
                            <User className="w-3.5 h-3.5 mr-2" />CANDIDATE · what the applicant sees
                        </div>
                        <iframe ref={candidateFrame} src="/portal/overview" title="Candidate" className="flex-1 w-full border-0" />
                    </div>
                </div>
            )}
        </div>
    );
};
