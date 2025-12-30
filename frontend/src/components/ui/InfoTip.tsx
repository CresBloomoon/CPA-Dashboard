import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Info } from 'lucide-react';

type InfoTipProps = {
  content: string;
};

export function InfoTip({ content }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <motion.button
        type="button"
        aria-label="ヒント"
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex items-center justify-center text-slate-400 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded-md"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Info className="w-4 h-4" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[280px] -translate-x-1/2 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/20 shadow-xl px-3 py-2 text-xs leading-relaxed text-slate-100"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className="whitespace-pre-wrap">{content}</div>
            <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border border-white/20 bg-slate-900/40" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export default InfoTip;


