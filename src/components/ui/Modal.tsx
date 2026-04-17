import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'md:max-w-md',
  md: 'md:max-w-lg',
  lg: 'md:max-w-2xl',
  xl: 'md:max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Na mobilnom: full-screen sa safe-area; Na desktopu: centriran dialog */}
      <div
        className={`relative bg-surface shadow-xl w-full flex flex-col
          h-full md:h-auto md:max-h-[90vh] md:rounded-xl md:mx-4 md:my-4
          ${sizeClasses[size]} safe-top safe-bottom`}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Zatvori"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-4 md:px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
