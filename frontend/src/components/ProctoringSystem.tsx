import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraOff, ShieldAlert, Cpu } from 'lucide-react';

interface ProctoringSystemProps {
    onViolation: (type: 'motion') => void;
    isActive: boolean;
}

export const ProctoringSystem: React.FC<ProctoringSystemProps> = ({ onViolation, isActive }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [movementDetected, setMovementDetected] = useState(false);
    const lastFrameRef = useRef<ImageData | null>(null);

    useEffect(() => {
        if (!isActive) return;

        let stream: MediaStream | null = null;
        
        async function setupCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setHasPermission(true);
                }
            } catch (err) {
                console.error("Camera error:", err);
                setHasPermission(false);
            }
        }

        setupCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isActive]);

    // Motion detection loop
    useEffect(() => {
        if (!isActive || !hasPermission) return;

        const interval = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;
            
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            // Draw current video frame to hidden canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (lastFrameRef.current) {
                const diff = calculateDiff(lastFrameRef.current, currentFrame);
                // Threshold for "significant motion"
                if (diff > 0.08) { // 8% pixel variance
                    setMovementDetected(true);
                    onViolation('motion');
                    setTimeout(() => setMovementDetected(false), 2000);
                }
            }
            lastFrameRef.current = currentFrame;
        }, 800);

        return () => clearInterval(interval);
    }, [isActive, hasPermission, onViolation]);

    const calculateDiff = (frame1: ImageData, frame2: ImageData) => {
        let changedPixels = 0;
        const data1 = frame1.data;
        const data2 = frame2.data;

        for (let i = 0; i < data1.length; i += 4) {
            // Compare RGB values
            const rDiff = Math.abs(data1[i] - data2[i]);
            const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
            const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
            
            if (rDiff + gDiff + bDiff > 100) {
                changedPixels++;
            }
        }
        return changedPixels / (frame1.width * frame1.height);
    };

    if (!isActive) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/50 w-64 aspect-video"
            >
                {hasPermission === false ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <CameraOff className="w-8 h-8 text-rose-500 mb-2" />
                        <p className="text-[10px] text-rose-200 font-medium">Camera access denied. Please enable to continue.</p>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover opacity-60 grayscale grayscale-[50%]" />
                        <canvas ref={canvasRef} width="160" height="120" className="hidden" />
                        
                        {/* AI HUD Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-3 left-3 flex items-center space-x-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-bold text-white uppercase tracking-widest opacity-80">PROCTOR_ACTIVE</span>
                            </div>
                            
                            <div className="absolute top-3 right-3">
                                <Cpu className="w-4 h-4 text-indigo-400 opacity-50" />
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 h-0.5 bg-white/10 overflow-hidden rounded-full">
                                <motion.div 
                                    className="h-full bg-indigo-500" 
                                    animate={{ width: movementDetected ? '100%' : '0%' }}
                                />
                            </div>

                            <AnimatePresence>
                                {movementDetected && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center bg-rose-500/20 backdrop-blur-[1px]"
                                    >
                                        <div className="flex items-center space-x-2 bg-rose-600 text-white px-3 py-1 rounded-full border border-rose-400">
                                            <ShieldAlert className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">Movement Detected</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                )}
            </motion.div>
            
            <div className="mt-3 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] text-white font-bold opacity-70">AI MONITORING</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-200 uppercase">SYS_STABLE</span>
            </div>
        </div>
    );
};
