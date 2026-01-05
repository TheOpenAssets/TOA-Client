// src/components/ui/toast.tsx

import { useEffect } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  const getToastStyle = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          gradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          gradient: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          gradient: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          gradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        };
    }
  };

  const style = getToastStyle();
  const Icon = style.icon;

  return (
    <div
      className={`rounded-2xl p-4 shadow-lg border ${style.borderColor} animate-slide-in-right mb-3 min-w-[320px] max-w-md`}
      style={{ background: style.gradient }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${style.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-geist text-base font-normal text-foreground mb-1">
            {toast.title}
          </h4>
          {toast.message && (
            <div className="font-inter text-sm text-foreground/70 whitespace-pre-line break-words overflow-wrap-anywhere max-w-full">
              {toast.message.split('\n').map((line, index) => {
                // Check if line contains a URL
                const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                  const parts = line.split(urlMatch[0]);
                  return (
                    <div key={index} className="break-all">
                      {parts[0]}
                      <a
                        href={urlMatch[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {urlMatch[0]}
                      </a>
                      {parts[1]}
                    </div>
                  );
                }
                return <div key={index}>{line}</div>;
              })}
            </div>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};
