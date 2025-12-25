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
            <p className="mb-3 last:mb-0 leading-relaxed text-sm text-gray-200" {...props} />
          ),
          
          // Bold Text (**text**)
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white" {...props} />
          ),
          
          // Italic Text (*text*)
          em: ({ node, ...props }) => (
            <em className="italic text-gray-400" {...props} />
          ),

          // Unordered Lists (- item)
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-3 ml-1 text-gray-300" {...props} />
          ),

          // Ordered Lists (1. item)
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-3 ml-1 text-gray-300" {...props} />
          ),

          // List Items
          li: ({ node, ...props }) => (
            <li className="text-sm leading-relaxed" {...props} />
          ),

          // Headers
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-white mt-5 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-blue-400 mt-4 mb-2" {...props} />,

          // Links
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),
          
          // Block Quote (> text)
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-400" {...props} />
          ),

          // --- CODE BLOCKS VS INLINE CODE ---
          
          // Pre tag handles the container for code blocks
          pre: ({ node, ...props }) => (
            <div className="my-4 rounded-lg overflow-hidden border border-gray-700 bg-[#1e1e1e] shadow-sm">
               <div className="overflow-x-auto p-4">
                 <pre {...props} className="font-mono text-sm leading-relaxed text-gray-100" />
               </div>
            </div>
          ),

          // Code tag handles the text itself
          code: ({ node, className, children, ...props }) => {
            // Check if this is an inline code snippet or inside a block
            // React-markdown passes `inline` prop, but we can also infer from context
            const isInline = !String(children).includes('\n') && !className;

            if (isInline) {
               return (
                 <code className="bg-white/10 text-blue-200 rounded px-1.5 py-0.5 text-xs font-mono border border-white/5" {...props}>
                   {children}
                 </code>
               );
            }

            // If it's a block (multiline), just return the text as is, 
            // the <pre> wrapper above handles the box styling.
            return (
              <code className={`${className || ''} font-mono`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};