import React, { useState, useEffect, useRef } from 'react';
import { generateResearchContent } from '../services/geminiService';
import { Globe, BrainCircuit, ExternalLink, Mic, Square, RefreshCw, X } from 'lucide-react';
import { ResearchResponse } from '../types';
import { useAudioRecording, useWaveform, ErrorState } from '../hooks';
import { Tooltip } from './ui';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ResearchAssistant: React.FC = () => {
  const [mode, setMode] = useState<'SEARCH' | 'THINKING'>('SEARCH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [processingError, setProcessingError] = useState<ErrorState | null>(null);

  // Use shared audio recording hook
  const {
    isRecording,
    recordingDuration,
    bufferPercentage,
    isBufferFull,
    errorState: recordingError,
    analyserRef,
    startRecording,
    stopRecording,
    clearError: clearRecordingError,
    getAudioBlob,
  } = useAudioRecording({
    onRecordingStop: handleRecordingStop,
  });

  // Use shared waveform hook - white waveform
  const { canvasRef, startDrawing, stopDrawing } = useWaveform({
    color: '#ffffff',
    backgroundColor: '#171717'
  });

  // Start waveform drawing when recording starts
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      startDrawing(analyserRef.current);
    } else {
      stopDrawing();
    }
  }, [isRecording, analyserRef.current, startDrawing, stopDrawing]);

  async function handleRecordingStop(audioBlob: Blob) {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const data = await generateResearchContent(audioBlob, mode);
      setResult(data);
    } catch (error: any) {
      console.error("Research failed", error);

      let title = "Processing Failed";
      let message = "An unexpected error occurred processing your request.";
      const errString = error.toString().toLowerCase();

      if (errString.includes("safety") || errString.includes("blocked")) {
        title = "Content Flagged";
        message = "The content was flagged by safety filters. Please try rephrasing.";
      } else if (errString.includes("429") || errString.includes("resource exhausted")) {
        title = "System Busy";
        message = "System is busy. Please wait a moment and try again.";
      } else if (errString.includes("no response generated") || errString.includes("candidate")) {
        title = "Audio Unclear";
        message = "Could not clearly understand the audio. Please speak closer to the microphone.";
      } else if (errString.includes("network") || errString.includes("fetch")) {
        title = "Connection Error";
        message = "Network connection failed. Please check your internet.";
      }

      setProcessingError({ title, message });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setResult(null);
      startRecording();
    }
  };

  const handleRetry = async () => {
    const audioBlob = getAudioBlob();
    if (audioBlob) {
      await handleRecordingStop(audioBlob);
    }
  };

  const errorState = recordingError || processingError;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Mode Selector */}
      <div className="flex flex-col items-center space-y-3">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Select Research Mode</span>
        <div className="bg-neutral-900 p-1.5 rounded-xl border border-neutral-700 flex space-x-1">
          <button
            onClick={() => setMode('SEARCH')}
            className={`
              flex items-center space-x-3 px-5 py-3 rounded-lg transition-all duration-200 border
              ${mode === 'SEARCH'
                ? 'bg-white border-white text-black'
                : 'bg-transparent border-transparent text-neutral-400 hover:text-white'}
            `}
          >
            <div className={`p-1.5 rounded-full ${mode === 'SEARCH' ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold">Web Search (Flash)</span>
              <span className="text-xs opacity-75">Live Google Data</span>
            </div>
          </button>

          <button
            onClick={() => setMode('THINKING')}
            className={`
              flex items-center space-x-3 px-5 py-3 rounded-lg transition-all duration-200 border
              ${mode === 'THINKING'
                ? 'bg-white border-white text-black'
                : 'bg-transparent border-transparent text-neutral-400 hover:text-white'}
            `}
          >
            <div className={`p-1.5 rounded-full ${mode === 'THINKING' ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start text-left">
              <span className="text-sm font-semibold">Deep Analysis (Pro)</span>
              <span className="text-xs opacity-75">Strategic Thinking</span>
            </div>
          </button>
        </div>
      </div>

      {/* Recording Area */}
      <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 flex flex-col items-center justify-center space-y-6 min-h-[350px]">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-white">
            {isRecording ? "Listening..." : "Ask Mozhi Anything"}
          </h2>
          <p className="text-neutral-400 text-sm">
            {mode === 'SEARCH'
              ? "I will search Google for the latest information."
              : "I will think deeply to analyze complex topics and provide strategy."}
          </p>
        </div>

        {/* Waveform */}
        <div className="w-full h-24 flex items-center justify-center bg-neutral-800 rounded-lg overflow-hidden relative">
          {!isRecording && !isProcessing && !errorState && (
            <div className="text-neutral-500 flex items-center space-x-2">
              <span className="text-sm">Audio visualizer will appear here</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={600}
            height={96}
            className={`w-full h-full ${!isRecording ? 'hidden' : 'block'}`}
          />
        </div>

        {/* Record Button */}
        <Tooltip text={isRecording ? "Stop recording" : "Start recording"} position="top">
          <button
            onClick={handleToggleRecording}
            disabled={isProcessing}
            className={`
              relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-neutral-900
              ${isRecording
                ? 'bg-white text-black ring-white/30 animate-pulse'
                : 'bg-white text-black hover:bg-neutral-200 ring-white/20'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isProcessing ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>
        </Tooltip>

        {/* Status */}
        <div className="w-full max-w-md space-y-3">
          <div className="h-8 flex items-center justify-center space-x-2">
            {isRecording && (
              <div className="flex items-center space-x-2 text-white font-mono text-lg bg-neutral-800 px-3 py-1 rounded-full">
                <span>{formatTime(recordingDuration)}</span>
              </div>
            )}
            {isProcessing && (
              <p className="text-white font-medium animate-pulse">
                {mode === 'SEARCH' ? "Searching Google..." : "Thinking Deeply..."}
              </p>
            )}
          </div>

          {/* Buffer Progress Bar */}
          {isRecording && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Recording Buffer</span>
                <span className={isBufferFull ? "text-white font-bold" : ""}>
                  {isBufferFull ? "Rolling (Oldest Discarded)" : `${Math.round(bufferPercentage)}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${isBufferFull ? 'bg-white animate-pulse' :
                      bufferPercentage > 80 ? 'bg-neutral-400' : 'bg-white'
                    }`}
                  style={{ width: `${bufferPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorState && (
          <div className="flex flex-col items-start space-y-2 text-white bg-neutral-800 border border-neutral-700 px-4 py-3 rounded-lg text-sm w-full max-w-md relative pr-8">
            <div className="flex items-start space-x-3 w-full">
              <div className="flex-1">
                <p className="font-bold">{errorState.title}</p>
                <p className="text-neutral-400 text-xs mt-1 leading-relaxed">{errorState.message}</p>
              </div>
            </div>
            <button
              onClick={() => {
                clearRecordingError();
                setProcessingError(null);
              }}
              className="absolute top-2 right-2 text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-700 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex space-x-3 mt-1">
              {processingError && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Result Area */}
      {result && (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden animate-fade-in-up p-8 space-y-6">
          <div className="prose prose-invert max-w-none">
            <h3 className="text-lg font-semibold text-white mb-4 border-b border-neutral-800 pb-2">
              {mode === 'SEARCH' ? 'Research Report' : 'Strategic Analysis'}
            </h3>
            <div className="whitespace-pre-wrap text-neutral-300 leading-relaxed">
              {result.text}
            </div>
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="bg-neutral-800 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide flex items-center">
                <Globe className="w-4 h-4 mr-2" />
                Sources
              </h4>
              <ul className="space-y-2">
                {result.sources.map((source, idx) => (
                  <li key={idx}>
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start space-x-2 text-sm text-white hover:underline transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{source.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchAssistant;