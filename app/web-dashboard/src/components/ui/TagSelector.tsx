import React from 'react';

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
    <div className="mb-4">
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(tag => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                ${isSelected 
                  ? 'bg-primary/20 text-primary border-primary' 
                  : 'bg-card text-muted border-border hover:border-gray-500 hover:text-white'
                }
              `}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
};