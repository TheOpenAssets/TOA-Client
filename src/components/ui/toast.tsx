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
          iconColor: 'text-[#10B981]',
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: 'text-[#EF4444]',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconColor: 'text-amber-500',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-[#0071C5]',
        };
    }
  };

  const style = getToastStyle();
  const Icon = style.icon;

  return (
    <div
      className="bg-white rounded-xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 animate-slide-in-right mb-3 min-w-[320px] max-w-md pointer-events-auto"
    >
      <div className="flex items-start gap-3.5">
        <div className={`mt-0.5 flex-shrink-0 ${style.iconColor}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-gellix text-sm font-semibold text-[#111111] mb-1 leading-tight">
            {toast.title}
          </h4>
          {toast.message && (
            <div className="font-gellix text-sm text-gray-500 whitespace-pre-line break-words overflow-wrap-anywhere max-w-full leading-relaxed">
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
                        className="text-[#0071C5] hover:text-blue-700 underline break-all transition-colors"
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
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-md hover:bg-gray-50 -mr-1 -mt-1"
        >
          <X className="w-4 h-4" />
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
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};
