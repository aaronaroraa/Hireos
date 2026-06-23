import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader2, Upload, FileText, CheckCircle, ArrowRight } from 'lucide-react';

interface PortalData {
    job_title: string;
    candidate_name: string;
    status: string;
    job_description?: string;
}

export const CandidateApply: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [portal, setPortal] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get(`/portal/apply/${token}`)
            .then(({ data }) => setPortal(data))
            .catch(() => setError('This invitation link is invalid or has expired.'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleFile = (f: File) => {
        if (!f.name.toLowerCase().endsWith('.pdf')) {
            alert('Please upload a PDF file.');
            return;
        }
        setFile(f);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post(`/portal/apply/${token}/upload-cv`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSessionId(data.session_id);
            setUploaded(true);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleBeginInterview = () => {
        navigate(`/interview/${sessionId}`);
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
                <p className="text-sm text-gray-400">{error}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Top bar */}
            <div className="border-b border-gray-200 px-6 py-4">
                <span className="text-sm font-bold text-black tracking-tight">HireOS</span>
            </div>

            <div className="max-w-xl mx-auto px-6 py-14">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Interview Invitation</p>
                    <h1 className="text-2xl font-display font-bold text-black mb-1">{portal?.job_title}</h1>
                    <p className="text-sm text-gray-400">
                        Hi {portal?.candidate_name} — you've been invited to complete an AI-powered mock interview.
                    </p>
                </div>

                {/* What to expect */}
                <div className="card p-5 mb-8 space-y-3">
                    <p className="text-xs font-bold text-black uppercase tracking-widest mb-4">What to expect</p>
                    {[
                        ['30-minute interview', 'The timer starts when you begin. Answer at your own pace within the window.'],
                        ['CV-based questions', 'We\'ll ask about your specific projects, experience, and technical background.'],
                        ['Camera access required', 'You\'ll be asked to allow camera access before starting.'],
                        ['No copy-paste', 'All answers must be typed. We want to hear your thinking in your own words.'],
                        ['Results via email', 'We\'ll review your responses and get back to you within 48 hours.'],
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

                {!uploaded ? (
                    <>
                        {/* CV Upload */}
                        <p className="text-xs font-bold text-black uppercase tracking-widest mb-3">Upload your CV</p>
                        <div
                            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
                                dragOver ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                            }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <FileText className="w-8 h-8 text-black mb-2" />
                                    <p className="text-sm font-semibold text-black">{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Upload className="w-8 h-8 text-gray-300 mb-3" />
                                    <p className="text-sm font-semibold text-black">Drop your CV here</p>
                                    <p className="text-xs text-gray-400 mt-1">or click to browse — PDF only</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                            />
                        </div>

                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="btn w-full mt-4 py-3.5 text-sm flex items-center justify-center disabled:opacity-40"
                        >
                            {uploading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing your CV...</>
                            ) : (
                                <>Upload &amp; Continue<ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                        </button>
                    </>
                ) : (
                    /* CV processed — ready to start */
                    <div className="text-center">
                        <CheckCircle className="w-10 h-10 text-black mx-auto mb-4" />
                        <h2 className="text-lg font-display font-bold text-black mb-1">CV processed.</h2>
                        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                            Your interview is ready. Make sure you're in a quiet space with a stable internet connection before you begin. The 30-minute timer starts the moment you click the button below.
                        </p>
                        <button onClick={handleBeginInterview} className="btn w-full py-4 text-sm font-semibold">
                            Begin Interview
                        </button>
                        <p className="text-xs text-gray-400 mt-3">Once started, you cannot pause or restart.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
