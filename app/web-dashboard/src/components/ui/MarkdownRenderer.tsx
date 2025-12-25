import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          // Paragraphs
          p: ({ node, ...props }) => (
            <p className="mb-2 last:mb-0 leading-relaxed text-sm" {...props} />
          ),
          
          // Bold Text (**text**)
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white" {...props} />
          ),
          
          // Italic Text (*text*)
          em: ({ node, ...props }) => (
            <em className="italic text-gray-300" {...props} />
          ),

          // Unordered Lists (- item)
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2 ml-1" {...props} />
          ),

          // Ordered Lists (1. item)
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 ml-1" {...props} />
          ),

          // List Items
          li: ({ node, ...props }) => (
            <li className="text-sm text-gray-300" {...props} />
          ),

          // Headers (### Title)
          h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-bold text-white mt-3 mb-1" {...props} />,

          // Links
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-400 hover:underline" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Code Blocks
          code: ({ node, ...props }) => (
            <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-green-300" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};