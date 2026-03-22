'use client';

import { useState, useCallback } from 'react';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export default function PinPad({ onSubmit, disabled, error }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handleDigit = useCallback((d: string) => {
    setPin(prev => (prev.length < 8 ? prev + d : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (pin.length > 0) {
      onSubmit(pin);
      setPin('');
    }
  }, [pin, onSubmit]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots display */}
      <div className="h-10 flex items-center justify-center gap-2">
        {pin.length === 0 ? (
          <p className="text-rp-grey text-sm">Enter PIN</p>
        ) : (
          Array.from({ length: pin.length }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-rp-red" />
          ))
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm font-medium">{error}</p>
      )}

      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(d)}
            className="w-16 h-16 rounded-full bg-rp-card border border-rp-border text-xl font-semibold text-white hover:bg-rp-border active:bg-rp-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {d}
          </button>
        ))}

        {/* Bottom row: Clear / 0 / Backspace */}
        <button
          type="button"
          disabled={disabled}
          onClick={handleClear}
          className="w-16 h-16 rounded-full flex items-center justify-center text-sm text-rp-grey hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="w-16 h-16 rounded-full bg-rp-card border border-rp-border text-xl font-semibold text-white hover:bg-rp-border active:bg-rp-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handleBackspace}
          className="w-16 h-16 rounded-full flex items-center justify-center text-rp-grey hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
      </div>

      {/* Submit button */}
      <button
        type="button"
        disabled={pin.length === 0 || disabled}
        onClick={handleSubmit}
        className="w-full max-w-[224px] py-3 rounded-full bg-rp-red text-white font-semibold transition-colors hover:bg-rp-red/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? 'Verifying...' : 'Unlock'}
      </button>
    </div>
  );
}
