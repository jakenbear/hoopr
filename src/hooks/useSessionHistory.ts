import { useState, useCallback, useEffect } from "react";
import type { Session } from "../types";

const STORAGE_KEY = "hoopr_sessions";

interface UseSessionHistoryReturn {
  history: Session[];
  saveSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  clearHistory: () => void;
}

export function useSessionHistory(): UseSessionHistoryReturn {
  const [history, setHistory] = useState<Session[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch { /* storage full or unavailable */ }
  }, [history]);

  const saveSession = useCallback((session: Session) => {
    setHistory((prev) => [session, ...prev]);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setHistory((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, saveSession, deleteSession, clearHistory };
}
