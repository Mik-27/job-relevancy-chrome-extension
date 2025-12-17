import React from 'react';
import './TagSelector.css'; // Import the new CSS

interface TagSelectorProps {
  label: string;
  options: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ label, options, selectedTags, onChange }) => {
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="tag-selector-container">
      <label className="tag-label">{label}</label>
      <div className="tags-wrapper">
        {options.map(tag => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`tag-btn ${isSelected ? 'selected' : ''}`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};