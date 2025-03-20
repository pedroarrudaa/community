import React from 'react';
import './input.css';

export const Input = ({
  className = '',
  ...props
}) => (
  <input
    className={`ui-input ${className}`}
    {...props}
  />
);

export default Input; 