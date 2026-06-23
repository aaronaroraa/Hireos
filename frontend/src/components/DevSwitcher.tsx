import React, { useState } from 'react';
import { candidateApi } from '../lib/candidateApi';

/**
 * Dev-only corner widget for jumping between the recruiter and candidate views
 * without retyping URLs. Renders nothing in production builds.
 */
export const DevSwitcher: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    // Only in dev
    if (!import.meta.env.DEV) return null;

    const goRecruiter = () => { window.location.href = '/dashboard'; };
    const goCandidate = async (email: string) => {
        setBusy(true);
        try {
            const { data } = await candidateApi.post('/candidate/login', { email });
            sessionStorage.setItem('candidate_token', data.token);
            window.location.href = '/portal/overview';
        } catch {
            window.location.href = '/portal/login';
        } finally {
            setBusy(false);
        }
    };
    const goPresenter = () => { window.location.href = '/demo'; };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] font-sans">
            {open && (
                <div className="mb-2 w-56 bg-black text-white rounded-xl shadow-xl border border-gray-800 overflow-hidden">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-800">Dev — jump to view</p>
                    <button onClick={goRecruiter} className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-800 transition-colors">
                        Recruiter dashboard
                    </button>
                    <div className="border-t border-gray-800">
                        <p className="px-3 pt-2 text-[10px] text-gray-500">Candidate (auto-login)</p>
                        {[
                            ['Priya — Backend', 'priya@example.com'],
                            ['Marcus — ML', 'marcus@example.com'],
                            ['Aisha — Frontend', 'aisha@example.com'],
                        ].map(([label, email]) => (
                            <button key={email} disabled={busy} onClick={() => goCandidate(email)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors disabled:opacity-50">
                                {label}
                            </button>
                        ))}
                    </div>
                    <button onClick={goPresenter} className="w-full text-left px-3 py-2.5 text-xs hover:bg-gray-800 transition-colors border-t border-gray-800 font-semibold">
                        ◧ Split-screen presenter
                    </button>
                </div>
            )}
            <button
                onClick={() => setOpen(o => !o)}
                className="bg-black text-white text-xs font-semibold rounded-full px-4 py-2.5 shadow-xl border border-gray-700 hover:bg-gray-800 transition-colors"
            >
                {open ? '✕ Close' : '⚙ Views'}
            </button>
        </div>
    );
};
