import React, { useState, useRef, useEffect } from 'react';
import './dropdown.css';

export const Dropdown = ({ children, className = '', ...props }) => {
  return (
    <div className={`ui-dropdown ${className}`} {...props}>
      {children}
    </div>
  );
};

export const DropdownTrigger = ({ children, className = '', ...props }) => {
  return (
    <div className={`ui-dropdown-trigger ${className}`} {...props}>
      {children}
    </div>
  );
};

export const DropdownMenu = ({ 
  children, 
  className = '', 
  isOpen = false,
  onClose,
  ...props 
}) => {
  return (
    isOpen && (
      <div className={`ui-dropdown-menu ${className}`} {...props}>
        {children}
      </div>
    )
  );
};

export const DropdownItem = ({ 
  children, 
  className = '', 
  onClick,
  ...props 
}) => {
  return (
    <div 
      className={`ui-dropdown-item ${className}`} 
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export const DropdownButton = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggle = () => setIsOpen(!isOpen);
  
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const triggerChild = React.Children.toArray(children).find(
    child => child.type === DropdownTrigger
  );
  
  const menuChild = React.Children.toArray(children).find(
    child => child.type === DropdownMenu
  );

  return (
    <div className="ui-dropdown-button" ref={dropdownRef} {...props}>
      <div onClick={toggle}>
        {triggerChild}
      </div>
      {isOpen && React.cloneElement(menuChild, { isOpen, onClose: () => setIsOpen(false) })}
    </div>
  );
};

export default {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownButton
}; 