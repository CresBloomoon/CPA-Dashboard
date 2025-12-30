import { useEffect, useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';
import { encouragementMessages } from './encouragementMessages';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
};

export function ReportWelcomeModal({ isOpen, onClose, onStart }: Props) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [pickedIdx, setPickedIdx] = useState<number>(0);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const next = Math.floor(Math.random() * encouragementMessages.length);
    setPickedIdx(next);
    setIsLaunching(false);
  }, [isOpen]);

  const picked = encouragementMessages[pickedIdx] ?? encouragementMessages[0];
  const titleText = (picked.title || '').trim();

  const handleStart = () => {
    if (isLaunching) return;
    setIsLaunching(true);
    // 二重クリック防止だけ残し、紙吹雪演出は撤去
    onStart();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      {/* backdrop（静止・単色） */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        style={{ backgroundColor: theme === 'modern' ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.55)' }}
      />

      {/* center card（静止） */}
      <div
        className="relative w-[80vw] max-w-none rounded-[2rem] shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme === 'modern' ? 'rgba(17, 24, 39, 0.92)' : colors.card,
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="px-12 py-16 text-center">
              <div
                className="mx-auto mb-10 w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255, 184, 0, 0.12)',
                  border: '1px solid rgba(255, 184, 0, 0.35)',
                }}
              >
                <PartyPopper size={44} style={{ color: '#FFB800' }} />
              </div>

              <h3 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                {titleText}
              </h3>
              <p
                className="text-lg md:text-xl mt-8 leading-9 md:leading-10"
                style={{
                  color: colors.textSecondary,
                  whiteSpace: 'pre-wrap',
                  lineBreak: 'strict',
                  wordBreak: 'break-word',
                }}
              >
                {picked.body}
              </p>

              <div className="mt-12 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isLaunching}
                  className="w-full max-w-2xl px-12 py-7 rounded-[2rem] font-extrabold text-2xl shadow-[0_22px_70px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-4 disabled:opacity-80 disabled:cursor-not-allowed"
                  style={{
                    color: '#111827',
                    backgroundColor: '#FFB800',
                    boxShadow: '0 26px 80px rgba(0,0,0,0.55)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.9)')}
                  onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                >
                  財務報告を作成する！
                </button>
              </div>
            </div>
      </div>
    </div>
  );
}


