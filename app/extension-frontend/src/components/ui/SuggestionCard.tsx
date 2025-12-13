import React, { useState } from 'react';
import { FaCopy, FaCheck, FaLightbulb, FaMapMarkerAlt } from 'react-icons/fa';
import { SuggestionItem } from '../../types';
import './SuggestionCard.css';

interface SuggestionCardProps {
  item: SuggestionItem;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ item }) => {
  const [copied, setCopied] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.suggested_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReasoning = () => {
    setReasoningExpanded(!reasoningExpanded);
  };

  return (
    <div className="sc-card">
      
      {/* --- HEADER --- */}
      <div className="sc-header">
        {/* Type Badge */}
        {item.type && (
          <div className="sc-type-badge">
            {item.type.toUpperCase()}
          </div>
        )}

        {/* Right: Location Badge */}
        {item.location && (
          <div className="sc-location-badge">
            <FaMapMarkerAlt size={10} />
            {item.location.length > 30 ? item.location.slice(0, 27) + "..." : item.location}
          </div>
        )}
      </div>

      {/* --- BODY --- */}
      <div className="sc-body">
        
        {/* Original Text (If applicable) */}
        {item.original_text && item.original_text !== "N/A" && (
          <div className="sc-section">
            {item.type === "rewrite"? (<span className="sc-label">Original</span>) : item.type === "addition" ? (<span className="sc-label">Add</span>) : item.type === "removal" ? (<span className="sc-label">Remove</span>) : null}
            <div className="sc-original-box">
              {item.original_text.length > 125 ? item.original_text.slice(0, 125) + "..." : item.original_text}
            </div>
          </div>
        )}

        {/* Suggested Text */}
        {item.suggested_text && (
          <div className="sc-section">
            <div className="sc-improved-header">
              {/* <span className="sc-label highlight">
                Improved Version
              </span> */}
              {item.type === "rewrite"? (<span className="sc-label highlight">Improved Version</span>) : item.type === "addition" ? (<span className="sc-label highlight">Add</span>) : item.type === "removal" ? (<span className="sc-label highlight">Remove</span>) : null}
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
        )}
        
        {/* Reasoning - Collapsible */}
        <button 
          onClick={handleToggleReasoning}
          className={`sc-reason-button ${reasoningExpanded ? 'expanded' : 'collapsed'}`}
        >
          <div className="sc-reason-header">
            <FaLightbulb className="sc-icon-lightbulb" />
            <span className="sc-reason-label">
              {reasoningExpanded ? 'Why this works' : 'Why this works'}
            </span>
            <span className="sc-expand-icon">
              {reasoningExpanded ? '−' : '+'}
            </span>
          </div>
        
          {reasoningExpanded && (
            <div className="sc-reason-content">
            {item.reasoning}
            </div>
          )}
        </button>
      </div>
    </div>
  );
};