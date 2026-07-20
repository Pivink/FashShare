import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Custom confirm modal — replaces window.confirm().
 *
 * Props:
 *   open       {boolean}  – whether the modal is visible
 *   title      {string}   – heading text
 *   message    {string}   – body text
 *   confirmLabel {string} – label for the confirm button (default "Confirm")
 *   cancelLabel  {string} – label for the cancel button (default "Cancel")
 *   danger     {boolean}  – if true, confirm button is red (destructive action)
 *   onConfirm  {fn}       – called when user clicks confirm
 *   onCancel   {fn}       – called when user clicks cancel / backdrop / Escape
 */
const ConfirmModal = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl p-7 space-y-5 animate-[fadeInUp_0.18s_ease]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fadeInScale 0.18s ease' }}
      >
        {/* Close X */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${danger ? 'bg-rose-500/15' : 'bg-amber-500/15'}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? 'text-rose-400' : 'text-amber-400'}`} />
          </div>
          <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
        </div>

        {/* Message */}
        {message && (
          <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold border border-white/8 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all shadow-lg transform active:scale-95 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/40'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/40'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
