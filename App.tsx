import React, { useState } from 'react';
import { AppMode } from './types';
import DraftingAssistant from './components/DraftingAssistant';
import LiveCoach from './components/LiveCoach';
import ResearchAssistant from './components/ResearchAssistant';
import { Bot, Mic2, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.DRAFT);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="bg-black border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* New Logo matching provided image - Bold geometric Ai */}
            <div className="shrink-0">
              <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Rounded square border */}
                <rect x="3" y="3" width="94" height="94" rx="16" stroke="black" strokeWidth="6" fill="white" />
                {/* Bold A shape */}
                <path d="M15 85L35 15H50L35 55H50V85H35V55H25L15 85Z" fill="black" />
                <path d="M35 15H50V55H35L50 15Z" fill="black" />
                {/* Bold i dot (circle) */}
                <circle cx="72" cy="22" r="12" fill="black" />
                {/* Bold i body */}
                <rect x="60" y="40" width="24" height="45" fill="black" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Mozhi <span className="text-neutral-500 font-normal ml-1">AI Professional</span>
            </h1>
          </div>

          <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMode(AppMode.DRAFT)}
              className={`
                px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
                ${mode === AppMode.DRAFT
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
                }
              `}
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Drafting</span>
            </button>
            <button
              onClick={() => setMode(AppMode.RESEARCH)}
              className={`
                px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
                ${mode === AppMode.RESEARCH
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
                }
              `}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Research</span>
            </button>
            <button
              onClick={() => setMode(AppMode.LIVE)}
              className={`
                px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
                ${mode === AppMode.LIVE
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
                }
              `}
            >
              <Mic2 className="w-4 h-4" />
              <span className="hidden sm:inline">Live Coach</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {mode === AppMode.DRAFT && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-4">Professional Translator</h2>
                <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  Speak in Tamil, and I'll draft the perfect professional message.
                  Use <strong className="text-white">Deep Reasoning</strong> for complex communications.
                </p>
              </div>
              <DraftingAssistant />
            </div>
          )}

          {mode === AppMode.RESEARCH && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-4">Research & Analysis</h2>
                <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  Ask me anything. I can browse <strong className="text-white">Google</strong> for latest news or use <strong className="text-white">Deep Thinking</strong> to analyze complex strategies.
                </p>
              </div>
              <ResearchAssistant />
            </div>
          )}

          {mode === AppMode.LIVE && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-4">Conversation Practice</h2>
                <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  Connect with the AI coach to practice your corporate English speaking skills in real-time.
                </p>
              </div>
              <LiveCoach />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-neutral-800 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-neutral-500 text-sm">
          <p>Created by M. Viswajith</p>
        </div>
      </footer>
    </div>
  );
};

export default App;