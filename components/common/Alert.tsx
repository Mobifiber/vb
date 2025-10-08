
import React from 'react';

interface AlertProps {
  variant: 'warning' | 'error';
  title: string;
  children: React.ReactNode;
}

const ICONS = {
  warning: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  warning: {
    container: 'bg-yellow-50 border-yellow-400',
    icon: 'text-yellow-500',
    title: 'text-yellow-800',
    message: 'text-yellow-700',
  },
  error: {
    container: 'bg-red-50 border-red-400',
    icon: 'text-red-500',
    title: 'text-red-800',
    message: 'text-red-700',
  },
};

const Alert: React.FC<AlertProps> = ({ variant, title, children }) => {
  const styles = STYLES[variant];
  const icon = ICONS[variant];

  return (
    <div className={`border-l-4 p-4 ${styles.container}`} role="alert">
      <div className="flex">
        <div className={`py-1 ${styles.icon}`}>{icon}</div>
        <div className="ml-3">
          <p className={`font-bold ${styles.title}`}>{title}</p>
          <div className={`text-sm ${styles.message}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alert;
