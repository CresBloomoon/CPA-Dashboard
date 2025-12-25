import { type KeyboardEvent, type ChangeEvent } from 'react';

interface SearchBarProps {
  searchTags: string[];
  searchInput: string;
  setSearchInput: (value: string) => void;
  onSearchInputKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRemoveSearchTag: (tag: string) => void;
  onAddClick: () => void;
}

export default function SearchBar({
  searchTags,
  searchInput,
  setSearchInput,
  onSearchInputKeyDown,
  onRemoveSearchTag,
  onAddClick,
}: SearchBarProps) {
  return (
    <>
      <div className="flex items-center justify-end gap-4 p-6 pb-4 flex-shrink-0">
        {/* 検索バー */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[42px] w-80">
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
        </div>
        
        {/* 追加ボタン（＋のみ） */}
        <button
          onClick={onAddClick}
          className="w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          title="リマインダを追加"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
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

