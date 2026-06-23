import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Loader2, CheckCircle } from 'lucide-react';

interface InterviewData {
    candidate_name: string;
    job_title: string;
    questions: string[];
}

export const MockInterview: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const [data, setData] = useState<InterviewData | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/portal/interview/${submissionId}`)
            .then(({ data }) => {
                setData(data);
                setAnswers(new Array(data.questions.length).fill(''));
            })
            .catch(() => setError('This interview link is invalid or has expired.'))
            .finally(() => setLoading(false));
    }, [submissionId]);

    const handleSubmit = async () => {
        if (answers.some(a => !a.trim())) {
            alert('Please answer all questions before submitting.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/portal/interview/${submissionId}/submit`, {
                answers: data!.questions.map((q, i) => ({ question: q, answer: answers[i] })),
            });
            setSubmitted(true);
        } catch {
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
                <p className="text-sm text-gray-400">{error}</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
                <CheckCircle className="w-10 h-10 text-black mx-auto mb-4" />
                <h2 className="text-xl font-display font-bold text-black mb-2">Interview submitted.</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                    Thank you, {data?.candidate_name}. We'll review your responses and be in touch shortly.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white">
            {/* Top bar */}
            <div className="border-b border-gray-200 px-6 py-4">
                <span className="text-sm font-bold text-black tracking-tight">HireOS</span>
            </div>

            <div className="max-w-2xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-10">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Mock Interview</p>
                    <h1 className="text-2xl font-display font-bold text-black mb-1">{data?.job_title}</h1>
                    <p className="text-sm text-gray-400">Hi {data?.candidate_name} — please answer each question below. Take your time.</p>
                </div>

                {/* Questions */}
                <div className="space-y-8">
                    {data?.questions.map((question, i) => (
                        <div key={i}>
                            <label className="block text-sm font-semibold text-black mb-2">
                                <span className="text-gray-400 font-normal mr-2">{i + 1}.</span>
                                {question}
                            </label>
                            <textarea
                                value={answers[i] || ''}
                                onChange={(e) => {
                                    const updated = [...answers];
                                    updated[i] = e.target.value;
                                    setAnswers(updated);
                                }}
                                rows={5}
                                placeholder="Your answer..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-black leading-relaxed resize-none focus:ring-1 focus:ring-black focus:border-black outline-none transition-all"
                            />
                        </div>
                    ))}
                </div>

                {/* Submit */}
                <div className="mt-10 pt-8 border-t border-gray-200">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn w-full py-3.5 text-sm flex items-center justify-center"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
                        ) : (
                            'Submit Interview'
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        You can only submit once. Make sure all answers are complete.
                    </p>
                </div>
            </div>
        </div>
    );
};
