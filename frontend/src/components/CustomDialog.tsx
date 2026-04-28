import React from 'react';
import X from "lucide-react/dist/esm/icons/x";
import Check from "lucide-react/dist/esm/icons/check";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import Info from "lucide-react/dist/esm/icons/info";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { motion, AnimatePresence } from 'framer-motion';

export interface DialogConfig {
  isOpen: boolean;
  type: 'confirm' | 'alert' | 'loading' | 'input';
  title: string;
  message: string;
  onConfirm?: () => void;
  onConfirmWithValue?: (value: string) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
}

interface CustomDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({ config, onClose }) => {
  const { 
    isOpen, type, title, message, 
    onConfirm, onConfirmWithValue, onCancel, 
    confirmText = "確認", 
    cancelText = "取消",
    placeholder = "請輸入...",
    defaultValue = ""
  } = config;

  const [inputValue, setInputValue] = React.useState(defaultValue);

  // Reset input when dialog opens
  React.useEffect(() => {
    if (isOpen) setInputValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'input') {
      onConfirmWithValue?.(inputValue);
    } else {
      onConfirm?.();
    }
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'confirm': return <AlertTriangle className="text-amber-500" size={32} />;
      case 'alert': return <Info className="text-emerald-500" size={32} />;
      case 'input': return <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Info size={28} /></div>;
      case 'loading': return <div className="animate-spin flex"><Loader2 className="text-emerald-500" size={32} /></div>;
      default: return null;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={type !== 'loading' ? handleCancel : undefined}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center overflow-hidden"
        >
          {/* Subtle top glow */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${type === 'confirm' ? 'bg-amber-500' : 'bg-emerald-500'} opacity-50`} />

          <div className="mb-6 p-4 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-inner">
            {getIcon()}
          </div>

          <h3 className="text-xl font-black text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-6">{message}</p>

          {type === 'input' && (
            <div className="w-full mb-8">
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                className="w-full px-6 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-sm focus:border-emerald-500/50 outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
          )}

          <div className="flex gap-3 w-full">
            {(type === 'confirm' || type === 'input') && (
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black transition-all text-xs"
              >
                {cancelText}
              </button>
            )}
            {type !== 'loading' && (
              <button
                onClick={handleConfirm}
                className={`flex-1 px-6 py-4 rounded-2xl ${type === 'confirm' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-black transition-all text-xs shadow-lg shadow-emerald-500/10`}
              >
                {confirmText}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
