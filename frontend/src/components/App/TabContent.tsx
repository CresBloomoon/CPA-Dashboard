import { calculateTodoCounts } from '../../utils/todoCounts';
import type { StudyProgress, Subject, Project, Todo } from '../../types';
import SummaryCards from '../SummaryCards';
import Heatmap from '../Heatmap';
import StudyTimer from '../StudyTimer';
import TodoList from '../TodoList';
import CalendarView from '../CalendarView';
import KanbanBoard from '../KanbanBoard';
import GanttChart from '../GanttChart';
import SettingsView from '../SettingsView';

interface TabContentProps {
  activeTab: string;
  slideDirection: 'left' | 'right';
  progressList: StudyProgress[];
  summary: any[];
  todos: Todo[];
  projects: Project[];
  subjects: string[];
  subjectsWithColors: Subject[];
  todoListFilterType: 'today' | 'all' | 'completed';
  onFetchData: () => void;
  onFetchTodos: () => void;
  onSubjectsChange: (names: string[]) => void;
  onSubjectsWithColorsChange: (subjectsWithColors: Subject[]) => void;
  onTodoFilterClick: (filterType: 'today' | 'all' | 'completed') => void;
}

export default function TabContent({
  activeTab,
  slideDirection,
  progressList,
  summary,
  todos,
  projects,
  subjects,
  subjectsWithColors,
  todoListFilterType,
  onFetchData,
  onFetchTodos,
  onSubjectsChange,
  onSubjectsWithColorsChange,
  onTodoFilterClick,
}: TabContentProps) {
  const todoCounts = calculateTodoCounts(todos);
  const { today: todayDueTodos, all: totalTodos, completed: completedTodos } = todoCounts;

  const totalHours = summary.reduce((sum, s) => sum + s.total_hours, 0);
  const totalProgress = progressList.length > 0
    ? progressList.reduce((sum, p) => sum + p.progress_percent, 0) / progressList.length
    : 0;

  return (
    <div key={activeTab} className={slideDirection === 'right' ? 'slide-in-right' : 'slide-in-left'}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <SummaryCards
            totalHours={totalHours}
            totalTodos={totalTodos}
            completedTodos={completedTodos}
            todayDueTodos={todayDueTodos}
            progressList={progressList}
            subjectsWithColors={subjectsWithColors}
            onTodayDueClick={() => onTodoFilterClick('today')}
            onTotalTodosClick={() => onTodoFilterClick('all')}
            onCompletedTodosClick={() => onTodoFilterClick('completed')}
          />
          <Heatmap progressList={progressList} todos={todos} />
        </div>
      )}

      {activeTab === 'timer' && (
        <div className="max-w-2xl mx-auto">
          <StudyTimer onRecorded={onFetchData} subjects={subjects} subjectsWithColors={subjectsWithColors} />
        </div>
      )}

      {activeTab === 'todo' && (
        <div className="w-full">
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
        <div className="max-w-full mx-auto">
          <CalendarView todos={todos} onUpdate={onFetchTodos} subjectsWithColors={subjectsWithColors} />
        </div>
      )}

      {activeTab === 'kanban' && (
        <div className="max-w-full mx-auto">
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

      {activeTab === 'gantt' && (
        <div className="max-w-full mx-auto">
          <GanttChart 
            todos={todos} 
            projects={projects} 
            subjectsWithColors={subjectsWithColors}
            onProjectsUpdate={onFetchData}
            subjects={subjects}
          />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="w-full -mx-4">
          <SettingsView 
            onSubjectsChange={onSubjectsChange}
            onSubjectsWithColorsChange={onSubjectsWithColorsChange}
            onDataUpdate={onFetchData}
          />
        </div>
      )}
    </div>
  );
}


