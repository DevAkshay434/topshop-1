import React, { createContext, useContext, useState, ReactNode } from 'react';
import { findToneById } from '@/lib/data/copywritingStyles';

interface ContentStyleContextType {
  selectedToneId: string;
  displayName: string;
  setContentStyle: (toneId: string, displayName: string) => void;
}

const defaultContextValue: ContentStyleContextType = {
  selectedToneId: '',
  displayName: '',
  setContentStyle: () => {},
};

export const ContentStyleContext = createContext<ContentStyleContextType>(defaultContextValue);

export const useContentStyle = () => useContext(ContentStyleContext);

interface ContentStyleProviderProps {
  children: ReactNode;
  initialToneId?: string;
}

export const ContentStyleProvider: React.FC<ContentStyleProviderProps> = ({ 
  children,
  initialToneId = ''
}) => {
  const [selectedToneId, setSelectedToneId] = useState<string>(initialToneId);
  const [displayName, setDisplayName] = useState<string>(() => {
    if (initialToneId) {
      const tone = findToneById(initialToneId);
      return tone ? tone.displayName : '';
    }
    return '';
  });

  const setContentStyle = (toneId: string, name: string) => {
    setSelectedToneId(toneId);
    setDisplayName(name);
  };

  return (
    <ContentStyleContext.Provider
      value={{
        selectedToneId,
        displayName,
        setContentStyle,
      }}
    >
      {children}
    </ContentStyleContext.Provider>
  );
};