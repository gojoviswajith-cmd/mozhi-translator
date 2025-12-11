import React from 'react';
import { XCircle, X, RefreshCw, RefreshCcw } from 'lucide-react';

export interface ErrorMessageProps {
    title: string;
    message: string;
    isPermissionError?: boolean;
    onDismiss: () => void;
    onRetry?: () => void;
    onRefresh?: () => void;
    showRetry?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
    title,
    message,
    isPermissionError = false,
    onDismiss,
    onRetry,
    onRefresh,
    showRetry = true,
}) => {
    return (
        <div className="flex flex-col items-start space-y-2 text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-lg text-sm w-full max-w-md animate-fade-in shadow-sm relative pr-8">
            <div className="flex items-start space-x-3 w-full">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-bold text-red-700">{title}</p>
                    <p className="text-red-600 text-xs mt-1 leading-relaxed">{message}</p>
                </div>
            </div>

            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                aria-label="Dismiss error"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex space-x-3 mt-1 ml-8">
                {/* Retry Generation Button */}
                {showRetry && !isPermissionError && onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                    </button>
                )}

                {/* Refresh Page / Try Again Button */}
                {isPermissionError ? (
                    <button
                        onClick={onRefresh || (() => window.location.reload())}
                        className="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                    >
                        <RefreshCcw className="w-3 h-3" />
                        <span>Refresh Page</span>
                    </button>
                ) : (
                    onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                        >
                            <RefreshCcw className="w-3 h-3" />
                            <span>Try Again</span>
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default ErrorMessage;
