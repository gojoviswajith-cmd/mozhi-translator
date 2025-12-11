import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface RecordingStatusProps {
    isRecording: boolean;
    isProcessing: boolean;
    recordingDuration: number;
    bufferPercentage: number;
    isBufferFull: boolean;
    processingText?: string;
    variant?: 'indigo' | 'violet' | 'sky';
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const variantColors = {
    indigo: { text: 'text-indigo-600', bar: 'bg-indigo-500' },
    violet: { text: 'text-violet-600', bar: 'bg-violet-500' },
    sky: { text: 'text-sky-600', bar: 'bg-sky-500' },
};

export const RecordingStatus: React.FC<RecordingStatusProps> = ({
    isRecording,
    isProcessing,
    recordingDuration,
    bufferPercentage,
    isBufferFull,
    processingText = "Processing...",
    variant = 'indigo',
}) => {
    const colors = variantColors[variant];

    return (
        <div className="w-full max-w-md space-y-3">
            <div className="h-8 flex items-center justify-center space-x-2">
                {isRecording && (
                    <div className="flex items-center space-x-2 text-slate-700 font-mono text-lg bg-slate-100 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span>{formatTime(recordingDuration)}</span>
                    </div>
                )}
                {isProcessing && (
                    <p className={`font-medium animate-pulse ${colors.text}`}>
                        {processingText}
                    </p>
                )}
            </div>

            {/* Buffer Progress Bar */}
            {isRecording && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Recording Buffer</span>
                        <span className={isBufferFull ? "text-amber-600 font-bold" : ""}>
                            {isBufferFull ? "Rolling (Oldest Discarded)" : `${Math.round(bufferPercentage)}%`}
                        </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ease-out ${isBufferFull ? 'bg-amber-500 animate-pulse' :
                                    bufferPercentage > 80 ? 'bg-orange-400' : colors.bar
                                }`}
                            style={{ width: `${bufferPercentage}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const BufferWarning: React.FC<{ isBufferFull: boolean; isRecording: boolean }> = ({
    isBufferFull,
    isRecording,
}) => {
    if (!isBufferFull || !isRecording) return null;

    return (
        <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg text-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4" />
            <span>Memory limit reached. Oldest audio is being discarded to continue recording.</span>
        </div>
    );
};

export default RecordingStatus;
