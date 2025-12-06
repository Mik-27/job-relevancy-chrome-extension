import React from 'react';
import { FaTimes, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title: string;
  fileName?: string; // For download attribute
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  fileUrl, 
  title,
  fileName = "document"
}) => {
  if (!isOpen || !fileUrl) return null;

  const renderContent = (url: string) => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isPdf = cleanUrl.endsWith('.pdf');

    if (isPdf) {
      return (
        <iframe 
          src={url} 
          className="w-full h-full border-0 bg-[#1e1e1e]" 
          title="Document Preview"
        />
      );
    } else {
      // Google Docs Viewer for Word/Docs
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe 
          src={googleViewerUrl} 
          className="w-full h-full border-0 bg-[#1e1e1e]" 
          title="Document Preview"
        />
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <h3 className="text-lg font-semibold text-foreground truncate pr-4">{title}</h3>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <a 
              href={fileUrl} 
              download={fileName}
              className="p-2 text-muted hover:text-white hover:bg-secondary rounded-lg transition"
              title="Download"
            >
              <FaDownload />
            </a>
             <a 
              href={fileUrl} 
              target="_blank"
              rel="noreferrer"
              className="p-2 text-muted hover:text-white hover:bg-secondary rounded-lg transition"
              title="Open in New Tab"
            >
              <FaExternalLinkAlt />
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-muted hover:text-white hover:bg-error/20 hover:text-error rounded-lg transition ml-2"
              title="Close"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#1e1e1e] relative">
           {renderContent(fileUrl)}
        </div>
      </div>
    </div>
  );
};