import React from 'react';
import './skeleton.css';

export const Skeleton = ({ 
  className = '', 
  ...props 
}) => (
  <div 
    className={`ui-skeleton ${className}`} 
    {...props}
  />
);

export default Skeleton; 