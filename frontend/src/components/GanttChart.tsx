import { useMemo } from 'react';
import type { Todo, Subject, Project } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';

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


  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">ガントチャート</h2>

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
              const projectColor = '#9ca3af'; // プロジェクトは科目を持たないため、デフォルトのグレー
              const projectName = project ? project.name : '未分類';

              return (
                <div key={project?.id || 'unassigned'} className="relative mb-4">
                  {/* プロジェクトラベル */}
                  <div className="absolute left-0 top-0 w-48 h-14 bg-gray-100 border-r border-gray-200 flex items-center justify-between px-3 z-20">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
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

