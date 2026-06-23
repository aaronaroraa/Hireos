import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldAlert, Copy, 
    MonitorX, Camera, CheckCircle 
} from 'lucide-react';

interface TestRulesOverlayProps {
    isOpen: boolean;
    onAccept: () => void;
    candidateName: string;
}

export const TestRulesOverlay: React.FC<TestRulesOverlayProps> = ({ isOpen, onAccept, candidateName }) => {
    const rules = [
        { icon: MonitorX, title: "No Tab Switching", desc: "Detected tab switches or minimizing the window will trigger a formal warning." },
        { icon: Copy, title: "Clipboard Locked", desc: "Copying, pasting, and right-clicking are disabled to ensure original work." },
        { icon: Camera, title: "Virtual AI Proctor", desc: "Your webcam must remain on. AI will detect significant motion or looking away." },
        { icon: ShieldAlert, title: "3 Strike System", desc: "You have exactly 3 warnings. On the 4th violation, the test is permanently cancelled." }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/90"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden border border-white/20"
                    >
                        <div className="bg-gradient-to-r from-slate-900 to-gray-950 p-8 text-center border-b border-gray-500/20">
                            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                                <ShieldAlert className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-display font-bold text-white mb-2">Technical Honor Code</h2>
                            <p className="text-gray-200 text-sm">Welcome, {candidateName}. This assessment environment is strictly proctored.</p>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                {rules.map((rule, i) => (
                                    <div key={i} className="flex space-x-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 h-fit">
                                            <rule.icon className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm mb-1">{rule.title}</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed">{rule.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-start space-x-4 mb-8">
                                <div className="p-2 bg-gray-600 rounded-lg text-white font-bold text-xs uppercase tracking-wider">Note</div>
                                <p className="text-xs text-gray-900 leading-relaxed font-medium">
                                    By clicking 'Integrity Check & Start', you grant permission for webcam monitoring and acknowledge that all activity is tracked. This is a secure session.
                                </p>
                            </div>

                            <button 
                                onClick={onAccept}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.01] active:scale-95"
                            >
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <span>I Accept & Start Assessment</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
