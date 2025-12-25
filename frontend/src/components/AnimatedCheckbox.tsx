import React, { useState, useEffect } from 'react';
import type { Todo } from '../types';
import { todoApi } from '../api';

interface AnimatedCheckboxProps {
  todo: Todo;
  subjectColor?: string;
  onUpdate: () => void;
  batchCompletionDelay?: number;
  size?: 'sm' | 'md';
  className?: string;
}

// 複数選択のバッチ処理を管理するためのグローバル状態
const globalCompletingIds = new Set<number>();
let globalBatchTimeout: NodeJS.Timeout | null = null;
const globalUpdateCallbacks = new Set<() => void>();

// 一括完了処理
const processBatchCompletion = async (todoIds: number[], onUpdate: () => void) => {
  if (todoIds.length === 0) return;
  
  try {
    // すべてのIDに対して並列でAPIを呼び出し
    await Promise.all(
      todoIds.map(id => todoApi.update(id, { completed: true }))
    );
    // すべてのコールバックを呼び出し
    globalUpdateCallbacks.forEach(callback => callback());
    globalCompletingIds.clear();
  } catch (error) {
    console.error('Error updating todos:', error);
    globalCompletingIds.clear();
  }
};

export default function AnimatedCheckbox({ 
  todo, 
  subjectColor = '#3b82f6',
  onUpdate,
  batchCompletionDelay = 1500,
  size = 'md',
  className = ''
}: AnimatedCheckboxProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  
  // コールバックを登録
  useEffect(() => {
    globalUpdateCallbacks.add(onUpdate);
    return () => {
      globalUpdateCallbacks.delete(onUpdate);
    };
  }, [onUpdate]);

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // 未完了から完了に変わる場合のみアニメーション
    if (!todo.completed) {
      // 既存のタイマーをクリア
      if (globalBatchTimeout) {
        clearTimeout(globalBatchTimeout);
      }
      
      // 新しいIDを追加
      globalCompletingIds.add(todo.id);
      setIsCompleting(true);
      setShouldAnimate(true); // アニメーションを有効化
      
      // 猶予時間後に一括処理（新しいクリックがあればリセットされる）
      globalBatchTimeout = setTimeout(() => {
        const idsToComplete = Array.from(globalCompletingIds);
        processBatchCompletion(idsToComplete, onUpdate);
        setIsCompleting(false);
        globalBatchTimeout = null;
      }, batchCompletionDelay);
    } else {
      // 完了から未完了に戻す場合は即座にAPIを呼び出し
      try {
        await todoApi.update(todo.id, { completed: false });
        onUpdate();
      } catch (error) {
        console.error('Error updating todo:', error);
      }
    }
  };

  const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const svgSize = size === 'sm' ? 'w-3 h-3' : 'w-3 h-3';
  const isChecked = todo.completed || isCompleting;

  return (
    <div 
      className={`checkbox-wrapper ${isChecked ? 'checked' : ''} ${shouldAnimate ? 'animating' : ''} ${className}`}
      onClick={handleToggle}
    >
      <div
        className={`checkbox-button flex-shrink-0 ${sizeClasses} rounded-full border-2 flex items-center justify-center relative overflow-visible cursor-pointer`}
        style={{
          borderColor: isChecked ? subjectColor : '#d1d5db',
          backgroundColor: isChecked ? subjectColor : 'transparent',
          transition: 'background-color 0.3s ease, border-color 0.3s ease, transform 0.3s ease',
          color: isChecked ? subjectColor : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isChecked) {
            e.currentTarget.style.borderColor = subjectColor;
            e.currentTarget.style.transform = 'scale(1.15)';
          } else {
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          if (!isChecked) {
            e.currentTarget.style.borderColor = '#d1d5db';
          }
        }}
      >
        {/* 波紋効果 */}
        {isChecked && (
          <div 
            className="checkbox-ripple"
            style={{
              background: subjectColor,
            }}
          />
        )}
        {/* チェックマーク */}
        {isChecked && (
          <svg 
            className={`${svgSize} absolute z-10`}
            fill="none" 
            stroke="white" 
            viewBox="0 0 12 9"
            style={{
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <polyline 
              points="1 5 4 8 11 1"
              className="checkbox-checkmark"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

