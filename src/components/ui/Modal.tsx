'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  preventScroll?: boolean;
  className?: string;
  backdropClassName?: string;
  headerRight?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  footerClassName?: string;
  ariaLabel?: string;
}

// Global modal counter to safely coordinate body scroll-locking across concurrent modals
let activeModalCount = 0;
let originalBodyOverflow = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (activeModalCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeModalCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = originalBodyOverflow || '';
  }
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]',
};

/**
 * Shared Al Harmain Travels Modal Component
 * 
 * Guarantees:
 * 1. Portaled to document.body (escapes parent stacking contexts and overflow)
 * 2. Strict (0,0) viewport coverage without margin leakage
 * 3. Z-index 70 (strictly above header z-50 and mobile drawers z-60)
 * 4. Full accessibility (Escape key, click outside, focus management, ARIA)
 * 5. Coordinated body scroll-locking
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnEscape = true,
  closeOnClickOutside = true,
  preventScroll = true,
  className = '',
  backdropClassName = '',
  headerRight,
  headerClassName = '',
  bodyClassName = '',
  footer,
  footerClassName = '',
  ariaLabel,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isMouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Coordinate background scroll locking
  useEffect(() => {
    if (!isOpen || !preventScroll) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen, preventScroll]);

  // Focus preservation and initial focus capture
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== 'undefined') {
        previousFocusRef.current = document.activeElement as HTMLElement | null;
      }
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOpen, closeOnEscape, onClose]);

  // Handle backdrop click without misfiring on text selection drag
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      isMouseDownOnBackdrop.current = true;
    } else {
      isMouseDownOnBackdrop.current = false;
    }
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDownOnBackdrop.current && e.target === e.currentTarget && closeOnClickOutside) {
      onClose();
    }
    isMouseDownOnBackdrop.current = false;
  };

  if (!mounted || !isOpen) return null;

  const content = (
    <div
      role="presentation"
      data-modal-overlay="true"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      className={`modal-backdrop modal-overlay fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-70 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/75 backdrop-blur-sm transition-opacity duration-200 animate-fade-in ${backdropClassName}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : ariaLabel || 'Dialog'}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`bg-card border border-base rounded-3xl shadow-2xl w-full ${SIZE_CLASSES[size] || 'max-w-md'} flex flex-col max-h-[92vh] overflow-hidden relative outline-none animate-in fade-in zoom-in-95 duration-200 ${className}`}
      >
        {/* Header (rendered if title, description, close button, or headerRight is present) */}
        {(title || showCloseButton || headerRight) && (
          <div
            className={`p-4 sm:p-5 border-b border-base flex items-center justify-between gap-3 bg-surface/50 shrink-0 ${headerClassName}`}
          >
            <div className="min-w-0 flex-1">
              {title && (
                typeof title === 'string' ? (
                  <h3 className="type-card-title text-base sm:text-lg truncate text-primary font-bold">
                    {title}
                  </h3>
                ) : (
                  title
                )
              )}
              {description && (
                <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-muted hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            className={`p-4 sm:p-5 border-t border-base bg-surface/40 flex items-center justify-end gap-2.5 shrink-0 ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * Universal Portal wrapper for mounting arbitrary overlay elements to document.body
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default Modal;
