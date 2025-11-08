import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ChatType = 'general' | 'insights';

interface AIContextType {
  isAIOpen: boolean;
  setIsAIOpen: (open: boolean) => void;
  toggleAI: () => void;
  chatType: ChatType;
  setChatType: (type: ChatType) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: ReactNode }) {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [chatType, setChatType] = useState<ChatType>('insights');

  const toggleAI = () => setIsAIOpen(prev => !prev);

  return (
    <AIContext.Provider value={{ 
      isAIOpen, 
      setIsAIOpen, 
      toggleAI,
      chatType,
      setChatType,
    }}>
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
