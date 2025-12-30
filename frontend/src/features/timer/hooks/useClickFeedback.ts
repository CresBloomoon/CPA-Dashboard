import { useState, useCallback, type KeyboardEvent, type PointerEvent } from 'react';
import { UI_VISUALS } from '../../../config/appConfig';

/**
 * ボタンクリック時のフィードバック状態を管理する共通フック。
 * タイマーサークル、科目選択ボタン、記録ボタンなどで統一された押下感を提供。
 * 
 * @param onActivate - クリック時に実行するコールバック関数
 * @param disabled - ボタンが無効かどうか
 * @returns クリックフィードバック用の状態とイベントハンドラー
 */
export function useClickFeedback<T extends HTMLElement = HTMLElement>(
  onActivate: () => void,
  disabled: boolean = false
) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = useCallback(
    (e?: PointerEvent<T>) => {
      if (disabled) return;
      // preventDefaultは不要（クリックイベントを妨害する可能性があるため）
      setIsPressed(true);
    },
    [disabled]
  );

  const handlePointerUp = useCallback(
    (e?: PointerEvent<T>) => {
      if (disabled) return;
      // preventDefaultは不要（クリックイベントを妨害する可能性があるため）
      // 「押し込みが戻った」タイミングで処理を実行（押下の凹み復帰と同期）
      setIsPressed(false);
      onActivate();
    },
    [disabled, onActivate]
  );

  const handlePointerLeave = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<T>) => {
      if (disabled) return;
      if (e.repeat) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsPressed(true);
      }
    },
    [disabled]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent<T>) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // 「押し込みが戻った」タイミングで処理を実行（遅延感を減らす）
        setIsPressed(false);
        onActivate();
      }
    },
    [disabled, onActivate]
  );

  const handleBlur = useCallback(() => {
    if (disabled) return;
    setIsPressed(false);
  }, [disabled]);

  /**
   * 押下時に適用するスタイルクラス
   */
  const activeClass = isPressed ? UI_VISUALS.BUTTON_CLICK_FEEDBACK.ACTIVE_CLASS : '';

  return {
    isPressed,
    activeClass,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    handleKeyDown,
    handleKeyUp,
    handleBlur,
  };
}

