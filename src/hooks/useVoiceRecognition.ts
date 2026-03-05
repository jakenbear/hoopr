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

// Errors that are transient and should trigger a quiet retry, not a visible error
const TRANSIENT_ERRORS = new Set(["no-speech", "not-allowed", "aborted", "network"]);

export function useVoiceRecognition(
  onResult: (word: "hit" | "miss" | "mark" | "done") => void
): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        // Check done/mark first so they don't accidentally match other words
        if (transcript.includes("done") || transcript.includes("finish") || transcript.includes("end session")) {
          onResultRef.current("done");
        } else if (transcript.includes("mark") || transcript.includes("spot") || transcript.includes("here")) {
          onResultRef.current("mark");
        } else if (
          transcript.includes("hit") ||
          transcript.includes("swish") ||
          transcript.includes("bucket") ||
          transcript.includes("made") ||
          transcript.includes("make") ||
          transcript.includes("good") ||
          transcript.includes("got it") ||
          transcript.includes("yes") ||
          transcript.includes("in")
        ) {
          onResultRef.current("hit");
        } else if (
          transcript.includes("miss") ||
          transcript.includes("brick") ||
          transcript.includes("nope") ||
          transcript.includes("no") ||
          transcript.includes("off") ||
          transcript.includes("short") ||
          transcript.includes("long")
        ) {
          onResultRef.current("miss");
        }
      }
    };

    recognition.onerror = (event) => {
      if (!TRANSIENT_ERRORS.has(event.error)) {
        setError(`Speech error: ${event.error}`);
      }
      // Transient errors (like not-allowed during TTS) are silently ignored
      // — the onend handler will retry with a delay
    };

    recognition.onend = () => {
      // Auto-restart if we're supposed to be listening
      if (shouldRestartRef.current) {
        // Delay restart to avoid rapid retry loops and to let speech synthesis finish
        restartTimeoutRef.current = setTimeout(() => {
          if (!shouldRestartRef.current) return;
          try {
            recognition.start();
          } catch {
            // May fail if already started or page is hidden, retry again
            restartTimeoutRef.current = setTimeout(() => {
              if (!shouldRestartRef.current) return;
              try { recognition.start(); } catch { /* give up this cycle */ }
            }, 2000);
          }
        }, 500);
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
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
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
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  return { isListening, lastHeard, error, startListening, stopListening };
}
