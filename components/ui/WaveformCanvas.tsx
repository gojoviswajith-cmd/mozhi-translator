import React from 'react';
import { Activity } from 'lucide-react';

export interface WaveformCanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    isRecording: boolean;
    isProcessing?: boolean;
    hasError?: boolean;
    width?: number;
    height?: number;
    placeholderText?: string;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
    canvasRef,
    isRecording,
    isProcessing = false,
    hasError = false,
    width = 600,
    height = 96,
    placeholderText = "Audio visualizer will appear here",
}) => {
    const showPlaceholder = !isRecording && !isProcessing && !hasError;

    return (
        <div className="w-full h-24 flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden relative">
            {showPlaceholder && (
                <div className="text-slate-400 flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span className="text-sm">{placeholderText}</span>
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className={`w-full h-full ${!isRecording ? 'hidden' : 'block'}`}
            />
        </div>
    );
};

export default WaveformCanvas;
