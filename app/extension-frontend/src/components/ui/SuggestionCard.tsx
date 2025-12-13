import React, { useState } from 'react';
import { FaCopy, FaCheck, FaArrowRight, FaLightbulb, FaMapMarkerAlt } from 'react-icons/fa';
import { SuggestionItem } from '../../types';
import './SuggestionCard.css';

interface SuggestionCardProps {
  item: SuggestionItem;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ item }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.suggested_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="sc-card">
      
      {/* --- HEADER --- */}
      <div className="sc-header">
        {/* Type Badge */}
        {item.type && (
          <div className="sc-type-badge">
            {item.type}
          </div>
        )}

        {/* Right: Location Badge */}
        {item.location && (
          <div className="sc-location-badge">
            <FaMapMarkerAlt size={10} />
            {item.location}
          </div>
        )}
      </div>

      {/* --- BODY --- */}
      <div className="sc-body">
        
        {/* Original Text (If applicable) */}
        {item.original_text && item.original_text !== "N/A" && (
          <div className="sc-section">
            <span className="sc-label">Original</span>
            <div className="sc-original-box">
              {item.original_text}
            </div>
            
            {/* Arrow Indicator */}
            <div className="sc-arrow-wrapper">
              <FaArrowRight size={10} />
            </div>
          </div>
        )}

        {/* Suggested Text */}
        <div>
           <div className="sc-improved-header">
             <span className="sc-label highlight">
               Improved Version
             </span>
             <button
                onClick={handleCopy}
                className="sc-copy-btn"
                title="Copy to clipboard"
             >
               {copied ? <><FaCheck size={10} /> Copied</> : <><FaCopy size={10} /> Copy</>}
             </button>
           </div>

           <div className="sc-improved-box">
             {item.suggested_text}
           </div>
        </div>
        
        {/* Reasoning */}
        <div className="sc-reason-wrapper">
          <FaLightbulb className="sc-icon-lightbulb" />
          <span className="sc-reason-text">
            {item.reasoning}
          </span>
        </div>

      </div>
    </div>
  );
};