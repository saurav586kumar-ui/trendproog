import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Send,
  RotateCcw,
  Radio,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  Search,
  ShoppingCart
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useCart } from '../../context/CartContext';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string, params?: Record<string, any>) => void;
}

interface MessageTurn {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedProducts?: Product[];
  actionMessage?: string;
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'permission_denied' | 'error';

// Check SpeechRecognition browser capability
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { products } = useStore();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();

  // Assistant State
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<MessageTurn[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: 'Namaste! Main TrendPro voice assistant hoon. Aap Hindi, English, ya Hinglish mein kuch bhi pooch sakte hain. Jaise "Headphones under ₹1,000" ya "Mujhe shoes dikhao".',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(() => {
    return localStorage.getItem('trendpro_wake_word_enabled') === 'true';
  });
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // References
  const recognitionRef = useRef<any>(null);
  const wakeWordRecognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isComponentMounted = useRef(true);

  // Save wake word preference
  useEffect(() => {
    localStorage.setItem('trendpro_wake_word_enabled', wakeWordActive ? 'true' : 'false');
  }, [wakeWordActive]);

  // Scroll messages to bottom on update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript, voiceState]);

  // Stop any active audio playback (Interruption support)
  const stopAudioPlayback = useCallback(() => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch {
        // Ignored
      }
      currentAudioSourceRef.current = null;
    }
    if (activeAudioElementRef.current) {
      try {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current.currentTime = 0;
      } catch {
        // Ignored
      }
      activeAudioElementRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Web Audio Context initializer
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Natural Speech Playback: Gemini 3.8 Audio or Browser Native TTS fallback
  const playSpeech = useCallback(
    async (text: string, base64Audio?: string | null, mimeType = 'audio/wav') => {
      if (isMuted) return;
      stopAudioPlayback();

      // 1. If high-fidelity Gemini-generated audio is provided, play it
      if (base64Audio) {
        try {
          const binary = atob(base64Audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          activeAudioElementRef.current = audio;

          setVoiceState('speaking');

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setVoiceState('idle');
            activeAudioElementRef.current = null;
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            activeAudioElementRef.current = null;
            // Fallback to browser TTS if audio decoding fails
            fallbackBrowserTTS(text);
          };

          await audio.play();
          return;
        } catch (err) {
          console.warn('Audio tag playback error, attempting fallback:', err);
        }
      }

      // 2. Fallback: Browser Web Speech Synthesis
      fallbackBrowserTTS(text);
    },
    [isMuted, stopAudioPlayback]
  );

  const fallbackBrowserTTS = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setVoiceState('idle');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~]/g, '').replace(/₹/g, 'Rupees ');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Detect hindi characters or set suitable voice
      const isHindi = /[\u0900-\u097F]/.test(clean);
      const voices = window.speechSynthesis.getVoices();
      if (isHindi) {
        const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('IN'));
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        const inVoice = voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('en_IN'));
        if (inVoice) utterance.voice = inVoice;
      }

      utterance.onstart = () => setVoiceState('speaking');
      utterance.onend = () => setVoiceState('idle');
      utterance.onerror = () => setVoiceState('idle');

      window.speechSynthesis.speak(utterance);
    } catch {
      setVoiceState('idle');
    }
  };

  // Process User Speech through Gemini 3.8 Backend
  const handleUserMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed) return;

      // User interrupted current speech or initiated turn
      stopAudioPlayback();
      setCurrentTranscript('');
      setVoiceState('thinking');

      // Add user turn to chat UI
      const userTurnId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userTurnId,
          sender: 'user',
          text: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      try {
        // Send to server-side Gemini conversational pipeline
        const historyForApi = messages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

        const response = await fetch('/api/voice/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            conversationHistory: historyForApi,
            catalog: products,
          }),
        });

        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          console.error('Non-JSON response from /api/voice/assistant:', responseText.slice(0, 200));
          throw new Error(
            response.ok
              ? 'Invalid server response format'
              : `Server error (${response.status}): ${response.statusText || 'Endpoint unavailable'}`
          );
        }

        if (!response.ok) {
          throw new Error(data?.error || `Server responded with ${response.status}`);
        }

        const replyText = data.replyText || 'TrendPro store mein aapka swagat hai!';
        const matchingIds: string[] = data.matchingProductIds || [];
        const action = data.action || { type: 'none' };

        // Match real products from local catalog
        const matchedProductsList = products.filter((p) => matchingIds.includes(p.id));

        // Format action feedback
        let actionMsg: string | undefined;

        if (action.type === 'view_product' && action.productId) {
          const p = products.find((x) => x.id === action.productId);
          if (p) {
            actionMsg = `Opening details for ${p.name}`;
            onNavigate('product-detail', { id: p.id, slug: p.slug });
          }
        } else if (action.type === 'add_to_cart' && action.productId) {
          const p = products.find((x) => x.id === action.productId);
          if (p) {
            addToCart(p, 1);
            actionMsg = `Added "${p.name}" to your shopping cart.`;
          }
        } else if (action.type === 'add_to_wishlist' && action.productId) {
          const p = products.find((x) => x.id === action.productId);
          if (p) {
            toggleWishlist(p.id);
            actionMsg = `Saved "${p.name}" to your wishlist.`;
          }
        } else if (action.type === 'navigate' && action.route) {
          actionMsg = `Navigating to ${action.route}...`;
          onNavigate(action.route);
        } else if (action.type === 'filter_category' && action.category) {
          actionMsg = `Browsing ${action.category}...`;
          onNavigate('products', { category: action.category });
        }

        // Add assistant turn to chat
        const assistantTurn: MessageTurn = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          matchedProducts: matchedProductsList,
          actionMessage: actionMsg,
        };

        setMessages((prev) => [...prev, assistantTurn]);

        // Speak response out loud
        playSpeech(replyText, data.audioBase64, data.audioMimeType);
      } catch (err: any) {
        console.error('TrendPro voice query failed:', err);
        setVoiceState('error');
        const fallbackText =
          'Maaf kijiye, TrendPro AI connects with high security. Kripya check karein ki backend server chal raha hai.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: fallbackText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        playSpeech(fallbackText);
      }
    },
    [addToCart, messages, onNavigate, playSpeech, products, stopAudioPlayback, toggleWishlist]
  );

  // Setup Visualizer & Audio meter for microphone
  const setupAudioMetering = useCallback(async (stream: MediaStream) => {
    try {
      const audioCtx = getAudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch {
      // Non-critical metering error
    }
  }, [getAudioContext]);

  // Clean audio visualizer
  const stopAudioMetering = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Start Voice Recognition session
  const startListening = useCallback(async () => {
    // Interruption: if assistant is talking, cut off immediately
    stopAudioPlayback();
    setPermissionNotice(null);

    // Check microphone availability
    if (!SpeechRecognitionAPI && !navigator.mediaDevices?.getUserMedia) {
      setPermissionNotice(
        'Continuous speech recognition is unsupported in this browser. You can type in the box below!'
      );
      return;
    }

    try {
      // Explicit microphone permission check
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setupAudioMetering(stream);
    } catch (permErr: any) {
      console.warn('Microphone permission not granted:', permErr);
      setVoiceState('permission_denied');
      setPermissionNotice('Microphone access was denied. Please allow microphone permissions in browser settings.');
      return;
    }

    if (SpeechRecognitionAPI) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // Ignored
          }
        }

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = true;
        // Listen in Hindi + Indian English / Hinglish
        recognition.lang = 'hi-IN';

        recognition.onstart = () => {
          setVoiceState('listening');
          setCurrentTranscript('');
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (final) {
            setCurrentTranscript(final);
            handleUserMessage(final);
          } else {
            setCurrentTranscript(interim);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition event error:', e.error);
          stopAudioMetering();
          if (e.error === 'not-allowed') {
            setVoiceState('permission_denied');
            setPermissionNotice('Microphone permission blocked. Please enable it to speak to TrendPro.');
          } else if (e.error !== 'aborted') {
            setVoiceState('idle');
          }
        };

        recognition.onend = () => {
          stopAudioMetering();
          // If we weren't transitioned to thinking or speaking, reset to idle
          setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
        };

        recognition.start();
      } catch (recErr) {
        console.error('Failed to start speech recognition:', recErr);
        stopAudioMetering();
        setVoiceState('idle');
      }
    } else {
      setVoiceState('idle');
      setPermissionNotice('Your browser does not support Web Speech Recognition. You can type in the prompt box!');
    }
  }, [handleUserMessage, setupAudioMetering, stopAudioMetering, stopAudioPlayback]);

  // Stop listening explicitly
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    stopAudioMetering();
    setVoiceState('idle');
  }, [stopAudioMetering]);

  // Hands-free "Hi TrendPro" Wake Word listener
  useEffect(() => {
    if (!wakeWordActive || !SpeechRecognitionAPI || voiceState === 'listening' || voiceState === 'speaking') {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch {
          // Ignored
        }
        wakeWordRecognitionRef.current = null;
      }
      return;
    }

    try {
      const wakeRecognizer = new SpeechRecognitionAPI();
      wakeWordRecognitionRef.current = wakeRecognizer;
      wakeRecognizer.continuous = true;
      wakeRecognizer.interimResults = false;
      wakeRecognizer.lang = 'en-US';

      wakeRecognizer.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const text = (lastResult[0].transcript || '').toLowerCase();
        
        // Match "hi trendpro", "hello trendpro", "hey trendpro"
        if (
          text.includes('trendpro') ||
          text.includes('trend pro') ||
          text.includes('hi trend') ||
          text.includes('hello trend') ||
          text.includes('hey trend')
        ) {
          wakeRecognizer.stop();
          startListening();
        }
      };

      wakeRecognizer.onerror = () => {
        // Silent error for continuous wake monitor
      };

      wakeRecognizer.onend = () => {
        if (wakeWordActive && isComponentMounted.current && voiceState === 'idle') {
          try {
            wakeRecognizer.start();
          } catch {
            // Ignored
          }
        }
      };

      wakeRecognizer.start();
    } catch {
      // Ignored
    }

    return () => {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch {
          // Ignored
        }
        wakeWordRecognitionRef.current = null;
      }
    };
  }, [wakeWordActive, voiceState, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      stopAudioPlayback();
      stopAudioMetering();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignored
        }
      }
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.abort();
        } catch {
          // Ignored
        }
      }
    };
  }, [stopAudioMetering, stopAudioPlayback]);

  // Handle Text Submission fallback
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    handleUserMessage(msg);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-500/30 shadow-2xl flex flex-col h-[90vh] max-h-[760px] overflow-hidden">
        
        {/* Glowing Top Ambient Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-indigo-500/15 blur-3xl rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-5 py-4 border-b border-indigo-500/20 flex items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              {voiceState === 'listening' && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white tracking-tight">
                  Trend<span className="text-indigo-400">Pro</span> AI
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Voice Assistant
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    voiceState === 'listening'
                      ? 'bg-emerald-400 animate-pulse'
                      : voiceState === 'speaking'
                      ? 'bg-amber-400 animate-pulse'
                      : voiceState === 'thinking'
                      ? 'bg-indigo-400 animate-spin'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="capitalize">
                  {voiceState === 'listening'
                    ? 'Listening to you...'
                    : voiceState === 'thinking'
                    ? 'Thinking & searching catalog...'
                    : voiceState === 'speaking'
                    ? 'Speaking response...'
                    : 'Ready to listen'}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] text-slate-400">Hindi / English / Hinglish</span>
              </p>
            </div>
          </div>

          {/* Action buttons: Mute, Wake word toggle, Close */}
          <div className="flex items-center gap-2">
            {/* Wake Word Switch */}
            <button
              onClick={() => setWakeWordActive(!wakeWordActive)}
              title={
                wakeWordActive
                  ? 'Hands-free "Hi TrendPro" wake phrase is ON'
                  : 'Enable "Hi TrendPro" hands-free wake word'
              }
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                wakeWordActive
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-xs'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${wakeWordActive ? 'text-emerald-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Wake: &ldquo;Hi TrendPro&rdquo;</span>
            </button>

            {/* Mute Button */}
            <button
              onClick={() => {
                if (!isMuted) stopAudioPlayback();
                setIsMuted(!isMuted);
              }}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer border ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title={isMuted ? 'Unmute AI speech' : 'Mute AI voice output'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                stopAudioPlayback();
                stopListening();
                onClose();
              }}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Permission / Status Alert Banner if needed */}
        {permissionNotice && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{permissionNotice}</span>
            </div>
            <button
              onClick={() => setPermissionNotice(null)}
              className="text-amber-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Center Conversation Transcript Area */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col ${turn.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                <span>{turn.sender === 'user' ? 'You' : 'TrendPro Assistant'}</span>
                <span>•</span>
                <span>{turn.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                  turn.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-xs backdrop-blur-xs'
                }`}
              >
                <p className="whitespace-pre-wrap">{turn.text}</p>

                {/* Shopping Action Feedback badge */}
                {turn.actionMessage && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{turn.actionMessage}</span>
                  </div>
                )}
              </div>

              {/* Integrated Matching Product Cards Grounded in Catalog */}
              {turn.matchedProducts && turn.matchedProducts.length > 0 && (
                <div className="w-full mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                    <span>Matching Catalog Products ({turn.matchedProducts.length})</span>
                    <span className="text-[11px] text-indigo-400">Verified TrendPro Catalog</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {turn.matchedProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-800/95 hover:bg-slate-750 border border-slate-750 hover:border-indigo-500/50 rounded-xl p-3 flex gap-3 transition-all group"
                      >
                        <img
                          src={p.mainImage}
                          alt={p.name}
                          className="w-16 h-16 object-contain rounded-lg bg-slate-900 border border-slate-700 p-1 shrink-0 group-hover:scale-105 transition-transform"
                        />
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider truncate">
                                {p.brand}
                              </span>
                              {p.rating && (
                                <span className="text-[10px] font-bold text-amber-400 flex items-center">
                                  ★ {p.rating}
                                </span>
                              )}
                            </div>
                            <h4
                              onClick={() => {
                                onNavigate('product-detail', { id: p.id, slug: p.slug });
                                onClose();
                              }}
                              className="text-xs font-bold text-white hover:text-indigo-300 cursor-pointer line-clamp-1 transition-colors"
                              title={p.name}
                            >
                              {p.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-black text-white">
                                ₹{p.sellingPrice.toLocaleString()}
                              </span>
                              {p.discountPercent > 0 && (
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  {p.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <button
                              onClick={() => {
                                addToCart(p, 1);
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    id: `act-${Date.now()}`,
                                    sender: 'assistant',
                                    text: `Aapke cart mein "${p.name}" add kar diya gaya hai!`,
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  },
                                ]);
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Add to Cart</span>
                            </button>
                            <button
                              onClick={() => {
                                onNavigate('product-detail', { id: p.id, slug: p.slug });
                                onClose();
                              }}
                              className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="View Product Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Live Interim Speech Transcription Indicator */}
          {currentTranscript && (
            <div className="flex flex-col items-end space-y-1 animate-pulse">
              <span className="text-[10px] text-indigo-300">Hearing right now...</span>
              <div className="bg-indigo-900/60 border border-indigo-400/40 rounded-2xl px-4 py-2 text-sm text-indigo-100 max-w-[80%] italic">
                &ldquo;{currentTranscript}&rdquo;
              </div>
            </div>
          )}

          {/* Thinking Animation */}
          {voiceState === 'thinking' && (
            <div className="flex items-center gap-2 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 rounded-xl px-4 py-3 w-fit animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>TrendPro searching authentic catalogue...</span>
            </div>
          )}
        </div>

        {/* Suggestion Quick Chips */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/70 overflow-x-auto scrollbar-none flex items-center gap-2 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            Try saying:
          </span>
          {[
            'Headphones under ₹1,000',
            'Mujhe ₹2,000 ke andar headphones chahiye',
            'Show me trending products',
            'Koi achha gift suggest karo',
            'Open my cart',
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => handleUserMessage(sample)}
              className="shrink-0 px-3 py-1 rounded-full bg-slate-800 hover:bg-indigo-600/40 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-500/50 transition-colors text-[11px] cursor-pointer"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>

        {/* Bottom Interactive Area: Orb Waveform, Mic Button, Text Fallback */}
        <div className="p-4 sm:p-5 border-t border-indigo-500/20 bg-slate-900/90 backdrop-blur-md flex flex-col items-center gap-3">
          
          {/* Animated Futuristic Voice Orb & Waveform */}
          <div className="flex items-center justify-center gap-3 w-full">
            
            {/* Waveform Bars */}
            <div className="flex items-center gap-1 h-8">
              {[40, 70, 100, 60, 90, 50, 80].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height:
                      voiceState === 'listening'
                        ? `${Math.max(15, Math.min(100, (audioLevel / 100) * h + 15))}%`
                        : voiceState === 'speaking'
                        ? `${(i % 2 === 0 ? 70 : 40)}%`
                        : '20%',
                  }}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    voiceState === 'listening'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : voiceState === 'speaking'
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Central Main Microphone Trigger Button */}
            <button
              onClick={() => {
                if (voiceState === 'listening') {
                  stopListening();
                } else if (voiceState === 'speaking') {
                  stopAudioPlayback();
                  setVoiceState('idle');
                } else {
                  startListening();
                }
              }}
              className={`relative group w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                voiceState === 'listening'
                  ? 'bg-emerald-500 text-white shadow-emerald-500/50 ring-4 ring-emerald-400/30 scale-105'
                  : voiceState === 'speaking'
                  ? 'bg-amber-500 text-white shadow-amber-500/50 ring-4 ring-amber-400/30'
                  : voiceState === 'thinking'
                  ? 'bg-indigo-600 text-white shadow-indigo-500/50 ring-4 ring-indigo-400/30'
                  : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/40 hover:scale-105'
              }`}
              title={
                voiceState === 'listening'
                  ? 'Tap to stop listening'
                  : voiceState === 'speaking'
                  ? 'Tap to interrupt speech'
                  : 'Tap to speak to TrendPro'
              }
            >
              {voiceState === 'listening' ? (
                <Mic className="w-7 h-7 animate-pulse" />
              ) : voiceState === 'speaking' ? (
                <Volume2 className="w-7 h-7 animate-bounce" />
              ) : voiceState === 'thinking' ? (
                <Sparkles className="w-7 h-7 animate-spin" />
              ) : (
                <Mic className="w-7 h-7" />
              )}

              {/* Pulsing Outer Rings */}
              {voiceState === 'listening' && (
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
              )}
            </button>

            {/* Waveform Bars (Right Side) */}
            <div className="flex items-center gap-1 h-8">
              {[80, 50, 90, 60, 100, 70, 40].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height:
                      voiceState === 'listening'
                        ? `${Math.max(15, Math.min(100, (audioLevel / 100) * h + 15))}%`
                        : voiceState === 'speaking'
                        ? `${(i % 2 === 1 ? 70 : 40)}%`
                        : '20%',
                  }}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    voiceState === 'listening'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : voiceState === 'speaking'
                      ? 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium text-center">
            {voiceState === 'listening'
              ? '🎤 Listening... Tap mic button when finished'
              : voiceState === 'speaking'
              ? '🔊 TrendPro is speaking (tap to interrupt)'
              : voiceState === 'thinking'
              ? '⚡ Searching real catalogue...'
              : 'Tap the microphone or say "Hi TrendPro" to speak'}
          </p>

          {/* Text Input Fallback Bar */}
          <form onSubmit={handleTextSubmit} className="w-full flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your request (e.g. 'Show me headphones under ₹1000')..."
                className="w-full bg-slate-800/80 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
