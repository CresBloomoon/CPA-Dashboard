import { type KeyboardEvent, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../../config/appConfig';

interface SearchBarProps {
  searchTags: string[];
  searchInput: string;
  setSearchInput: (value: string) => void;
  onSearchInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveSearchTag: (tag: string) => void;
}

export default function SearchBar({
  searchTags,
  searchInput,
  setSearchInput,
  onSearchInputKeyDown,
  onRemoveSearchTag,
}: SearchBarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // フォーカスが子要素にあるかを監視して、motion用の状態に反映
  useEffect(() => {
    const handler = () => {
      const el = containerRef.current;
      if (!el) return;
      const active = document.activeElement;
      setIsFocused(!!(active && el.contains(active)));
    };
    window.addEventListener('focusin', handler);
    window.addEventListener('focusout', handler);
    return () => {
      window.removeEventListener('focusin', handler);
      window.removeEventListener('focusout', handler);
    };
  }, []);

  return (
    <>
      <div className="flex items-center justify-end gap-4 pl-6 pr-0 pb-4 flex-shrink-0">
        {/* 検索バー */}
        <motion.div
          ref={containerRef}
          className="flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white min-h-[42px] w-80"
          animate={{
            boxShadow: isFocused ? 'inset 0 0 0 2px #3b82f6' : 'inset 0 0 0 0px rgba(0,0,0,0)',
            borderColor: isFocused ? 'transparent' : '#d1d5db',
          }}
          transition={ANIMATION_THEME.SPRINGS.UI}
        >
          <div className="flex items-center text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* 検索タグ */}
          {searchTags.map((tag: string, index: number) => (
            <div
              key={index}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveSearchTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          
          {/* 検索入力 */}
          <input
            type="text"
            value={searchInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
            onKeyDown={onSearchInputKeyDown}
            placeholder={searchTags.length === 0 ? "検索..." : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent"
          />
        </motion.div>
      </div>

      {/* 検索タグの説明 */}
      {searchTags.length > 0 && (
        <div className="px-6 pb-2 flex-shrink-0">
          <p className="text-xs text-gray-500">スペースまたはEnterでキーワードを追加</p>
        </div>
      )}
    </>
  );
}

