import React, { createContext, useContext, useState } from 'react';

// Create a context to manage dialog state
interface DialogContextType {
  // Current active dialog (only one can be open at a time)
  activeDialog: string | null;
  
  // Open a dialog (closes any existing open dialog)
  openDialog: (dialogId: string) => void;
  
  // Close the active dialog
  closeDialog: () => void;
  
  // Check if a specific dialog is currently open
  isDialogOpen: (dialogId: string) => boolean;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  
  const openDialog = (dialogId: string) => {
    setActiveDialog(dialogId);
  };
  
  const closeDialog = () => {
    setActiveDialog(null);
  };
  
  const isDialogOpen = (dialogId: string) => {
    return activeDialog === dialogId;
  };
  
  return (
    <DialogContext.Provider value={{ activeDialog, openDialog, closeDialog, isDialogOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

// Hook to use the dialog context
export const useDialog = () => {
  const context = useContext(DialogContext);
  
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  
  return context;
};