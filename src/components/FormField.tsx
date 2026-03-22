'use client';

import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  className?: string;
  disabled?: boolean;
}

/**
 * FormField — labeled input with inline validation error.
 *
 * Usage:
 *   <FormField
 *     label="Email"
 *     name="email"
 *     type="email"
 *     registration={form.register('email')}
 *     error={form.formState.errors.email}
 *   />
 */
export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  registration,
  error,
  className,
  disabled,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={name}
        className="text-sm font-medium text-zinc-300"
      >
        {label}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'rounded-lg border bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
            : 'border-zinc-700'
        )}
        {...registration}
      />
      {error && (
        <p className="text-xs text-red-400">{error.message}</p>
      )}
    </div>
  );
}
