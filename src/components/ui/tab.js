import React, { useState } from 'react';
import './tab.css';

export const Tabs = ({ 
  children, 
  defaultValue,
  className = '', 
  ...props 
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  // Clone TabsList and TabContent with the activeTab state
  const clonedChildren = React.Children.map(children, child => {
    if (child.type === TabsList) {
      return React.cloneElement(child, {
        activeTab,
        setActiveTab
      });
    }
    if (React.isValidElement(child) && child.type === TabContent) {
      return React.cloneElement(child, {
        activeTab
      });
    }
    return child;
  });

  return (
    <div className={`ui-tabs ${className}`} {...props}>
      {clonedChildren}
    </div>
  );
};

export const TabsList = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  className = '', 
  ...props 
}) => {
  // Clone TabsTrigger with activeTab state
  const clonedChildren = React.Children.map(children, child => {
    if (child.type === TabsTrigger) {
      return React.cloneElement(child, {
        activeTab,
        setActiveTab
      });
    }
    return child;
  });

  return (
    <div className={`ui-tabs-list ${className}`} {...props}>
      {clonedChildren}
    </div>
  );
};

export const TabsTrigger = ({ 
  children, 
  value, 
  activeTab, 
  setActiveTab, 
  className = '', 
  ...props 
}) => {
  const isActive = activeTab === value;
  
  return (
    <button 
      className={`ui-tabs-trigger ${isActive ? 'ui-tabs-trigger--active' : ''} ${className}`}
      onClick={() => setActiveTab(value)}
      {...props}
    >
      {children}
    </button>
  );
};

export const TabContent = ({ 
  children, 
  value, 
  activeTab,
  className = '', 
  ...props 
}) => {
  if (value !== activeTab) return null;
  
  return (
    <div className={`ui-tabs-content ${className}`} {...props}>
      {children}
    </div>
  );
};

export default {
  Tabs,
  TabsList,
  TabsTrigger,
  TabContent
}; 