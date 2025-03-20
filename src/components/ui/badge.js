import React from 'react';
import './badge.css';

export const Badge = ({ 
  children, 
  variant = 'default', 
  className = '',
  ...props 
}) => (
  <span 
    className={`ui-badge ui-badge--${variant} ${className}`} 
    {...props}
  >
    {children}
  </span>
);

export default Badge; 