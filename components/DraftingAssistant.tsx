import React, { useState, useRef, useEffect } from 'react';
import { OutputFormat, DraftResponse } from '../types';
import { generateDraft, generateSpeech } from '../services/geminiService';
import {
  Play, RefreshCw, Mail, MessageCircle, MessageSquare,
  Copy, Check, BrainCircuit, Zap, History as HistoryIcon,
  Trash2, X, ChevronRight, Download, Mic, Square
} from 'lucide-react';
import { base64ToBytes, pcmToAudioBuffer } from '../utils/audioUtils';
import { useAudioRecording, useWaveform, ErrorState } from '../hooks';
import { Tooltip } from './ui';

// Types
interface HistoryItem {
  id: string;
  timestamp: number;
  drafts: DraftResponse;
  summary: string;
  mode: 'Flash' | 'Pro';
}

// Helper functions
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const DraftingAssistant: React.FC = () => {
  // UI State
  const [activeTab, setActiveTab] = useState<OutputFormat>(OutputFormat.EMAIL);
  const [useHighIntellect, setUseHighIntellect] = useState(false);
  const [generatedDrafts, setGeneratedDrafts] = useState<DraftResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<ErrorState | null>(null);

  // TTS State
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Results ref for auto-scroll
  const resultsRef = useRef<HTMLDivElement>(null);

  // Use shared audio recording hook
  const {
    isRecording,
    recordingDuration,
    bufferPercentage,
    isBufferFull,
    errorState: recordingError,
    analyserRef,
    startRecording: startRecordingHook,
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

  // Load history from local storage
  useEffect(() => {
    const saved = localStorage.getItem('mozhi_draft_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Auto-scroll to results when generated
  useEffect(() => {
    if (generatedDrafts && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [generatedDrafts]);

  // History functions
  const saveToHistory = (drafts: DraftResponse, usedPro: boolean) => {
    const subjectLine = drafts.email.match(/Subject: (.*)/i)?.[1];
    const summary = subjectLine || drafts.email.substring(0, 50) + "...";

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      drafts,
      summary: summary.length > 60 ? summary.substring(0, 60) + '...' : summary,
      mode: usedPro ? 'Pro' : 'Flash'
    };

    const updated = [newItem, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem('mozhi_draft_history', JSON.stringify(updated));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('mozhi_draft_history', JSON.stringify(updated));
    if (history.length === 1) setShowHistory(false);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      setHistory([]);
      localStorage.removeItem('mozhi_draft_history');
      setShowHistory(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setGeneratedDrafts(item.drafts);
    setUseHighIntellect(item.mode === 'Pro');
    setShowHistory(false);
  };

  // Processing functions
  async function processAudioBlob(audioBlob: Blob) {
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const drafts = await generateDraft(audioBlob, useHighIntellect);
      setGeneratedDrafts(drafts);
      saveToHistory(drafts, useHighIntellect);
    } catch (error: any) {
      console.error("Processing failed", error);

      let title = "Processing Failed";
      let message = "An unexpected error occurred. Please try again.";
      const errString = error.toString().toLowerCase();

      if (errString.includes("safety") || errString.includes("blocked")) {
        title = "Content Flagged";
        message = "The content was flagged by safety filters. Please try rephrasing.";
      } else if (errString.includes("429") || errString.includes("resource exhausted")) {
        title = "High Traffic";
        message = "Mozhi is very popular right now! Please wait a moment and try again.";
      } else if (errString.includes("no response generated") || errString.includes("candidate")) {
        title = "Audio Unclear";
        message = "We couldn't hear you clearly. Please speak closer to the microphone.";
      } else if (errString.includes("network") || errString.includes("fetch")) {
        title = "Connection Error";
        message = "Please check your internet connection and try again.";
      }

      setProcessingError({ title, message });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRecordingStop(audioBlob: Blob) {
    await processAudioBlob(audioBlob);
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setGeneratedDrafts(null);
      startRecordingHook();
    }
  };

  const handleRetry = async () => {
    const audioBlob = getAudioBlob();
    if (audioBlob) {
      await processAudioBlob(audioBlob);
    }
  };

  // Output functions
  const getCurrentText = (): string => {
    if (!generatedDrafts) return "";
    switch (activeTab) {
      case OutputFormat.EMAIL: return generatedDrafts.email;
      case OutputFormat.WHATSAPP: return generatedDrafts.whatsapp;
      case OutputFormat.TEAM_CHAT: return generatedDrafts.teamChat;
      default: return "";
    }
  };

  const handlePlayTTS = async () => {
    const text = getCurrentText();
    if (!text || isPlayingTTS) return;

    setIsPlayingTTS(true);
    try {
      const base64Audio = await generateSpeech(text);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBytes = base64ToBytes(base64Audio);
      const audioBuffer = pcmToAudioBuffer(audioBytes, audioContextRef.current, 24000);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlayingTTS(false);
      source.start(0);
    } catch (error) {
      console.error("TTS Error", error);
      setIsPlayingTTS(false);
      setProcessingError({ title: "Playback Error", message: "Failed to play audio. Please try again." });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const text = getCurrentText();
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const formats: Record<OutputFormat, string> = {
      [OutputFormat.EMAIL]: `mozhi-email-${timestamp}.txt`,
      [OutputFormat.WHATSAPP]: `mozhi-whatsapp-${timestamp}.txt`,
      [OutputFormat.TEAM_CHAT]: `mozhi-teamchat-${timestamp}.txt`,
    };

    a.download = formats[activeTab];
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorState = recordingError || processingError;

  const outputTabs = [
    { id: OutputFormat.EMAIL, label: 'Email', icon: Mail, tip: "Formal email format" },
    { id: OutputFormat.WHATSAPP, label: 'WhatsApp', icon: MessageCircle, tip: "Casual quick message" },
    { id: OutputFormat.TEAM_CHAT, label: 'Team Chat', icon: MessageSquare, tip: "Bullet points for Slack/Teams" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative">
      {/* History Toggle Button */}
      <div className="absolute top-0 right-0 z-10">
        <Tooltip text="View your past drafts" position="left">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center space-x-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-700 text-sm font-medium"
          >
            <HistoryIcon className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
        </Tooltip>
      </div>

      {/* Model Selector */}
      <div className="flex flex-col items-center space-y-3 pt-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Select AI Model</span>
        <div className="bg-neutral-900 p-1.5 rounded-xl border border-neutral-700 flex space-x-1">
          <Tooltip text="Standard model for fast daily tasks" position="top">
            <button
              onClick={() => setUseHighIntellect(false)}
              className={`
                flex items-center space-x-3 px-5 py-3 rounded-lg transition-all duration-200 border
                ${!useHighIntellect
                  ? 'bg-white border-white text-black'
                  : 'bg-transparent border-transparent text-neutral-400 hover:text-white'}
              `}
            >
              <div className={`p-1.5 rounded-full ${!useHighIntellect ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold">Standard (Flash)</span>
                <span className="text-xs opacity-75">Fast & Efficient</span>
              </div>
            </button>
          </Tooltip>

          <Tooltip text="Advanced reasoning for complex topics" position="top">
            <button
              onClick={() => setUseHighIntellect(true)}
              className={`
                flex items-center space-x-3 px-5 py-3 rounded-lg transition-all duration-200 border
                ${useHighIntellect
                  ? 'bg-white border-white text-black'
                  : 'bg-transparent border-transparent text-neutral-400 hover:text-white'}
              `}
            >
              <div className={`p-1.5 rounded-full ${useHighIntellect ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-semibold">Reasoning (Pro)</span>
                <span className="text-xs opacity-75">Deep Thinking</span>
              </div>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Recording Area */}
      <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 flex flex-col items-center justify-center space-y-6 min-h-[350px]">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-white">
            {isRecording ? "Listening..." : "Speak in Tamil"}
          </h2>
          <p className="text-neutral-400 text-sm">
            {useHighIntellect
              ? "I will think deeply to draft complex, nuanced content."
              : "I will generate Email, WhatsApp, and Team Chat drafts simultaneously."}
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
                {useHighIntellect ? "Thinking & Drafting..." : "Drafting Content..."}
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
              {processingError && getAudioBlob() && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              {!processingError && (
                <button
                  onClick={startRecordingHook}
                  className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1"
                >
                  <span>Try Again</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Output Area */}
      {generatedDrafts && (
        <div ref={resultsRef} className="bg-neutral-900 rounded-2xl border border-neutral-800 animate-fade-in-up">
          {/* Tabs */}
          <div className="flex border-b border-neutral-800 bg-neutral-900/50 rounded-t-2xl">
            {outputTabs.map((item) => (
              <div key={item.id} className="flex-1">
                <Tooltip text={item.tip} position="top">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`
                      w-full flex items-center justify-center space-x-2 py-4 text-sm font-medium transition-colors
                      ${activeTab === item.id
                        ? 'bg-neutral-800 text-white border-b-2 border-white'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'}
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                Generated Draft
              </h3>
              <div className="flex space-x-2">
                <Tooltip text="Read aloud">
                  <button
                    onClick={handlePlayTTS}
                    disabled={isPlayingTTS}
                    className="p-2 text-white hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    {isPlayingTTS ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  </button>
                </Tooltip>

                <Tooltip text="Download as text file">
                  <button
                    onClick={handleExport}
                    className="p-2 text-white hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </Tooltip>

                <Tooltip text="Copy to clipboard">
                  <button
                    onClick={handleCopy}
                    className="p-2 text-white hover:bg-neutral-800 rounded-full transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="relative">
              <textarea
                className="w-full h-64 p-4 rounded-lg bg-neutral-800 border border-neutral-700 resize-none outline-none text-white text-base leading-relaxed focus:border-white focus:ring focus:ring-white/10 transition-all"
                value={getCurrentText()}
                readOnly
              />
            </div>
          </div>
        </div>
      )}

      {/* History Slide-over */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-neutral-900 shadow-2xl h-full flex flex-col animate-slide-in-right border-l border-neutral-800">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Draft History</h3>
                <p className="text-xs text-neutral-500">Your recent generated content</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 space-y-3">
                  <HistoryIcon className="w-12 h-12 opacity-20" />
                  <p>No history yet</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="group p-4 bg-neutral-800 border border-neutral-700 rounded-xl hover:border-white hover:shadow-md transition-all cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${item.mode === 'Pro' ? 'bg-neutral-700 text-white' : 'bg-neutral-600 text-white'}`}>
                        {item.mode}
                      </span>
                      <span className="text-xs text-neutral-500">{formatDate(item.timestamp)}</span>
                    </div>
                    <h4 className="text-sm font-medium text-white line-clamp-2 pr-6">
                      {item.summary}
                    </h4>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-neutral-700">
                      <span className="text-xs text-white font-medium flex items-center group-hover:underline">
                        View Draft <ChevronRight className="w-3 h-3 ml-1" />
                      </span>
                      <Tooltip text="Delete from history" position="left">
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-700 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-neutral-800">
                <button
                  onClick={clearHistory}
                  className="w-full py-2 text-sm text-red-400 hover:bg-neutral-800 rounded-lg transition-colors font-medium border border-neutral-700 hover:border-red-400"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftingAssistant;