import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { Spinner } from '@/components/ui/Spinner/Spinner'; // Assuming you have this from previous steps

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isLoading?: boolean;
  isDanger?: boolean; // If true, button is red. If false, blue.
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  isLoading = false,
  isDanger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {isDanger && <FaExclamationTriangle className="text-warning" />}
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="text-muted hover:text-white transition"
          >
            <FaTimes />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-muted text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-secondary/10 border-t border-border flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-secondary border border-transparent transition-colors"
          >
            Cancel
          </button>
          
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all flex items-center gap-2
              ${isDanger 
                ? 'bg-red-600 hover:bg-red-700 border border-red-500' 
                : 'bg-primary hover:bg-blue-600 border border-blue-500'
              }
              ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {isLoading && <Spinner size="small" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};