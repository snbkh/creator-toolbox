import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColors } from "@/hooks/useColors";

export interface ProcessedFile {
  id: string;
  name: string;
  toolId: string;
  toolName: string;
  originalSize: number;
  processedSize: number;
  timestamp: number;
  type: "image" | "pdf" | "text" | "other";
}

interface AppState {
  recentTools: string[];
  favoriteTools: string[];
  processedFiles: ProcessedFile[];
  isDarkMode: boolean;
  geminiKey: string;
  openaiKey: string;
  groqKey: string;
  claudeKey: string;
  removeBgKey: string;
  selectedAiProvider: "local" | "gemini" | "openai" | "groq" | "claude";
  selectedBgProvider: "local" | "removebg";
}

interface AppContextValue extends AppState {
  addRecentTool: (toolId: string) => void;
  toggleFavorite: (toolId: string) => void;
  addProcessedFile: (file: Omit<ProcessedFile, "id" | "timestamp">) => void;
  clearHistory: () => void;
  setDarkMode: (value: boolean) => void;
  setGeminiKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  setGroqKey: (key: string) => void;
  setClaudeKey: (key: string) => void;
  setRemoveBgKey: (key: string) => void;
  setSelectedAiProvider: (provider: "local" | "gemini" | "openai" | "groq" | "claude") => void;
  setSelectedBgProvider: (provider: "local" | "removebg") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "@creator_toolbox_state";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    recentTools: [],
    favoriteTools: [],
    processedFiles: [],
    isDarkMode: true,
    geminiKey: "",
    openaiKey: "",
    groqKey: "",
    claudeKey: "",
    removeBgKey: "",
    selectedAiProvider: "local",
    selectedBgProvider: "local",
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as Partial<AppState>;
          setState((prev) => ({ ...prev, ...parsed }));
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  const persist = useCallback((next: AppState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const addRecentTool = useCallback(
    (toolId: string) => {
      setState((prev) => {
        const filtered = prev.recentTools.filter((id) => id !== toolId);
        const next: AppState = {
          ...prev,
          recentTools: [toolId, ...filtered].slice(0, 10),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const toggleFavorite = useCallback(
    (toolId: string) => {
      setState((prev) => {
        const isFav = prev.favoriteTools.includes(toolId);
        const next: AppState = {
          ...prev,
          favoriteTools: isFav
            ? prev.favoriteTools.filter((id) => id !== toolId)
            : [...prev.favoriteTools, toolId],
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const addProcessedFile = useCallback(
    (file: Omit<ProcessedFile, "id" | "timestamp">) => {
      setState((prev) => {
        const newFile: ProcessedFile = {
          ...file,
          id: generateId(),
          timestamp: Date.now(),
        };
        const next: AppState = {
          ...prev,
          processedFiles: [newFile, ...prev.processedFiles].slice(0, 50),
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearHistory = useCallback(() => {
    setState((prev) => {
      const next: AppState = { ...prev, processedFiles: [], recentTools: [] };
      persist(next);
      return next;
    });
  }, [persist]);

  const setDarkMode = useCallback(
    (value: boolean) => {
      setState((prev) => {
        const next: AppState = { ...prev, isDarkMode: value };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setGeminiKey = useCallback(
    (key: string) => {
      setState((prev) => {
        const next: AppState = { ...prev, geminiKey: key };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setOpenaiKey = useCallback(
    (key: string) => {
      setState((prev) => {
        const next: AppState = { ...prev, openaiKey: key };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setGroqKey = useCallback(
    (key: string) => {
      setState((prev) => {
        const next: AppState = { ...prev, groqKey: key };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setClaudeKey = useCallback(
    (key: string) => {
      setState((prev) => {
        const next: AppState = { ...prev, claudeKey: key };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setRemoveBgKey = useCallback(
    (key: string) => {
      setState((prev) => {
        const next: AppState = { ...prev, removeBgKey: key };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setSelectedAiProvider = useCallback(
    (provider: "local" | "gemini" | "openai" | "groq" | "claude") => {
      setState((prev) => {
        const next: AppState = { ...prev, selectedAiProvider: provider };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setSelectedBgProvider = useCallback(
    (provider: "local" | "removebg") => {
      setState((prev) => {
        const next: AppState = { ...prev, selectedBgProvider: provider };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        addRecentTool,
        toggleFavorite,
        addProcessedFile,
        clearHistory,
        setDarkMode,
        setGeminiKey,
        setOpenaiKey,
        setGroqKey,
        setClaudeKey,
        setRemoveBgKey,
        setSelectedAiProvider,
        setSelectedBgProvider,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/**
 * useAppColors - use in components inside AppProvider.
 * Respects the user's explicit isDarkMode setting from Settings.
 */
export function useAppColors() {
  const { isDarkMode } = useApp();
  return useColors(isDarkMode);
}
