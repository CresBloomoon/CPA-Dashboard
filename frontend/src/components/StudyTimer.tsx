import { useState, useEffect, useRef } from 'react';
import { studyProgressApi } from '../api';
import type { StudyProgressCreate, Subject } from '../types';

interface StudyTimerProps {
  onRecorded: () => void;
  subjects: string[];
  subjectsWithColors?: Subject[];
}

export default function StudyTimer({ onRecorded, subjects, subjectsWithColors = [] }: StudyTimerProps) {
  // 科目名から色を取得
  const getSubjectColor = (subjectName?: string): string | undefined => {
    if (!subjectName) return undefined;
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color;
  };
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // 秒単位
  const [manualHours, setManualHours] = useState(0); // 時間
  const [manualMinutes, setManualMinutes] = useState(0); // 分（5分刻み）
  const [mode, setMode] = useState<'stopwatch' | 'manual'>('stopwatch');
  const [topic, setTopic] = useState<string>('');
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // ストップウォッチのタイマー処理
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // ストップウォッチ開始
  const handleStart = () => {
    if (!selectedSubject) {
      return;
    }
    startTimeRef.current = Date.now() - elapsedTime * 1000;
    setIsRunning(true);
  };

  // ストップウォッチ停止
  const handleStop = () => {
    setIsRunning(false);
  };

  // ストップウォッチリセット
  const handleReset = () => {
    setIsRunning(false);
    setElapsedTime(0);
    startTimeRef.current = 0;
  };

  // 時間を記録
  const handleRecord = async () => {
    if (!selectedSubject) {
      return;
    }

    let hours = 0;
    if (mode === 'stopwatch') {
      if (elapsedTime === 0) {
        return;
      }
      hours = elapsedTime / 3600; // 秒を時間に変換
    } else {
      hours = manualHours + manualMinutes / 60; // 時間 + 分を時間に変換
    }

    if (hours === 0) {
      return;
    }

    try {
      // 既存の進捗を検索（同じ科目・トピック）
      const allProgress = await studyProgressApi.getAll();
      const existingProgress = allProgress.find(
        (p) => p.subject === selectedSubject && p.topic === (topic || '学習時間')
      );

      if (existingProgress) {
        // 既存の進捗に時間を追加
        const updatedHours = existingProgress.study_hours + hours;
        await studyProgressApi.update(existingProgress.id, {
          study_hours: updatedHours,
        });
      } else {
        // 新しい進捗を作成
        const newProgress: StudyProgressCreate = {
          subject: selectedSubject,
          topic: topic || '学習時間',
          progress_percent: 0,
          study_hours: hours,
          notes: mode === 'stopwatch' 
            ? `ストップウォッチで記録: ${formatTime(elapsedTime)}` 
            : `手動記録: ${manualHours > 0 ? `${manualHours}時間` : ''}${manualMinutes}分`,
        };
        await studyProgressApi.create(newProgress);
      }

      // リセット
      handleReset();
      setTopic('');
      setManualHours(0);
      setManualMinutes(0);
      onRecorded();
    } catch (error) {
      console.error('Error recording time:', error);
    }
  };

  // 時間をフォーマット（HH:MM:SS）
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 5分刻みのオプション生成（0分から55分まで）
  const minuteOptions = [];
  for (let i = 0; i <= 55; i += 5) {
    minuteOptions.push(i);
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">
        勉強時間を記録
      </h2>

      {/* 科目選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          科目
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
            className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex items-center gap-2 ${
              selectedSubject && getSubjectColor(selectedSubject) ? 'pl-8 pr-4 py-2' : 'px-4 py-2'
            } ${isRunning ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            disabled={isRunning}
          >
            {selectedSubject && getSubjectColor(selectedSubject) && (
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getSubjectColor(selectedSubject) || '#ccc' }}
              />
            )}
            <span className="flex-1">
              {selectedSubject || '選択してください'}
            </span>
            <svg
              className={`w-4 h-4 transition-transform flex-shrink-0 ${isSubjectDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isSubjectDropdownOpen && !isRunning && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsSubjectDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('');
                    setIsSubjectDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                    !selectedSubject ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="w-3 h-3 flex-shrink-0" />
                  <span>選択してください</span>
                </button>
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
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                        selectedSubject === subject ? 'bg-blue-50' : ''
                      }`}
                    >
                      {color ? (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ) : (
                        <span className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span>{subject}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* トピック（任意） */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          トピック（任意）
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isRunning}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          placeholder="例: 連結財務諸表"
        />
      </div>

      {/* モード選択 */}
      <div className="mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              setMode('stopwatch');
              handleReset();
            }}
            disabled={isRunning}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'stopwatch'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            ストップウォッチ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              handleReset();
            }}
            disabled={isRunning}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'manual'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            手動記録
          </button>
        </div>
      </div>

      {/* ストップウォッチモード */}
      {mode === 'stopwatch' && (
        <div className="mb-6">
          <div className="text-center mb-6">
            <div className="text-6xl font-mono font-bold text-gray-800 mb-4">
              {formatTime(elapsedTime)}
            </div>
            <div className="flex gap-3 justify-center">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={!selectedSubject}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  開始
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                >
                  停止
                </button>
              )}
              <button
                onClick={handleReset}
                disabled={isRunning}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                リセット
              </button>
            </div>
          </div>
          <div className="text-center text-sm text-gray-600">
            {elapsedTime > 0 && (
              <p>記録時間: {(elapsedTime / 3600).toFixed(2)}時間</p>
            )}
          </div>
        </div>
      )}

      {/* 手動記録モード */}
      {mode === 'manual' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            学習時間
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">時間</label>
              <input
                type="number"
                min="0"
                max="24"
                value={manualHours}
                onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">分（5分刻み）</label>
              <select
                value={manualMinutes}
                onChange={(e) => setManualMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {minuteOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes}分
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 記録ボタン */}
      <button
        onClick={handleRecord}
        disabled={
          !selectedSubject ||
          (mode === 'stopwatch' && elapsedTime === 0) ||
          (mode === 'manual' && manualHours === 0 && manualMinutes === 0)
        }
        className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        時間を記録
      </button>
    </div>
  );
}

