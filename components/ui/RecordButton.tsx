import React from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';
import Tooltip from './Tooltip';

export interface RecordButtonProps {
    isRecording: boolean;
    isProcessing: boolean;
    onClick: () => void;
    variant?: 'indigo' | 'violet' | 'sky' | 'gradient';
    size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 ring-indigo-200',
    violet: 'bg-violet-600 hover:bg-violet-700 ring-violet-200',
    sky: 'bg-sky-500 hover:bg-sky-600 ring-sky-200',
    gradient: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 ring-indigo-200',
};

const sizeStyles = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
};

const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
    lg: 'w-8 h-8',
};

const micIconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
};

export const RecordButton: React.FC<RecordButtonProps> = ({
    isRecording,
    isProcessing,
    onClick,
    variant = 'indigo',
    size = 'lg',
}) => {
    const tooltipText = isRecording ? "Stop recording" : "Start recording";

    return (
        <Tooltip text={tooltipText} position="top">
            <button
                onClick={onClick}
                disabled={isProcessing}
                className={`
          relative flex items-center justify-center ${sizeStyles[size]} rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2
          ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 ring-red-200 animate-pulse'
                        : variantStyles[variant]
                    }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                {isProcessing ? (
                    <RefreshCw className={`${iconSizes[size]} text-white animate-spin`} />
                ) : isRecording ? (
                    <Square className={`${iconSizes[size]} text-white fill-current`} />
                ) : (
                    <Mic className={`${micIconSizes[size]} text-white`} />
                )}
            </button>
        </Tooltip>
    );
};

export default RecordButton;
