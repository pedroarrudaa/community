import React from 'react';
import './button.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false,
  className = '',
  onClick,
  ...props 
}) => {
  const baseClass = 'ui-button';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const stateClass = disabled ? `${baseClass}--disabled` : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${stateClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 