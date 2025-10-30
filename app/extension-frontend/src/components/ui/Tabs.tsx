import React, { useState } from 'react';
import './Tabs.css';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
}

export const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  return (
    <div className="tabs-container">
      <div className="tabs-nav">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            className={`tab-button ${index === activeTabIndex ? 'active' : ''}`}
            onClick={() => setActiveTabIndex(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs[activeTabIndex].content}
      </div>
    </div>
  );
};