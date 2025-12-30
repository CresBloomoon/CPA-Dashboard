import { useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'キャンセル',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escキーで閉じる（明示的なハンドラ）
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={true} onClose={onCancel} className="relative z-[60]">
          <motion.div
            className="fixed inset-0 bg-black/50"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_THEME.DURATIONS_S.FADE }}
            onClick={onCancel}
          />

          <div className="fixed inset-0 flex items-center justify-center p-4" onClick={onCancel}>
            <Dialog.Panel
              as={motion.div}
              className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={ANIMATION_THEME.SPRINGS.MODAL}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Dialog.Title className="text-lg font-semibold text-gray-800">
                {title}
              </Dialog.Title>
              <div className="mt-2 text-sm text-gray-600">{message}</div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    destructive
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {confirmText}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}




