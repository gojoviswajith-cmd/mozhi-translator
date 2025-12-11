import { useRef, useCallback, useEffect } from 'react';

export interface UseWaveformOptions {
    color?: string;
    backgroundColor?: string;
}

export interface UseWaveformReturn {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    startDrawing: (analyser: AnalyserNode) => void;
    stopDrawing: () => void;
}

export function useWaveform(options: UseWaveformOptions = {}): UseWaveformReturn {
    const { color = '#4f46e5', backgroundColor = 'rgb(255, 255, 255)' } = options;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const draw = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        animationFrameRef.current = requestAnimationFrame(draw);
    }, [color, backgroundColor]);

    const startDrawing = useCallback((analyser: AnalyserNode) => {
        analyserRef.current = analyser;
        draw();
    }, [draw]);

    const stopDrawing = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        analyserRef.current = null;

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, [backgroundColor]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        canvasRef,
        startDrawing,
        stopDrawing,
    };
}

export default useWaveform;
