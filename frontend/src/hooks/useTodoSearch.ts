import { useState, useMemo, type KeyboardEvent, type ChangeEvent } from 'react';
import type { Todo } from '../api/types';

/**
 * Todoの検索ロジック
 */
export const useTodoSearch = (todos: Todo[]) => {
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');

  const handleSearchInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const trimmed = searchInput.trim();
      if (trimmed) {
        // スペースで分割して複数のタグを追加
        const newTags = trimmed.split(/\s+/).filter((tag: string) => tag.length > 0 && !searchTags.includes(tag));
        if (newTags.length > 0) {
          setSearchTags([...searchTags, ...newTags]);
        }
        setSearchInput('');
      }
    } else if (e.key === 'Backspace' && searchInput === '' && searchTags.length > 0) {
      // 入力が空でBackspaceを押したら最後のタグを削除
      setSearchTags(searchTags.slice(0, -1));
    }
  };

  const removeSearchTag = (tagToRemove: string) => {
    setSearchTags(searchTags.filter((tag: string) => tag !== tagToRemove));
  };

  const filteredTodos = useMemo(() => {
    return todos.filter((todo: Todo) => {
      if (searchTags.length === 0) return true;
      return searchTags.every((tag: string) => {
        const query = tag.toLowerCase();
        const titleMatch = todo.title.toLowerCase().includes(query);
        const subjectMatch = todo.subject?.toLowerCase().includes(query) || false;
        return titleMatch || subjectMatch;
      });
    });
  }, [todos, searchTags]);

  return {
    searchTags,
    searchInput,
    setSearchInput,
    handleSearchInputKeyDown,
    removeSearchTag,
    filteredTodos,
  };
};

