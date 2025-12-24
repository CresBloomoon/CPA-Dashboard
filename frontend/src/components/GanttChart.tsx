import { useState, useMemo } from 'react';
import type { Todo, Subject, Project, ProjectCreate } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { projectApi } from '../api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface GanttChartProps {
  todos: Todo[];
  projects: Project[];
  subjectsWithColors?: Subject[];
  onProjectsUpdate: () => void;
  subjects: string[];
}

interface ProjectWithTodos {
  project: Project | null; // nullは「未分類」プロジェクト
  todos: Todo[];
}

export default function GanttChart({ todos, projects, subjectsWithColors = [], onProjectsUpdate, subjects }: GanttChartProps) {
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectSubject, setNewProjectSubject] = useState<string>('');
  const [newProjectDueDate, setNewProjectDueDate] = useState<Date | null>(null);
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // 科目の色を取得する関数
  const getSubjectColor = (subjectName: string | null): string => {
    if (!subjectName) return '#9ca3af'; // デフォルトのグレー
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color || '#9ca3af';
  };

  // プロジェクトとリマインダをグループ化
  const projectsWithTodos = useMemo(() => {
    const safeProjects = projects || [];
    const safeTodos = todos || [];
    
    if (!Array.isArray(safeProjects) || !Array.isArray(safeTodos)) {
      return [];
    }
    
    const projectMap = new Map<number, Project>();
    safeProjects.forEach(project => {
      projectMap.set(project.id, project);
    });

    const grouped: ProjectWithTodos[] = [];
    const todosByProjectId = new Map<number | null, Todo[]>();

    // プロジェクトごとにリマインダをグループ化
    safeTodos.forEach(todo => {
      const projectId = todo.project_id || null;
      if (!todosByProjectId.has(projectId)) {
        todosByProjectId.set(projectId, []);
      }
      todosByProjectId.get(projectId)!.push(todo);
    });

    // プロジェクトがあるリマインダを追加
    todosByProjectId.forEach((todosList, projectId) => {
      if (projectId !== null && projectMap.has(projectId)) {
        grouped.push({
          project: projectMap.get(projectId)!,
          todos: todosList,
        });
      }
    });

    // プロジェクトに紐づかないリマインダを「未分類」として追加
    const unassignedTodos = todosByProjectId.get(null) || [];
    if (unassignedTodos.length > 0) {
      grouped.push({
        project: null,
        todos: unassignedTodos,
      });
    }

    // プロジェクトの期限日でソート（nullは最後）
    grouped.sort((a, b) => {
      if (!a.project) return 1;
      if (!b.project) return -1;
      if (!a.project.due_date) return 1;
      if (!b.project.due_date) return -1;
      return new Date(a.project.due_date).getTime() - new Date(b.project.due_date).getTime();
    });

    return grouped;
  }, [todos, projects]);

  // 表示期間を計算（現在の月の前後1ヶ月）
  const [viewStart, viewEnd] = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(subWeeks(today, 2));
    const end = endOfMonth(addWeeks(today, 2));
    return [start, end];
  }, []);

  // 表示する日付のリスト
  const dateRange = useMemo(() => {
    return eachDayOfInterval({ start: viewStart, end: viewEnd });
  }, [viewStart, viewEnd]);

  // 日付の範囲を計算（週単位で表示）
  const weeks = useMemo(() => {
    const weekList: Date[][] = [];
    let currentWeekStart = startOfWeek(viewStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(viewEnd, { weekStartsOn: 0 });

    while (currentWeekStart <= endDate) {
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
      weekList.push(weekDays);
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }

    return weekList;
  }, [viewStart, viewEnd]);

  // プロジェクトの位置と幅を計算
  const getProjectPosition = (project: Project | null) => {
    if (!project || !project.due_date) return null;

    const dueDate = new Date(project.due_date);
    const startDate = viewStart;
    const endDate = viewEnd;

    if (dueDate < startDate || dueDate > endDate) return null;

    // 日付のインデックスを計算
    const daysDiff = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 1日あたりの幅（px）
    const dayWidth = 40;
    const left = daysDiff * dayWidth;

    return {
      left,
      width: dayWidth,
      date: dueDate,
    };
  };

  // リマインダの位置と幅を計算
  const getTaskPosition = (todo: Todo) => {
    if (!todo.due_date) return null;

    const dueDate = new Date(todo.due_date);
    const startDate = viewStart;
    const endDate = viewEnd;

    if (dueDate < startDate || dueDate > endDate) return null;

    // 日付のインデックスを計算
    const daysDiff = Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // 1日あたりの幅（px）
    const dayWidth = 40;
    const left = daysDiff * dayWidth;

    return {
      left,
      width: dayWidth,
      date: dueDate,
    };
  };

  // 通知を表示
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // プロジェクト作成
  const handleAddProject = async () => {
    if (!newProjectName.trim()) {
      showNotification('プロジェクト名を入力してください', 'error');
      return;
    }

    try {
      const projectData: ProjectCreate = {
        name: newProjectName.trim(),
        subject: newProjectSubject || undefined,
        due_date: newProjectDueDate ? newProjectDueDate.toISOString() : undefined,
        description: newProjectDescription.trim() || undefined,
      };

      await projectApi.create(projectData);
      showNotification('プロジェクトを作成しました', 'success');
      
      // フォームをリセット
      setNewProjectName('');
      setNewProjectSubject('');
      setNewProjectDueDate(null);
      setNewProjectDescription('');
      setIsAddingProject(false);
      
      // プロジェクトリストを更新
      onProjectsUpdate();
    } catch (error) {
      console.error('Error creating project:', error);
      showNotification('プロジェクトの作成に失敗しました', 'error');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700">ガントチャート</h2>
        <button
          onClick={() => setIsAddingProject(!isAddingProject)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {isAddingProject ? 'キャンセル' : '+ プロジェクト追加'}
        </button>
      </div>

      {/* 通知 */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* プロジェクト追加フォーム */}
      {isAddingProject && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">新規プロジェクト</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                プロジェクト名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="例: 租税法レギュラー答練1回目"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">科目</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                  >
                    <span className={newProjectSubject ? 'text-gray-900' : 'text-gray-500'}>
                      {newProjectSubject || '科目を選択'}
                    </span>
                    {newProjectSubject && (
                      <span
                        className="w-4 h-4 rounded-full ml-2 flex-shrink-0"
                        style={{ backgroundColor: getSubjectColor(newProjectSubject) }}
                      />
                    )}
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isSubjectDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsSubjectDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setNewProjectSubject('');
                            setIsSubjectDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 text-gray-500"
                        >
                          なし
                        </button>
                        {subjects.map((subject) => {
                          const subjectColor = getSubjectColor(subject);
                          return (
                            <button
                              key={subject}
                              type="button"
                              onClick={() => {
                                setNewProjectSubject(subject);
                                setIsSubjectDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: subjectColor }}
                              />
                              <span>{subject}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
                <DatePicker
                  selected={newProjectDueDate}
                  onChange={(date: Date | null) => setNewProjectDueDate(date)}
                  dateFormat="yyyy年MM月dd日"
                  locale="ja"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholderText="期限日を選択"
                  isClearable
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="プロジェクトの説明（任意）"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsAddingProject(false);
                  setNewProjectName('');
                  setNewProjectSubject('');
                  setNewProjectDueDate(null);
                  setNewProjectDescription('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddProject}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {projectsWithTodos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>プロジェクトとリマインダがありません</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* ヘッダー（日付） */}
          <div className="sticky top-0 bg-white z-10 border-b border-gray-200 mb-2">
            <div className="flex" style={{ minWidth: `${dateRange.length * 40}px` }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="border-r border-gray-200" style={{ width: `${week.length * 40}px` }}>
                  <div className="text-xs text-gray-600 text-center py-2 font-semibold">
                    {format(week[0], 'yyyy年MM月', { locale: ja })}
                  </div>
                  <div className="flex">
                    {week.map((day, dayIndex) => {
                      const isToday = isSameDay(day, new Date());
                      const dayOfWeek = getDay(day); // 0 = 日曜日, 6 = 土曜日
                      const isSunday = dayOfWeek === 0;
                      const isSaturday = dayOfWeek === 6;
                      
                      // 今日のスタイル
                      if (isToday) {
                        return (
                          <div
                            key={dayIndex}
                            className="border-r border-gray-100 text-center text-xs py-1 relative bg-red-500 text-white font-semibold"
                            style={{ width: '40px', minWidth: '40px', position: 'relative' }}
                          >
                            <div>{format(day, 'd', { locale: ja })}</div>
                            <div className="text-[10px] text-white">
                              {format(day, 'EEE', { locale: ja })}
                            </div>
                            <div 
                              className="absolute top-0 bottom-0 bg-red-600 z-10 pointer-events-none"
                              style={{ right: '-1px', width: '2px' }}
                            />
                          </div>
                        );
                      }
                      
                      // 日曜日のスタイル
                      if (isSunday) {
                        return (
                          <div
                            key={dayIndex}
                            className="border-r border-gray-100 text-center text-xs py-1 text-red-500"
                            style={{ width: '40px', minWidth: '40px' }}
                          >
                            <div>{format(day, 'd', { locale: ja })}</div>
                            <div className="text-[10px] text-red-400">
                              {format(day, 'EEE', { locale: ja })}
                            </div>
                          </div>
                        );
                      }
                      
                      // 土曜日のスタイル
                      if (isSaturday) {
                        return (
                          <div
                            key={dayIndex}
                            className="border-r border-gray-100 text-center text-xs py-1 text-blue-500"
                            style={{ width: '40px', minWidth: '40px' }}
                          >
                            <div>{format(day, 'd', { locale: ja })}</div>
                            <div className="text-[10px] text-blue-400">
                              {format(day, 'EEE', { locale: ja })}
                            </div>
                          </div>
                        );
                      }
                      
                      // 平日のスタイル
                      return (
                        <div
                          key={dayIndex}
                          className="border-r border-gray-100 text-center text-xs py-1 text-gray-500"
                          style={{ width: '40px', minWidth: '40px' }}
                        >
                          <div>{format(day, 'd', { locale: ja })}</div>
                          <div className="text-[10px] text-gray-400">
                            {format(day, 'EEE', { locale: ja })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ガントチャート本体 */}
          <div className="relative" style={{ minHeight: `${projectsWithTodos.length * 80}px` }}>
            {projectsWithTodos.map((projectWithTodos, index) => {
              const { project, todos: projectTodos } = projectWithTodos;
              const projectColor = project ? getSubjectColor(project.subject || null) : '#9ca3af';
              const projectName = project ? project.name : '未分類';

              return (
                <div key={project?.id || 'unassigned'} className="relative mb-4">
                  {/* プロジェクトラベル */}
                  <div className="absolute left-0 top-0 w-48 h-14 bg-gray-100 border-r border-gray-200 flex items-center justify-between px-3 z-20">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {project && project.subject && (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: projectColor }}
                        />
                      )}
                      <span className="text-sm font-semibold text-gray-800 truncate" title={projectName}>
                        {projectName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">{projectTodos.length}</span>
                  </div>

                  {/* ガントバーエリア */}
                  <div
                    className="relative ml-48 border-b border-gray-200"
                    style={{ minHeight: '60px' }}
                  >
                    {/* プロジェクトバー（期限日がある場合） */}
                    {project && project.due_date && (() => {
                      const projectPosition = getProjectPosition(project);
                      if (!projectPosition) return null;
                      
                      return (
                        <div
                          className="absolute top-0 rounded px-2 py-1 text-xs font-semibold text-white shadow-md"
                          style={{
                            left: `${projectPosition.left}px`,
                            width: `${projectPosition.width - 4}px`,
                            backgroundColor: '#6366f1', // インディゴ色でプロジェクトを表示
                            zIndex: 5,
                          }}
                          title={`プロジェクト: ${project.name}\n期限: ${format(projectPosition.date, 'yyyy年MM月dd日', { locale: ja })}`}
                        >
                          <div className="truncate">期限</div>
                        </div>
                      );
                    })()}

                    {/* リマインダバー */}
                    <div className="relative mt-8" style={{ minHeight: '48px' }}>
                    {/* 背景グリッド */}
                    <div className="absolute inset-0 flex">
                      {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex border-r border-gray-100" style={{ width: `${week.length * 40}px` }}>
                          {week.map((day, dayIndex) => {
                            const isToday = isSameDay(day, new Date());
                            const dayOfWeek = getDay(day);
                            const isSunday = dayOfWeek === 0;
                            const isSaturday = dayOfWeek === 6;
                            
                            let bgColor = 'border-gray-50';
                            if (isToday) {
                              bgColor = 'bg-red-50/30';
                            } else if (isSunday) {
                              bgColor = 'bg-red-50/10';
                            } else if (isSaturday) {
                              bgColor = 'bg-blue-50/10';
                            }
                            
                            return (
                              <div
                                key={dayIndex}
                                className={`border-r ${bgColor} relative`}
                                style={{ width: '40px', minWidth: '40px' }}
                              >
                                {isToday && (
                                  <div 
                                    className="absolute top-0 bottom-0 bg-red-600 z-10 pointer-events-none"
                                    style={{ right: '-1px', width: '2px' }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                      {projectTodos.map((todo) => {
                        const position = getTaskPosition(todo);
                        if (!position) return null;

                        const isCompleted = todo.completed;
                        const isOverdue = todo.due_date && new Date(todo.due_date) < new Date() && !todo.completed;
                        const todoColor = getSubjectColor(todo.subject || null);

                        return (
                          <div
                            key={todo.id}
                            className="absolute top-2 rounded px-2 py-1 text-xs text-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            style={{
                              left: `${position.left}px`,
                              width: `${position.width - 4}px`,
                              backgroundColor: isCompleted 
                                ? `${todoColor}80` // 完了時は半透明
                                : isOverdue
                                ? '#ef4444' // 期限切れは赤
                                : todoColor,
                              opacity: isCompleted ? 0.6 : 1,
                              borderLeft: isCompleted ? `3px solid ${todoColor}` : 'none',
                            }}
                            title={`${todo.subject ? `【${todo.subject}】` : ''}${todo.title}\n期限: ${format(position.date, 'yyyy年MM月dd日', { locale: ja })}`}
                          >
                            <div className="truncate font-medium">
                              {todo.title}
                            </div>
                            {isCompleted && (
                              <div className="text-[10px] opacity-75">✓ 完了</div>
                            )}
                            {isOverdue && (
                              <div className="text-[10px] opacity-75">期限切れ</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-gray-600">未完了</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded opacity-60" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-gray-600">完了済み</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-gray-600">期限切れ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

