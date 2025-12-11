import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Volume2, Activity, XCircle } from 'lucide-react';
import { base64Encode, floatTo16BitPCM, base64ToBytes, pcmToAudioBuffer } from '../utils/audioUtils';

const LiveCoach: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null); // Holds the resolve function or session object promise
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const disconnect = () => {
    // Stop visualization loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio contexts
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    setIsConnected(false);
    setStatus('idle');
    setVolumeLevel(0);
  };

  const connect = async () => {
    setStatus('connecting');
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    try {
      // 1. Setup Audio Input with Analysis
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputContext;

      const source = inputContext.createMediaStreamSource(stream);

      // Setup Analyser for visualization
      const analyser = inputContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Using ScriptProcessor as per guidance (AudioWorklet is better but this is allowed for simple implementation)
      const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);

      // Fan-out: Source also connects to scriptProcessor
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputContext.destination);

      // Start Visualization Loop
      const updateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;

        // Scale it up a bit for visual impact
        setVolumeLevel(avg * 1.5);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 2. Setup Audio Output
      const outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputContext;
      outputNodeRef.current = outputContext.createGain();
      outputNodeRef.current.connect(outputContext.destination);
      nextStartTimeRef.current = 0;

      // 3. Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `
            You are a professional corporate English communication coach in an app called "Mozhi AI Professional".
            This app was created by M. Viswajith. If anyone asks who created this app or model, say "This app was created by M. Viswajith."
            The user speaks Tamil and wants to improve their professional English.
            
            1. Listen to their Tamil input.
            2. Translate it mentally to understand their intent.
            3. Respond in English.
            4. Gently correct their grammar or suggest a more professional phrase if applicable.
            5. Keep the conversation flowing naturally. 
            6. Be encouraging and helpful.
          `,
        },
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setIsConnected(true);
            setStatus('connected');

            // Start streaming input
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; // Don't send if muted

              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = base64Encode(pcmData);

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64Data
                  }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContext && outputNodeRef.current) {
              try {
                // Manually decode raw PCM data
                const audioBytes = base64ToBytes(base64Audio);
                const audioBuffer = pcmToAudioBuffer(audioBytes, outputContext, 24000);

                const bufferSource = outputContext.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.connect(outputNodeRef.current);

                // Scheduling
                const currentTime = outputContext.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                  nextStartTimeRef.current = currentTime;
                }

                bufferSource.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;

              } catch (e) {
                console.error("Error decoding audio chunk", e);
              }
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            setIsConnected(false);
            setStatus('idle');
          },
          onerror: (err) => {
            console.error("Live Session Error", err);
            setStatus('error');
            disconnect();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to connect", error);
      setStatus('error');
      disconnect();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-neutral-900 rounded-3xl border border-neutral-800 text-white relative overflow-hidden">

      {/* Abstract Background Animation */}
      {isConnected && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-neutral-400 rounded-full blur-2xl animate-ping" style={{ animationDuration: '3s' }}></div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-6 left-6 flex items-center space-x-2 bg-neutral-800/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-700">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white animate-pulse' : 'bg-neutral-500'}`}></div>
        <span className="text-xs font-medium tracking-wide">
          {status === 'idle' ? 'Ready' : status === 'connecting' ? 'Connecting...' : status === 'connected' ? 'Live Coach' : 'Error'}
        </span>
      </div>

      {/* Main Visualizer / Button */}
      <div className="relative z-10 flex flex-col items-center space-y-8">

        <div className="relative">
          {/* Ripple Effects when talking */}
          {isConnected && volumeLevel > 15 && (
            <>
              <div className="absolute inset-0 rounded-full border border-white/30 scale-110 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border border-white/20 scale-125 animate-ping" style={{ animationDelay: '0.2s' }}></div>
            </>
          )}

          <div
            className={`
              w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all duration-500
              ${isConnected
                ? 'bg-white text-black scale-110'
                : 'bg-neutral-800 border border-neutral-700'
              }
            `}
          >
            {status === 'connecting' ? (
              <Activity className="w-12 h-12 text-white animate-spin" />
            ) : isConnected ? (
              <Volume2 className={`w-12 h-12 ${volumeLevel > 20 ? 'animate-bounce' : ''}`} />
            ) : (
              <Mic className="w-12 h-12 text-neutral-400" />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-6">
          {!isConnected ? (
            <button
              onClick={connect}
              className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition-transform active:scale-95 flex items-center"
            >
              Start Conversation
            </button>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors border ${isMuted ? 'bg-neutral-800 text-neutral-400 border-neutral-600' : 'bg-neutral-800 text-white border-neutral-600 hover:bg-neutral-700'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              <button
                onClick={disconnect}
                className="px-8 py-3 bg-white hover:bg-neutral-200 text-black rounded-full font-bold transition-colors flex items-center"
              >
                End Call
              </button>
            </>
          )}
        </div>

        <p className="text-neutral-400 text-sm max-w-xs text-center">
          {isConnected
            ? "Speak in Tamil. I will respond in professional English."
            : "Practice your professional English with a real-time AI coach."}
        </p>
      </div>
    </div>
  );
};

export default LiveCoach;