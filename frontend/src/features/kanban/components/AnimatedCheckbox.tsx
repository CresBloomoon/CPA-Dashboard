import React, { useState, useEffect } from 'react';
import type { Todo } from '../../../api/types';
import { todoApi } from '../../../api/api';
import { TIMER_SETTINGS, UI_VISUALS } from '../../../config/appConfig';
import { useTrophySystemContext } from '../../../contexts/TrophySystemContext';

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
const globalUncompletingIds = new Set<number>(); // チェックを外す処理中のID
let globalBatchTimeout: NodeJS.Timeout | null = null;
const globalUpdateCallbacks = new Set<() => void>();
const globalForceUpdateCallbacks = new Set<() => void>();

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
    // 渡されたonUpdateも呼び出す
    onUpdate();
    globalCompletingIds.clear();
    // 処理完了後も再レンダリング
    globalForceUpdateCallbacks.forEach(callback => callback());
  } catch (error) {
    console.error('Error updating todos:', error);
    globalCompletingIds.clear();
    // エラー時も再レンダリング
    globalForceUpdateCallbacks.forEach(callback => callback());
  }
};

export default function AnimatedCheckbox({ 
  todo, 
  subjectColor = '#3b82f6',
  onUpdate,
  batchCompletionDelay = TIMER_SETTINGS.CHECKBOX.BATCH_COMPLETION_DELAY_MS,
  size = 'md',
  className = ''
}: AnimatedCheckboxProps) {
  const [, forceUpdate] = useState({});
  const { handleTrophyEvent } = useTrophySystemContext();
  
  // コールバックを登録
  useEffect(() => {
    globalUpdateCallbacks.add(onUpdate);
    const updateCallback = () => forceUpdate({});
    globalForceUpdateCallbacks.add(updateCallback);
    return () => {
      globalUpdateCallbacks.delete(onUpdate);
      globalForceUpdateCallbacks.delete(updateCallback);
    };
  }, [onUpdate]);

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // トロフィー：イベント発生を通知（コンボ管理はデータ層で処理）
    // オン/オフ両方のクリックでカウント
    handleTrophyEvent('reminder_mash_10');
    
    // 未完了から完了に変わる場合
    if (!todo.completed) {
      // バッチ処理待ち中（globalCompletingIdsに含まれている）に再度押された場合
      if (globalCompletingIds.has(todo.id)) {
        // バッチ処理から除外
        globalCompletingIds.delete(todo.id);
        
        // タイマーをリセット（他のアイテムがあれば再設定）
        if (globalBatchTimeout) {
          clearTimeout(globalBatchTimeout);
          
          if (globalCompletingIds.size > 0) {
            // まだ他のアイテムがある場合はタイマーを再設定
            globalBatchTimeout = setTimeout(() => {
              const idsToComplete = Array.from(globalCompletingIds);
              processBatchCompletion(idsToComplete, onUpdate);
              globalBatchTimeout = null;
            }, batchCompletionDelay);
          } else {
            globalBatchTimeout = null;
          }
        }
        
        // すべてのコンポーネントを再レンダリング
        globalForceUpdateCallbacks.forEach(callback => callback());
        return;
      }
      
      // 既存のタイマーをクリア
      if (globalBatchTimeout) {
        clearTimeout(globalBatchTimeout);
      }
      
      // 新しいIDを追加
      globalCompletingIds.add(todo.id);
      
      // すべてのコンポーネントを再レンダリング
      globalForceUpdateCallbacks.forEach(callback => callback());
      
      // 猶予時間後に一括処理（新しいクリックがあればリセットされる）
      globalBatchTimeout = setTimeout(() => {
        const idsToComplete = Array.from(globalCompletingIds);
        processBatchCompletion(idsToComplete, onUpdate);
        globalBatchTimeout = null;
      }, batchCompletionDelay);
    } else {
      // 完了から未完了に戻す場合
      // バッチ処理中（複数選択受付中）の場合
      if (globalBatchTimeout) {
        // バッチ処理から除外（含まれている場合のみ）
        if (globalCompletingIds.has(todo.id)) {
          globalCompletingIds.delete(todo.id);
        }
        
        // チェックを外す処理中としてマーク
        globalUncompletingIds.add(todo.id);
        
        // タイマーをリセット（他のアイテムがあれば再設定）
        clearTimeout(globalBatchTimeout);
        
        if (globalCompletingIds.size > 0) {
          // まだ他のアイテムがある場合はタイマーを再設定
          globalBatchTimeout = setTimeout(() => {
            const idsToComplete = Array.from(globalCompletingIds);
            processBatchCompletion(idsToComplete, onUpdate);
            globalBatchTimeout = null;
          }, batchCompletionDelay);
        } else {
          globalBatchTimeout = null;
        }
      } else {
        // バッチ処理中でない場合も、チェックを外す処理中としてマーク
        globalUncompletingIds.add(todo.id);
      }
      
      // 即座に再レンダリングをトリガー
      globalForceUpdateCallbacks.forEach(callback => callback());
      
      // APIを呼び出してチェックを外す
      try {
        await todoApi.update(todo.id, { completed: false });
        globalUncompletingIds.delete(todo.id);
        onUpdate();
        // 再レンダリングをトリガー
        globalForceUpdateCallbacks.forEach(callback => callback());
      } catch (error) {
        console.error('Error updating todo:', error);
        globalUncompletingIds.delete(todo.id);
        globalForceUpdateCallbacks.forEach(callback => callback());
      }
    }
  };

  const checkboxDiameter = `${UI_VISUALS.CHECKBOX.DIAMETER_PX}px`;
  // globalCompletingIdsに含まれているか、または既に完了しているかで判定
  // ただし、globalUncompletingIdsに含まれている場合はチェックを外す
  const isChecked = (todo.completed || globalCompletingIds.has(todo.id)) && !globalUncompletingIds.has(todo.id);

  return (
    <div 
      className={`ui-checkbox-wrapper ${className}`}
      onClick={handleToggle}
    >
      <input
        type="checkbox"
        className="ui-checkbox"
        checked={isChecked}
        onChange={() => {}} // handleToggleで処理するため空
        style={{
          '--primary-color': subjectColor,
          '--secondary-color': '#fff',
          '--primary-hover-color': subjectColor,
          '--checkbox-diameter': checkboxDiameter,
          '--checkbox-border-radius': '50%',
          '--checkbox-border-color': subjectColor,
          '--checkbox-border-width': `${UI_VISUALS.CHECKBOX.BORDER_WIDTH_PX}px`,
          '--checkbox-border-style': 'solid',
        } as React.CSSProperties}
      />
    </div>
  );
}

