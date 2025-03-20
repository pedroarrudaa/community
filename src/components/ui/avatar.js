import React from 'react';
import './avatar.css';

export const Avatar = ({ 
  children,
  className = '', 
  ...props 
}) => (
  <div 
    className={`ui-avatar ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export const AvatarImage = ({ 
  src,
  alt = '',
  className = '', 
  ...props 
}) => (
  <img 
    src={src}
    alt={alt}
    className={`ui-avatar-image ${className}`} 
    {...props}
  />
);

export const AvatarFallback = ({ 
  children,
  className = '', 
  ...props 
}) => (
  <div 
    className={`ui-avatar-fallback ${className}`} 
    {...props}
  >
    {children}
  </div>
);

export default {
  Avatar,
  AvatarImage,
  AvatarFallback
}; 