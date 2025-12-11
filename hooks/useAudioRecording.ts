import { useState, useRef, useCallback, useEffect } from 'react';

// Maximum number of chunks to keep in buffer (approx 5 minutes at 1s intervals)
const MAX_RECORDING_CHUNKS = 300;

export interface ErrorState {
    title: string;
    message: string;
    isPermissionError?: boolean;
    errorId?: string;
}

export interface UseAudioRecordingOptions {
    onRecordingStop?: (audioBlob: Blob) => void;
    sampleRate?: number;
}

export interface UseAudioRecordingReturn {
    // State
    isRecording: boolean;
    recordingDuration: number;
    bufferCount: number;
    bufferPercentage: number;
    isBufferFull: boolean;
    errorState: ErrorState | null;
    permissionDenied: boolean;
    audioChunks: Blob[];

    // Refs for external access
    analyserRef: React.RefObject<AnalyserNode | null>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    recordingContextRef: React.RefObject<AudioContext | null>;

    // Actions
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    clearError: () => void;
    getAudioBlob: () => Blob | null;
}

export function useAudioRecording(options: UseAudioRecordingOptions = {}): UseAudioRecordingReturn {
    const { onRecordingStop, sampleRate = 16000 } = options;

    // State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [bufferCount, setBufferCount] = useState(0);
    const [errorState, setErrorState] = useState<ErrorState | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (recordingContextRef.current) {
                recordingContextRef.current.close();
            }
        };
    }, []);

    const clearError = useCallback(() => {
        setErrorState(null);
    }, []);

    const getAudioBlob = useCallback((): Blob | null => {
        if (audioChunksRef.current.length === 0) return null;
        return new Blob(audioChunksRef.current, { type: 'audio/webm' });
    }, []);

    const startRecording = useCallback(async () => {
        try {
            // Check if permission was previously denied
            if (permissionDenied) {
                setErrorState({
                    title: "Permission Still Blocked",
                    message: "Microphone access is still blocked. Please click the lock icon in your browser's address bar, allow Microphone, then refresh the page.",
                    isPermissionError: true,
                    errorId: 'permission-blocked-refresh'
                });
                return;
            }

            // Try to check permission status first
            if (navigator.permissions) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                    if (permissionStatus.state === 'denied') {
                        setPermissionDenied(true);
                        setErrorState({
                            title: "Access Denied",
                            message: "Microphone access is blocked. Please click the lock icon in your browser's address bar, allow Microphone, then refresh the page.",
                            isPermissionError: true,
                            errorId: 'permission-denied'
                        });
                        return;
                    }
                } catch {
                    // Some browsers don't support microphone permission query
                    console.log("Permission query not supported, attempting direct access");
                }
            }

            setErrorState(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Permission granted
            setPermissionDenied(false);

            // Setup Audio Context for visualization
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
            recordingContextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            analyserRef.current = analyser;

            // Setup MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            setBufferCount(0);
            setRecordingDuration(0);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);

                    // Rolling buffer - remove oldest chunk (but keep header at index 0)
                    if (audioChunksRef.current.length > MAX_RECORDING_CHUNKS) {
                        audioChunksRef.current.splice(1, 1);
                    }
                    setBufferCount(audioChunksRef.current.length);
                }
            };

            mediaRecorder.onstop = () => {
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current);
                    timerIntervalRef.current = null;
                }

                if (audioChunksRef.current.length > 0 && onRecordingStop) {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    onRecordingStop(audioBlob);
                }
            };

            mediaRecorder.start(1000);
            setIsRecording(true);

            // Start timer
            timerIntervalRef.current = window.setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error("Error accessing microphone:", err);
            let title = "Microphone Error";
            let msg = "Unable to access microphone. Please check permissions.";
            let isPermission = false;
            let errorId = 'mic-error';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                title = "Access Denied";
                msg = "Microphone access blocked. Please click the lock icon in your browser's address bar, allow Microphone, then refresh the page.";
                isPermission = true;
                errorId = 'permission-denied';
                setPermissionDenied(true);
            }
            setErrorState({ title, message: msg, isPermissionError: isPermission, errorId });
        }
    }, [permissionDenied, sampleRate, onRecordingStop]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }, [isRecording]);

    const bufferPercentage = Math.min((bufferCount / MAX_RECORDING_CHUNKS) * 100, 100);
    const isBufferFull = bufferCount >= MAX_RECORDING_CHUNKS;

    return {
        isRecording,
        recordingDuration,
        bufferCount,
        bufferPercentage,
        isBufferFull,
        errorState,
        permissionDenied,
        audioChunks: audioChunksRef.current,
        analyserRef,
        canvasRef,
        recordingContextRef,
        startRecording,
        stopRecording,
        clearError,
        getAudioBlob,
    };
}

export default useAudioRecording;
