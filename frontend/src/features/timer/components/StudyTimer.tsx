import { useState } from 'react';
import type { Subject } from '../../../api/types';
import { useTimer } from '../context/TimerContext';

interface StudyTimerProps {
  onRecorded: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
}

export default function StudyTimer({ onRecorded, subjects, subjectsWithColors = [] }: StudyTimerProps) {
  const {
    timerState,
    startTimer,
    stopTimer,
    resetTimer,
    setSelectedSubject,
    setMode,
    setManualHours,
    setManualMinutes,
    saveRecord,
  } = useTimer();

  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color || '#ef4444'; // デフォルトは赤系
  };

  // 時間を記録
  const handleRecord = async () => {
    setIsRecording(true);
    const result = await saveRecord(onRecorded);
    setIsRecording(false);
    
    // トースト通知を表示
    setToastMessage(result.message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 時間をフォーマット（MM:SS または HH:MM:SS）
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // プログレス計算（ストップウォッチモードの場合）
  const targetTime = 25 * 60; // デフォルト25分（秒）
  const progress = timerState.mode === 'stopwatch' && targetTime > 0
    ? Math.min((timerState.elapsedTime / targetTime) * 100, 100)
    : 0;

  const subjectColor = getSubjectColor(timerState.selectedSubject);
  const primaryColor = subjectColor || '#ef4444';

  const handleToggle = () => {
    if (!timerState.selectedSubject) return;
    if (timerState.isRunning) {
      stopTimer();
    } else {
      startTimer();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* タイトル */}
        <h1 className="text-white text-center text-2xl font-light mb-8 tracking-wide">
          学習時間
        </h1>

        {/* モード選択ボタン */}
        <div className="flex gap-2 mb-8 justify-center">
          <button
            type="button"
            onClick={() => {
              setMode('stopwatch');
              resetTimer();
            }}
            disabled={timerState.isRunning}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              timerState.mode === 'stopwatch'
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            ストップウォッチ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              resetTimer();
            }}
            disabled={timerState.isRunning}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              timerState.mode === 'manual'
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            手動記録
          </button>
        </div>

        {/* 科目選択（ドロップダウン） */}
        <div className="mb-8 relative">
          <button
            type="button"
            onClick={() => !timerState.isRunning && setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
            disabled={timerState.isRunning}
            className={`w-full px-4 py-3 rounded-full text-white/90 bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center gap-2 ${
              timerState.isRunning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {timerState.selectedSubject && subjectColor && (
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: subjectColor }}
              />
            )}
            <span className="text-sm">
              {timerState.selectedSubject || '科目を選択'}
            </span>
            {!timerState.isRunning && (
              <svg
                className={`w-4 h-4 transition-transform ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          
          {isSubjectDropdownOpen && !timerState.isRunning && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsSubjectDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl max-h-60 overflow-auto">
                {subjects.map((subject) => {
                  const color = getSubjectColor(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => {
                        setSelectedSubject(subject);
                        setIsSubjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/50 flex items-center gap-3 transition-colors ${
                        timerState.selectedSubject === subject ? 'bg-white/30' : ''
                      }`}
                    >
                      {color && (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      <span className="text-gray-800">{subject}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 円形タイマー */}
        <div className="relative mb-8 flex items-center justify-center">
          <div 
            className="relative w-80 h-80 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleToggle}
          >
            {/* プログレスリング（ストップウォッチモードのみ） */}
            {timerState.mode === 'stopwatch' && (
              <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
            )}
            
            {/* 中央の時間表示 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-7xl font-light text-white font-mono">
                {timerState.mode === 'stopwatch' 
                  ? formatTime(timerState.elapsedTime)
                  : `${String(timerState.manualHours).padStart(2, '0')}:${String(timerState.manualMinutes).padStart(2, '0')}`
                }
              </div>
            </div>
            
            {/* 下部の状態表示とアイコン（水平中央配置） */}
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-3 pointer-events-none">
              <div className="text-sm text-white/70 uppercase tracking-wider">
                {timerState.isRunning ? '実行中' : '停止中'}
              </div>
              {/* 再生/一時停止アイコン（状態表示） */}
              <div className="w-6 h-6 flex items-center justify-center">
                {timerState.isRunning ? (
                  // 一時停止アイコン
                  <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  // 再生アイコン
                  <svg className="w-5 h-5 text-white/80 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 手動記録モードの入力 */}
        {timerState.mode === 'manual' && !timerState.isRunning && (
          <div className="mb-8 flex gap-4 justify-center">
            <div className="flex flex-col items-center">
              <label className="text-white/70 text-xs mb-2">時間</label>
              <input
                type="number"
                min="0"
                max="24"
                value={timerState.manualHours}
                onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-white/70 text-xs mb-2">分</label>
              <input
                type="number"
                min="0"
                max="59"
                value={timerState.manualMinutes}
                onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* リセットボタン（ストップウォッチモードのみ） */}
        {timerState.mode === 'stopwatch' && (
          <div className="flex justify-center mb-8">
            <button
              onClick={resetTimer}
              disabled={timerState.isRunning}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white/70 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              リセット
            </button>
          </div>
        )}

        {/* 記録ボタン */}
        <button
          onClick={handleRecord}
          disabled={
            isRecording ||
            !timerState.selectedSubject ||
            (timerState.mode === 'stopwatch' && timerState.elapsedTime === 0) ||
            (timerState.mode === 'manual' && timerState.manualHours === 0 && timerState.manualMinutes === 0)
          }
          className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          {isRecording ? '記録中...' : toastMessage && toastMessage.includes('記録しました') ? '完了！' : '時間を記録'}
        </button>

        {/* トースト通知 */}
        {toastMessage && (
          <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
            toastMessage.includes('記録しました') 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

