import { useState, useCallback, useRef, useEffect } from "react";

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  lastHeard: string | null;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

// Web Speech API types (not always in TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

export function useVoiceRecognition(
  onResult: (word: "hit" | "miss") => void
): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const shouldRestartRef = useRef(false);

  onResultRef.current = onResult;

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      if (last && last[0]) {
        const transcript = last[0].transcript.trim().toLowerCase();
        setLastHeard(transcript);

        if (transcript.includes("hit") || transcript.includes("swish") || transcript.includes("bucket")) {
          onResultRef.current("hit");
        } else if (transcript.includes("miss") || transcript.includes("brick") || transcript.includes("nope")) {
          onResultRef.current("miss");
        }
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" is normal when user is quiet, don't treat as error
      if (event.error !== "no-speech") {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (shouldRestartRef.current) {
        try {
          recognition.start();
        } catch {
          // May fail if already started, ignore
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRef.current = true;
    setError(null);
    setIsListening(true);
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { isListening, lastHeard, error, startListening, stopListening };
}
