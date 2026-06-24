import React, { useState, useEffect, useRef, useCallback } from 'react';
import { candidateApi } from '../lib/candidateApi';
import { Loader2, Send, CheckCircle, Camera, Clock, AlertTriangle, CameraOff, LogOut } from 'lucide-react';

interface Turn {
    role: 'agent' | 'candidate';
    content: string;
    ts?: string;
}

function fmt(sec: number): string {
    const m = Math.floor(Math.max(0, sec) / 60);
    const s = Math.max(0, sec) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ChatInterview: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
    const [stage, setStage] = useState<'intro' | 'camera' | 'chat' | 'done'>('intro');
    const [transcript, setTranscript] = useState<Turn[]>([]);
    const [agentName, setAgentName] = useState('HireOS');
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [agentTyping, setAgentTyping] = useState(false);
    const [loading, setLoading] = useState(true);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraError, setCameraError] = useState(false);

    // Proctoring
    const [violations, setViolations] = useState(0);
    const [showViolationAlert, setShowViolationAlert] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const violationAlertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    const selfVideo = useRef<HTMLVideoElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const expiresRef = useRef<number | null>(null);

    // ── Load current interview state ──
    useEffect(() => {
        candidateApi.get('/candidate/interview')
            .then(({ data }) => {
                setAgentName(data.agent_name || 'HireOS');
                if (data.status === 'completed') {
                    setTranscript(data.transcript || []);
                    setStage('done');
                } else if (data.status === 'active' && (data.transcript || []).length > 0) {
                    // Resume — skip camera gate, jump straight to chat
                    setTranscript(data.transcript);
                    if (data.expires_at) armTimer(data.expires_at);
                    // Re-request camera silently for self-view
                    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                        .then(stream => { streamRef.current = stream; setCameraOn(true); })
                        .catch(() => {});
                    setStage('chat');
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        return () => teardown();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Fullscreen lock during live interview ──
    useEffect(() => {
        if (stage !== 'chat') return;
        const el = document.documentElement;
        el.requestFullscreen?.().catch(() => {});
        const onFullscreenChange = () => {
            if (!document.fullscreenElement && stage === 'chat') {
                triggerViolation();
                el.requestFullscreen?.().catch(() => {});
            }
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    // ── Block browser back / close / refresh during interview ──
    useEffect(() => {
        if (stage !== 'chat') return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [stage]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [transcript, agentTyping]);

    // ── Block copy / paste / cut during live session ──
    useEffect(() => {
        if (stage !== 'chat') return;
        const block = (e: ClipboardEvent) => e.preventDefault();
        document.addEventListener('paste', block);
        document.addEventListener('copy', block);
        document.addEventListener('cut', block);
        return () => {
            document.removeEventListener('paste', block);
            document.removeEventListener('copy', block);
            document.removeEventListener('cut', block);
        };
    }, [stage]);

    // ── Tab switch / window blur detection ──
    useEffect(() => {
        if (stage !== 'chat') return;
        const onVisibilityChange = () => { if (document.hidden) triggerViolation(); };
        const onBlur = () => triggerViolation();
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onBlur);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', onBlur);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    const triggerViolation = () => {
        setViolations(v => v + 1);
        setShowViolationAlert(true);
        if (violationAlertTimer.current) clearTimeout(violationAlertTimer.current);
        violationAlertTimer.current = setTimeout(() => setShowViolationAlert(false), 4000);
    };

    const handleExitRequest = () => setShowExitConfirm(true);

    const confirmExit = async () => {
        // Count as a heavy violation then finalize
        setViolations(v => v + 5);
        setShowExitConfirm(false);
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        await finalize();
    };

    const teardown = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (violationAlertTimer.current) clearTimeout(violationAlertTimer.current);
    };

    // ── Timer ──
    const armTimer = (expiresIso: string) => {
        const expiresMs = new Date(expiresIso).getTime();
        expiresRef.current = expiresMs;
        const tick = () => {
            const left = Math.round((expiresMs - Date.now()) / 1000);
            setSecondsLeft(left);
            if (left <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                finalize();
            }
        };
        tick();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(tick, 1000);
    };

    const finalize = useCallback(async () => {
        try { await candidateApi.post('/candidate/interview/finalize'); } catch { /* */ }
        teardown();
        setStage('done');
        onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Camera — mandatory ──
    const requestCamera = async () => {
        setCameraError(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            streamRef.current = stream;
            setCameraOn(true);
            beginInterview();
        } catch {
            setCameraError(true);
        }
    };

    const beginInterview = async () => {
        setStage('chat');
        setAgentTyping(true);
        try {
            const { data } = await candidateApi.post('/candidate/interview/begin');
            setAgentName(data.agent_name || 'HireOS');
            setTranscript(data.transcript || []);
            if (data.expires_at) armTimer(data.expires_at);
        } catch { /* */ }
        finally {
            setAgentTyping(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    useEffect(() => {
        if (cameraOn && selfVideo.current && streamRef.current) {
            selfVideo.current.srcObject = streamRef.current;
        }
    }, [cameraOn, stage]);

    const send = async () => {
        const msg = input.trim();
        if (!msg || sending) return;
        setInput('');
        setSending(true);
        setTranscript(t => [...t, { role: 'candidate', content: msg }]);
        setAgentTyping(true);
        try {
            const { data } = await candidateApi.post('/candidate/interview/reply', { message: msg });
            if (data.complete) {
                setTranscript(data.transcript || []);
                finalize();
                return;
            }
            setTranscript(data.transcript || []);
            if (data.expires_at && expiresRef.current == null) armTimer(data.expires_at);
        } catch {
            setTranscript(t => [...t, { role: 'agent', content: 'Something went wrong — please send that again.' }]);
        } finally {
            setAgentTyping(false);
            setSending(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );

    // ── Intro ──
    if (stage === 'intro') return (
        <div className="max-w-lg">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Round 1 · Live Interview</p>
            <h2 className="text-xl font-display font-bold text-black mb-2">Interview with {agentName}</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
                This is a formal, proctored interview. Your camera must stay on throughout the session.
                All activity is logged — tab switches, copy-paste attempts, and window changes are
                visible to the hiring team.
            </p>

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
                {[
                    ['30-minute fixed timer', 'Starts when you begin. Ends automatically — it cannot be paused or extended.'],
                    ['Camera required', 'You must allow camera access before you can start. Your video is shown to you only and is not stored.'],
                    ['Tab switching is flagged', 'Every time you leave this tab or window, a violation is logged and reported to the hiring team.'],
                    ['No copy-paste', 'Clipboard access is fully disabled. Every answer must be typed.'],
                    ['One continuous round', 'Technical, system-design, and behavioural questions flow together in a single conversation.'],
                    ['Results by email', 'The team reviews the full session after it ends. No score is shown during the interview.'],
                ].map(([title, detail]) => (
                    <div key={title} className="px-4 py-3.5 flex items-start">
                        <div className="w-1 h-1 rounded-full bg-black mt-2 mr-3 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-black">{title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
                <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-semibold text-black">By continuing, you confirm</span> that you are the applicant,
                    you are alone, and that you understand this session is monitored and all violations are logged.
                </p>
            </div>

            <button onClick={() => setStage('camera')} className="btn px-6 py-3 text-sm w-full">
                I understand — begin interview
            </button>
        </div>
    );

    // ── Camera gate — mandatory ──
    if (stage === 'camera') return (
        <div className="max-w-sm">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${cameraError ? 'bg-gray-100' : 'bg-black'}`}>
                {cameraError
                    ? <CameraOff className="w-6 h-6 text-black" />
                    : <Camera className="w-6 h-6 text-white" />
                }
            </div>

            {cameraError ? (
                <>
                    <h2 className="text-lg font-display font-bold text-black mb-2">Camera access denied</h2>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        Camera access is required to proceed. Please allow camera access for this site
                        in your browser settings, then try again.
                    </p>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6">
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <span className="font-semibold text-black">Chrome:</span> click the camera icon in the address bar → Allow.<br />
                            <span className="font-semibold text-black">Safari:</span> Safari → Settings → Websites → Camera → Allow.
                        </p>
                    </div>
                    <button onClick={requestCamera} className="btn w-full py-3 text-sm">
                        Try again
                    </button>
                </>
            ) : (
                <>
                    <h2 className="text-lg font-display font-bold text-black mb-2">Camera access required</h2>
                    <p className="text-sm text-gray-500 leading-relaxed mb-6">
                        This is a proctored interview — camera is mandatory. Your video stays on your
                        screen only and is not recorded or stored. The 30-minute timer starts immediately
                        when you click below.
                    </p>
                    <button onClick={requestCamera} className="btn w-full py-3 text-sm">
                        Allow camera &amp; start interview
                    </button>
                </>
            )}
        </div>
    );

    // ── Chat / Done ──
    const urgent = secondsLeft != null && secondsLeft <= 120;

    return (
        <div className="flex flex-col h-[calc(100vh-9rem)] max-w-2xl" style={{ userSelect: 'none' }}>

            {/* Violation overlay */}
            {showViolationAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="bg-black text-white rounded-2xl px-6 py-4 flex items-center space-x-3 shadow-2xl max-w-sm mx-4">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold">Tab switch detected</p>
                            <p className="text-xs text-gray-300 mt-0.5">
                                Violation #{violations} logged and visible to the hiring team.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit confirm modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                    <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 shadow-2xl">
                        <AlertTriangle className="w-8 h-8 text-black mb-4" />
                        <h2 className="text-lg font-bold text-black mb-2">Exit interview?</h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-6">
                            Exiting early will end your interview immediately and count as a serious violation.
                            This will significantly impact your score. This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
                            >
                                Stay in interview
                            </button>
                            <button
                                onClick={confirmExit}
                                className="flex-1 bg-black text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
                            >
                                Exit anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status bar */}
            <div className="flex-shrink-0 flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center text-xs font-semibold text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-black mr-2 animate-pulse" />
                        {stage === 'done' ? 'Session ended' : 'Live interview'}
                    </span>
                    {violations > 0 && stage !== 'done' && (
                        <span className="flex items-center text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                            {violations} violation{violations !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-3">
                    {stage !== 'done' && secondsLeft != null && (
                        <div className={`flex items-center px-3 py-1.5 rounded-lg border text-sm font-mono font-bold ${
                            urgent ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-700'
                        }`}>
                            <Clock className="w-3.5 h-3.5 mr-1.5" />{fmt(secondsLeft)}
                        </div>
                    )}
                    {stage !== 'done' && (
                        <button
                            onClick={handleExitRequest}
                            className="flex items-center text-xs font-semibold text-gray-400 hover:text-black transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
                            title="Exit interview"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-1" /> Exit
                        </button>
                    )}
                </div>
            </div>

            {/* Self-view camera */}
            {cameraOn && stage !== 'done' && (
                <div className="fixed bottom-6 right-6 w-32 h-24 rounded-xl overflow-hidden border-2 border-black bg-black z-50">
                    <video ref={selfVideo} autoPlay muted playsInline className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 flex items-center bg-black/70 rounded px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                        <span className="text-[8px] font-bold text-white uppercase tracking-wide">Live</span>
                    </div>
                </div>
            )}

            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar space-y-5 pr-1">
                {transcript.map((turn, i) => (
                    <div key={i} className={`flex ${turn.role === 'candidate' ? 'justify-end' : 'justify-start'}`}>
                        <div className={turn.role === 'candidate' ? 'max-w-[80%]' : 'max-w-[85%]'}>
                            {turn.role === 'agent' && (
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{agentName}</p>
                            )}
                            <div className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
                                turn.role === 'candidate' ? 'bg-black text-white' : 'bg-gray-100 text-black'
                            }`}>
                                {turn.content}
                            </div>
                        </div>
                    </div>
                ))}
                {agentTyping && (
                    <div className="flex justify-start">
                        <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{agentName}</p>
                            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center space-x-1">
                                {[0, 150, 300].map(d => (
                                    <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input / completion */}
            {stage === 'done' ? (
                <div className="mt-5 pt-5 border-t border-gray-200 flex items-center text-sm text-black">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Interview complete. The team will review the full session and follow up by email.
                </div>
            ) : (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-end space-x-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                            onPaste={(e) => e.preventDefault()}
                            onCopy={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                            rows={1}
                            placeholder="Type your answer…"
                            disabled={sending}
                            style={{ userSelect: 'text' }}
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:ring-1 focus:ring-black focus:border-black outline-none transition-all max-h-32"
                        />
                        <button onClick={send} disabled={sending || !input.trim()} className="btn p-3 rounded-xl disabled:opacity-40">
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2">
                        Enter to send · Shift+Enter for new line · Copy-paste disabled · Tab switching is flagged
                    </p>
                </div>
            )}
        </div>
    );
};
