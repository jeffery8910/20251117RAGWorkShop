"use client";
import React from 'react';

interface InputProps {
  label?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  rows?: number;
  min?: string | number;
  max?: string | number;
}

export default function Input({
  label,
  type = 'text',
  value = '',
  onChange,
  placeholder,
  error,
  hint,
  icon,
  className = '',
  disabled = false,
  rows,
  min,
  max
}: InputProps) {
  const baseClasses = 'w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';
  const errorClasses = error ? 'border-red-500 focus:ring-red-500' : '';
  
  const inputClasses = `${baseClasses} ${errorClasses} ${className} ${rows ? 'resize-none' : ''}`;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
          {icon && <span className="ml-2">{icon}</span>}
        </label>
      )}
      
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          className={inputClasses}
        />
      )}
      
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}
