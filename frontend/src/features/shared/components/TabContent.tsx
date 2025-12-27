import { calculateTodoCounts } from '../../../utils/todoCounts';
import type { StudyProgress, Subject, Project, Todo } from '../../../api/types';
import SummaryCards from '../../timer/components/SummaryCards';
import StudyTimer from '../../timer/components/StudyTimer';
import TodoList from '../../kanban/components/TodoList';
import CalendarView from '../../calendar/components/CalendarView';
import KanbanBoard from '../../kanban/components/KanbanBoard';
import SettingsView from './SettingsView';

interface TabContentProps {
  activeTab: string;
  slideDirection: 'left' | 'right';
  progressList: StudyProgress[];
  summary: any[];
  todos: Todo[];
  projects: Project[];
  subjects: string[];
  subjectsWithColors: Subject[];
  reportStartDay: number;
  todoListFilterType: 'today' | 'all' | 'completed';
  onFetchData: () => void;
  onFetchTodos: () => void;
  onSubjectsChange: (names: string[]) => void;
  onSubjectsWithColorsChange: (subjectsWithColors: Subject[]) => void;
  onSettingsUpdate: () => void;
  onTodoFilterClick: (filterType: 'today' | 'all' | 'completed') => void;
}

export default function TabContent({
  activeTab,
  slideDirection: _slideDirection,
  progressList,
  summary,
  todos,
  projects,
  subjects,
  subjectsWithColors,
  reportStartDay,
  todoListFilterType,
  onFetchData,
  onFetchTodos,
  onSubjectsChange,
  onSubjectsWithColorsChange,
  onSettingsUpdate,
  onTodoFilterClick,
}: TabContentProps) {
  const todoCounts = calculateTodoCounts(todos);
  const { today: todayDueTodos, all: totalTodos, completed: completedTodos } = todoCounts;

  const totalHours = summary.reduce((sum, s) => sum + s.total_hours, 0);
  const totalProgress = progressList.length > 0
    ? progressList.reduce((sum, p) => sum + p.progress_percent, 0) / progressList.length
    : 0;

  return (
    <div className="w-full">
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <SummaryCards
            totalHours={totalHours}
            totalTodos={totalTodos}
            completedTodos={completedTodos}
            todayDueTodos={todayDueTodos}
            progressList={progressList}
            todos={todos}
            subjectsWithColors={subjectsWithColors}
            reportStartDay={reportStartDay}
            onTodayDueClick={() => onTodoFilterClick('today')}
            onTotalTodosClick={() => onTodoFilterClick('all')}
            onCompletedTodosClick={() => onTodoFilterClick('completed')}
          />
        </div>
      )}

      {activeTab === 'timer' && (
        <div className="w-full">
          {/* 学習時間タブは背景コンテナ（ネイビー）を他タブのメイン領域に近い幅まで広げる */}
          <StudyTimer onRecorded={onFetchData} subjects={subjects} subjectsWithColors={subjectsWithColors} />
        </div>
      )}

      {activeTab === 'todo' && (
        <div className="w-full min-h-[600px]">
          <TodoList 
            todos={todos} 
            onUpdate={onFetchTodos} 
            subjects={subjects} 
            subjectsWithColors={subjectsWithColors} 
            projects={projects}
            initialFilterType={todoListFilterType}
          />
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="max-w-full mx-auto min-h-[600px]">
          <CalendarView todos={todos} onUpdate={onFetchTodos} subjectsWithColors={subjectsWithColors} />
        </div>
      )}

      {activeTab === 'kanban' && (
        <div className="max-w-full mx-auto min-h-[600px]">
          <KanbanBoard 
            todos={todos} 
            projects={projects} 
            subjectsWithColors={subjectsWithColors}
            onProjectsUpdate={onFetchData}
            onTodosUpdate={onFetchTodos}
            subjects={subjects}
          />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="w-full -mx-4 min-h-[600px]">
          <SettingsView 
            onSubjectsChange={onSubjectsChange}
            onSubjectsWithColorsChange={onSubjectsWithColorsChange}
            onDataUpdate={onFetchData}
            onSettingsUpdate={onSettingsUpdate}
          />
        </div>
      )}
    </div>
  );
}


