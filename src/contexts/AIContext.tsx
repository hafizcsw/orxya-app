import { createContext, useContext, useState, ReactNode } from 'react';

interface AIContextType {
  isAIOpen: boolean;
  setIsAIOpen: (open: boolean) => void;
  toggleAI: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isAIOpen, setIsAIOpen] = useState(false);

  const toggleAI = () => setIsAIOpen(prev => !prev);

  return (
    <AIContext.Provider value={{ isAIOpen, setIsAIOpen, toggleAI }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
