import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CustomDialog, DialogConfig } from '../components/CustomDialog';

interface DialogContextType {
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  showLoading: (title: string, message: string) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<DialogConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const showAlert = (title: string, message: string) => {
    setConfig({ isOpen: true, type: 'alert', title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfig({ isOpen: true, type: 'confirm', title, message, onConfirm, onCancel });
  };

  const showLoading = (title: string, message: string) => {
    setConfig({ isOpen: true, type: 'loading', title, message });
  };

  const hideDialog = () => {
    setConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showLoading, hideDialog }}>
      {children}
      <CustomDialog config={config} onClose={hideDialog} />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
