import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader2, Camera, CameraOff, ChevronRight, SkipForward, CheckCircle, Clock } from 'lucide-react';

interface Question {
    section: string;
    question: string;
}

interface SessionData {
    session_id: string;
    candidate_name: string;
    job_title: string;
    questions: Question[];
    duration_minutes: number;
    started_at: string | null;
    expires_at: string | null;
    status: string;
}

type Stage = 'loading' | 'camera' | 'briefing' | 'interview' | 'submitted' | 'error';

// ── Utility ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Camera Preview ────────────────────────────────────────────────────────────

const CameraCorner: React.FC<{ stream: MediaStream | null }> = ({ stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);
    if (!stream) return null;
    return (
        <div className="fixed top-4 right-4 w-28 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm z-50">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
    );
};

// ── Timer ─────────────────────────────────────────────────────────────────────

const CountdownTimer: React.FC<{ secondsLeft: number; onExpire: () => void }> = ({ secondsLeft, onExpire }) => {
    const urgent = secondsLeft <= 300; // last 5 min
    const critical = secondsLeft <= 60;

    useEffect(() => {
        if (secondsLeft <= 0) onExpire();
    }, [secondsLeft, onExpire]);

    return (
        <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-sm font-mono font-bold transition-colors ${
            critical ? 'border-black bg-black text-white' :
            urgent ? 'border-gray-800 text-gray-800' :
            'border-gray-200 text-gray-600'
        }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(secondsLeft)}</span>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const AIInterview: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();

    const [stage, setStage] = useState<Stage>('loading');
    const [session, setSession] = useState<SessionData | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Camera
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraGranted, setCameraGranted] = useState(false);
    const [cameraDeclined, setCameraDeclined] = useState(false);

    // Interview state
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [secondsLeft, setSecondsLeft] = useState(30 * 60);
    const [submitting, setSubmitting] = useState(false);

    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // ── Load session ──
    useEffect(() => {
        api.get(`/portal/interview/${sessionId}`)
            .then(({ data }) => {
                setSession(data);
                if (data.status === 'completed') {
                    setStage('submitted');
                } else if (data.status === 'active' && data.expires_at) {
                    const remaining = Math.max(0, Math.floor(
                        (new Date(data.expires_at).getTime() - Date.now()) / 1000
                    ));
                    setSecondsLeft(remaining);
                    setStage('camera');
                } else {
                    setStage('camera');
                }
            })
            .catch(() => {
                setErrorMsg('This interview session could not be found. Please check your link.');
                setStage('error');
            });
    }, [sessionId]);

    // ── Camera request ──
    const requestCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setCameraStream(stream);
            setCameraGranted(true);
        } catch {
            setCameraDeclined(true);
        }
        setStage('briefing');
    };

    const skipCamera = () => {
        setCameraDeclined(true);
        setStage('briefing');
    };

    // ── Start interview ──
    const startInterview = async () => {
        try {
            const { data } = await api.post(`/portal/interview/${sessionId}/start`);
            if (data.remaining_seconds) {
                setSecondsLeft(data.remaining_seconds);
            }
        } catch {
            // already started — use existing timer
        }
        setStage('interview');
        startTimer();
        startHeartbeat();
    };

    // ── Timer ──
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSecondsLeft(s => {
                if (s <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    }, []);

    // ── Heartbeat (auto-save) ──
    const buildAnswerPayload = useCallback(() => {
        return (session?.questions || []).map((q, i) => ({
            section: q.section,
            question: q.question,
            answer: answers[i] || '',
            skipped: skipped.has(i),
        }));
    }, [session, answers, skipped]);

    const startHeartbeat = useCallback(() => {
        heartbeatRef.current = setInterval(async () => {
            try {
                await api.post(`/portal/interview/${sessionId}/heartbeat`, {
                    answers: buildAnswerPayload(),
                });
            } catch { /* silent */ }
        }, 30_000);
    }, [sessionId, buildAnswerPayload]);

    // ── Disable copy-paste ──
    useEffect(() => {
        if (stage !== 'interview') return;
        const block = (e: ClipboardEvent) => { e.preventDefault(); };
        document.addEventListener('paste', block);
        document.addEventListener('copy', block);
        document.addEventListener('cut', block);
        return () => {
            document.removeEventListener('paste', block);
            document.removeEventListener('copy', block);
            document.removeEventListener('cut', block);
        };
    }, [stage]);

    // ── Submission ──
    const allAnswered = session
        ? (session.questions || []).every((_, i) => skipped.has(i) || (answers[i] || '').trim().length > 10)
        : false;

    const canSubmit = allAnswered || secondsLeft <= 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        try {
            await api.post(`/portal/interview/${sessionId}/submit`, {
                answers: buildAnswerPayload(),
            });
            if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
            setStage('submitted');
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Submission failed. Please try again.');
            setSubmitting(false);
        }
    };

    const handleTimerExpire = useCallback(() => {
        if (stage === 'interview') handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    const handleNext = () => {
        if (session && currentIdx < session.questions.length - 1) {
            setCurrentIdx(i => i + 1);
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    };

    const handleSkip = () => {
        setSkipped(s => new Set([...s, currentIdx]));
        handleNext();
    };

    const handlePrev = () => {
        if (currentIdx > 0) setCurrentIdx(i => i - 1);
    };

    // ── Renders ────────────────────────────────────────────────────────────────

    const TopBar = () => (
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <span className="text-sm font-bold text-black tracking-tight">HireOS</span>
            {stage === 'interview' && (
                <CountdownTimer secondsLeft={secondsLeft} onExpire={handleTimerExpire} />
            )}
        </div>
    );

    if (stage === 'loading') return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );

    if (stage === 'error') return (
        <div className="min-h-screen bg-white">
            <TopBar />
            <div className="flex items-center justify-center min-h-[80vh] px-6">
                <p className="text-sm text-gray-400 text-center max-w-sm">{errorMsg}</p>
            </div>
        </div>
    );

    if (stage === 'submitted') return (
        <div className="min-h-screen bg-white">
            <TopBar />
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
                <CheckCircle className="w-10 h-10 text-black mb-5" />
                <h1 className="text-2xl font-display font-bold text-black mb-2">Interview complete.</h1>
                <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
                    Thank you, {session?.candidate_name}. We've received your responses and will review them carefully.
                    Expect to hear from us within 48 hours.
                </p>
                <p className="text-xs text-gray-300 mt-6">You may close this tab.</p>
            </div>
        </div>
    );

    if (stage === 'camera') return (
        <div className="min-h-screen bg-white">
            <TopBar />
            <div className="max-w-md mx-auto px-6 py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Camera className="w-7 h-7 text-black" />
                </div>
                <h1 className="text-xl font-display font-bold text-black mb-2">Camera access</h1>
                <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    We request camera access to maintain interview integrity. Your video is not recorded or stored.
                </p>
                <button onClick={requestCamera} className="btn w-full py-3.5 text-sm mb-3 flex items-center justify-center">
                    <Camera className="w-4 h-4 mr-2" />Allow Camera &amp; Continue
                </button>
                <button onClick={skipCamera} className="btn-ghost w-full py-3 text-sm flex items-center justify-center">
                    <CameraOff className="w-4 h-4 mr-2" />Continue Without Camera
                </button>
                {cameraDeclined && (
                    <p className="text-xs text-gray-400 mt-4">Camera access denied. You may proceed without it.</p>
                )}
            </div>
        </div>
    );

    if (stage === 'briefing') return (
        <div className="min-h-screen bg-white">
            <TopBar />
            <div className="max-w-md mx-auto px-6 py-16">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Before you begin</p>
                <h1 className="text-2xl font-display font-bold text-black mb-6">
                    {session?.job_title} — Mock Interview
                </h1>

                <div className="card p-5 space-y-4 mb-8">
                    {[
                        [`${session?.questions.length || 10} questions`, 'Based on your CV. Some sections may feel specific — that\'s intentional.'],
                        ['30-minute timer', 'Starts the moment you click Begin. You cannot pause.'],
                        ['Skip, don\'t blank', 'If you\'re unsure about a question, skip it. Blank answers score the same as a skip.'],
                        ['No copy-paste', 'Paste events are blocked. Type your answers directly.'],
                        [cameraGranted ? 'Camera active' : 'No camera', cameraGranted
                            ? 'Your camera is on. It is not recorded.'
                            : 'Camera access was not granted. You may still proceed.'],
                    ].map(([title, desc]) => (
                        <div key={title} className="flex items-start">
                            <div className="w-1 h-1 rounded-full bg-black mt-2 mr-3 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-black">{title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={startInterview} className="btn w-full py-4 text-sm font-semibold">
                    Begin Interview
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">
                    By clicking Begin, you confirm you are ready and in a distraction-free environment.
                </p>
            </div>
        </div>
    );

    // ── Interview stage ────────────────────────────────────────────────────────

    const q = session!.questions[currentIdx];
    const totalQ = session!.questions.length;
    const isSkipped = skipped.has(currentIdx);
    const isLast = currentIdx === totalQ - 1;

    return (
        <div className="min-h-screen bg-white flex flex-col" style={{ userSelect: 'none' }}>
            <TopBar />
            {cameraGranted && <CameraCorner stream={cameraStream} />}

            {/* Progress bar */}
            <div className="h-0.5 bg-gray-100">
                <div
                    className="h-full bg-black transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-10">
                {/* Question meta */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        {q.section}
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                        {currentIdx + 1} / {totalQ}
                    </span>
                </div>

                {/* Question */}
                <h2 className="text-xl font-display font-bold text-black leading-snug mb-6">
                    {q.question}
                </h2>

                {/* Answer area */}
                {isSkipped ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                        <p className="text-sm font-semibold text-gray-400 mb-1">Question skipped</p>
                        <p className="text-xs text-gray-300">You can go back and answer this later if time permits.</p>
                        <button
                            onClick={() => setSkipped(s => { const n = new Set(s); n.delete(currentIdx); return n; })}
                            className="btn-ghost px-4 py-2 text-xs mt-4"
                        >
                            Un-skip &amp; Answer
                        </button>
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={answers[currentIdx] || ''}
                        onChange={e => setAnswers(a => ({ ...a, [currentIdx]: e.target.value }))}
                        onPaste={e => e.preventDefault()}
                        onCopy={e => e.preventDefault()}
                        onCut={e => e.preventDefault()}
                        placeholder="Type your answer here..."
                        className="flex-1 w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm text-black leading-relaxed resize-none focus:ring-1 focus:ring-black focus:border-black outline-none transition-all min-h-[200px]"
                        style={{ userSelect: 'text' }}
                        autoFocus
                    />
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                    <div className="flex space-x-2">
                        <button
                            onClick={handlePrev}
                            disabled={currentIdx === 0}
                            className="btn-ghost px-4 py-2.5 text-sm disabled:opacity-30"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSkip}
                            className="btn-ghost px-4 py-2.5 text-sm flex items-center"
                            title="Skip this question"
                        >
                            <SkipForward className="w-3.5 h-3.5 mr-1.5" />Skip
                        </button>
                    </div>

                    {isLast ? (
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitting}
                            className="btn px-6 py-2.5 text-sm flex items-center disabled:opacity-40"
                        >
                            {submitting
                                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
                                : <>Submit Interview<CheckCircle className="w-4 h-4 ml-2" /></>
                            }
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="btn px-6 py-2.5 text-sm flex items-center"
                        >
                            Next<ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    )}
                </div>

                {/* Submit hint when all answered */}
                {isLast && !canSubmit && (
                    <p className="text-xs text-gray-400 text-center mt-3">
                        Answer this question (or skip it) to enable submission.
                    </p>
                )}
            </div>
        </div>
    );
};
