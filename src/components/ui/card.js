import React from 'react';
import './card.css';

export const Card = ({ children, className = '', ...props }) => (
  <div className={`ui-card ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`ui-card-header ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`ui-card-content ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`ui-card-footer ${className}`} {...props}>
    {children}
  </div>
);

export default {
  Card,
  CardHeader,
  CardContent,
  CardFooter
}; 