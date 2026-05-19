import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
}

interface AppContextValue extends AppState {
  addRecentTool: (toolId: string) => void;
  toggleFavorite: (toolId: string) => void;
  addProcessedFile: (file: Omit<ProcessedFile, "id" | "timestamp">) => void;
  clearHistory: () => void;
  setDarkMode: (value: boolean) => void;
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

  return (
    <AppContext.Provider
      value={{
        ...state,
        addRecentTool,
        toggleFavorite,
        addProcessedFile,
        clearHistory,
        setDarkMode,
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
