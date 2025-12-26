import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ja } from 'date-fns/locale';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
import type { Todo, Project, ProjectCreate, Subject } from '../types';
import { projectApi, todoApi } from '../api';
import TodoCreateModal from './TodoCreateModal';
import ProjectCreateModal from './ProjectCreateModal';
import AnimatedCheckbox from './AnimatedCheckbox';

registerLocale('ja', ja);

interface KanbanBoardProps {
  todos: Todo[];
  projects: Project[];
  subjectsWithColors?: Subject[];
  onProjectsUpdate: () => void;
  onTodosUpdate: () => void;
  subjects: string[];
}

// ドラッグ可能なリマインダカードコンポーネント
function DraggableTodoCard({ 
  todo, 
  getSubjectColor,
  onUpdate,
  onDelete,
  subjectsWithColors = []
}: { 
  todo: Todo; 
  getSubjectColor: (subject: string | null) => string;
  onUpdate: () => void;
  onDelete: (todo: Todo) => void;
  subjectsWithColors?: Subject[];
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const todoColor = getSubjectColor(todo.subject || null);
  const isCompleted = todo.completed;
  
  // タイトルから古い科目名を削除し、最新の科目名を取得
  const getDisplayTitle = () => {
    let displayTitle = todo.title;
    // タイトルに【科目名】の形式が含まれている場合、最新の科目名に置き換え
    if (todo.subject) {
      const titleMatch = displayTitle.match(/^【(.+?)】(.+)$/);
      if (titleMatch) {
        // タイトルに科目名が含まれている場合は、最新の科目名で置き換え
        displayTitle = `【${todo.subject}】${titleMatch[2]}`;
      } else if (!displayTitle.startsWith('【')) {
        // タイトルに科目名が含まれていない場合は、追加
        displayTitle = `【${todo.subject}】${displayTitle}`;
      }
    }
    return displayTitle;
  };
  
  // 期限の状態を判定
  let dueDateText = '';
  let dueDateClassName = '';
  
  if (todo.due_date) {
    const dueDate = new Date(todo.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dateText = `${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`;
    
    if (diffDays < 0) {
      // 期限超（前日以前）- 赤文字
      dueDateText = dateText;
      dueDateClassName = 'text-red-600';
    } else if (diffDays === 0) {
      // 当日 - 青文字
      dueDateText = dateText;
      dueDateClassName = 'text-blue-600';
    } else {
      // 期限前（翌日以降）- 黒文字
      dueDateText = dateText;
      dueDateClassName = 'text-gray-800';
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`p-3 bg-white rounded-lg shadow-sm border-l-4 cursor-move hover:shadow-md transition-shadow relative ${
        isCompleted ? 'opacity-60' : ''
      } ${isDragging ? 'opacity-0 pointer-events-none' : ''}`}
      style={{
        ...style,
        borderLeftColor: todoColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <AnimatedCheckbox
            todo={todo}
            subjectColor={todoColor}
            onUpdate={onUpdate}
            size="sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium text-gray-800 truncate ${isCompleted ? 'line-through' : ''}`}>
            {getDisplayTitle()}
          </div>
          {todo.due_date && (
            <div className={`text-xs mt-1 ${dueDateClassName}`}>
              {dueDateText}
            </div>
          )}
        </div>
        {/* 削除ボタン（ホバー時のみ表示） */}
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo);
            }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="削除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ドロップ可能なプロジェクト列コンポーネント
function DroppableProjectColumn({ 
  project, 
  todos, 
  isDragOver, 
  openMenuProjectId,
  setOpenMenuProjectId,
  handleStartEdit,
  handleDeleteProject,
  onAddTodoClick,
  getSubjectColor,
  onUpdateTodos,
  onDeleteTodo,
  onToggleProject,
  subjectsWithColors = [],
}: { 
  project: Project | { id: 'unassigned'; name: string; due_date: null; description: null }; 
  todos: Todo[]; 
  isDragOver: boolean;
  openMenuProjectId: number | 'unassigned' | null;
  setOpenMenuProjectId: (id: number | 'unassigned' | null) => void;
  handleStartEdit: (project: Project) => void;
  handleDeleteProject: (id: number) => void;
  onAddTodoClick: (projectId: number | 'unassigned') => void;
  getSubjectColor: (subject: string | null) => string;
  onUpdateTodos: () => void;
  onDeleteTodo: (todo: Todo) => void;
  onToggleProject: (project: Project) => void;
  subjectsWithColors?: Subject[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: project.id,
    data: {
      type: 'project',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`project-column flex-shrink-0 w-80 bg-gray-50 rounded-lg p-4 ${
        (isDragOver || isOver) ? 'bg-blue-50 border-2 border-blue-400' : ''
      }`}
    >
      {/* プロジェクトヘッダー */}
      <div className="flex items-center gap-2 mb-4 relative">
        {/* プロジェクト完了ボタン */}
        {project.id !== 'unassigned' && 'completed' in project && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleProject(project as Project);
            }}
            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
              (project as Project).completed
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-green-400'
            }`}
            title={(project as Project).completed ? '完了を解除' : '完了にする'}
          >
            {(project as Project).completed && (
              <svg
                className="w-4 h-4 text-white animate-checkmark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  className="animate-draw-check"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        )}
        <h3 className={`font-semibold flex-1 ${
          project.id !== 'unassigned' && 'completed' in project && (project as Project).completed
            ? 'text-gray-400 line-through'
            : 'text-gray-800'
        }`}>{project.name}</h3>
        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded">
          {todos.length}
        </span>
        {/* リマインダ追加ボタン */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTodoClick(project.id);
          }}
          className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
          title="リマインダを追加"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        {project.id !== 'unassigned' && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuProjectId(openMenuProjectId === project.id ? null : project.id);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="メニュー"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {openMenuProjectId === project.id && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpenMenuProjectId(null)}
                />
                <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(project);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    編集
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    削除
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* リマインダリスト */}
      <div className="project-column-scroll space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {todos.map((todo) => (
          <DraggableTodoCard 
            key={todo.id} 
            todo={todo} 
            getSubjectColor={getSubjectColor}
            onUpdate={onUpdateTodos}
            onDelete={onDeleteTodo}
            subjectsWithColors={subjectsWithColors}
          />
        ))}
        {todos.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            リマインダがありません
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ 
  todos, 
  projects, 
  subjectsWithColors = [], 
  onProjectsUpdate, 
  onTodosUpdate,
  subjects 
}: KanbanBoardProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | 'unassigned' | null>(null);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<number | 'unassigned' | null>(null);
  
  // リマインダ作成モーダル用のstate
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [selectedProjectIdForTodo, setSelectedProjectIdForTodo] = useState<number | 'unassigned' | null>(null);
  
  // 楽観的更新用のローカル状態
  const [optimisticTodos, setOptimisticTodos] = useState<Todo[]>(todos);
  
  // todosが更新されたら楽観的状態も更新
  useEffect(() => {
    setOptimisticTodos(todos);
  }, [todos]);
  
  // dnd-kitのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動したらドラッグ開始（誤操作防止）
      },
    }),
    useSensor(KeyboardSensor)
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDueDate, setEditProjectDueDate] = useState<Date | null>(null);
  const [editProjectDescription, setEditProjectDescription] = useState('');

  // 科目の色を取得する関数
  const getSubjectColor = (subjectName: string | null): string => {
    if (!subjectName) return '#9ca3af';
    const subject = subjectsWithColors.find(s => s.name === subjectName);
    return subject?.color || '#9ca3af';
  };
  
  // リマインダ作成モーダルを開く
  const openTodoModal = (projectId: number | 'unassigned') => {
    setSelectedProjectIdForTodo(projectId);
    setIsTodoModalOpen(true);
  };
  
  // リマインダ作成モーダルを閉じる
  const closeTodoModal = () => {
    setIsTodoModalOpen(false);
    setSelectedProjectIdForTodo(null);
  };

  // ToDoの完了状態を切り替え
  const handleToggleTodo = async (todo: Todo) => {
    try {
      await todoApi.update(todo.id, { completed: !todo.completed });
      onTodosUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  // プロジェクトの完了状態を切り替え
  const handleToggleProject = async (project: Project) => {
    try {
      await projectApi.update(project.id, { completed: !project.completed });
      onProjectsUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  // ToDoを削除
  const handleDeleteTodo = async (todo: Todo) => {
    try {
      await todoApi.delete(todo.id);
      onTodosUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  // プロジェクト作成モーダルを開く
  const openProjectModal = () => {
    setIsProjectModalOpen(true);
  };

  // プロジェクト作成モーダルを閉じる
  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
  };

  // プロジェクト編集開始
  const handleStartEdit = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDueDate(project.due_date ? new Date(project.due_date) : null);
    setEditProjectDescription(project.description || '');
    setOpenMenuProjectId(null);
  };

  // プロジェクト編集モーダルを閉じる
  const closeEditModal = () => {
    setEditingProject(null);
    setEditProjectName('');
    setEditProjectDueDate(null);
    setEditProjectDescription('');
  };

  // プロジェクト編集保存
  const handleSaveEdit = async () => {
    if (!editingProject || !editProjectName.trim()) {
      return;
    }

    try {
      const projectData: Partial<ProjectCreate> = {
        name: editProjectName.trim(),
        due_date: editProjectDueDate ? editProjectDueDate.toISOString() : undefined,
        description: editProjectDescription.trim() || undefined,
      };

      await projectApi.update(editingProject.id, projectData);
      
      // モーダルを閉じる
      closeEditModal();
      
      // プロジェクトリストを更新
      onProjectsUpdate();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  // プロジェクト削除
  const handleDeleteProject = async (projectId: number) => {
    try {
      await projectApi.delete(projectId);
      setOpenMenuProjectId(null);
      
      // プロジェクトリストを更新
      onProjectsUpdate();
      // リマインダリストも更新（project_idがnullになる）
      onTodosUpdate();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  // プロジェクトごとにリマインダをグループ化（楽観的状態を使用）
  // ドラッグ中のアイテムは移動前のプロジェクトから除外
  const todosByProject = optimisticTodos.reduce((acc, todo) => {
    // ドラッグ中のアイテムは除外
    if (activeId === todo.id) {
      return acc;
    }
    const projectId = todo.project_id || 'unassigned';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(todo);
    return acc;
  }, {} as Record<number | 'unassigned', Todo[]>);

  // dnd-kitのドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  // dnd-kitのドラッグオーバー
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // プロジェクトカードのドロップ可能領域を優先的に検出
      const overData = over.data.current;
      if (overData?.type === 'project') {
        const overId = over.id;
        if (typeof overId === 'string' && overId === 'unassigned') {
          setOverId('unassigned');
        } else if (typeof overId === 'number') {
          setOverId(overId);
        }
      } else {
        // Todoの上にホバーしている場合、そのTodoが属するプロジェクトを検出
        const overId = over.id;
        if (typeof overId === 'number') {
          const targetTodo = optimisticTodos.find(t => t.id === overId);
          if (targetTodo) {
            const targetProjectId = targetTodo.project_id || 'unassigned';
            setOverId(targetProjectId);
          }
        }
      }
    } else {
      setOverId(null);
    }
  };

  // dnd-kitのドロップ
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const todoId = active.id as number;
    const todo = optimisticTodos.find(t => t.id === todoId);
    if (!todo) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const currentProjectId = todo.project_id || 'unassigned';
    
    // over.data.typeが'project'の場合はプロジェクト間の移動
    // それ以外（TodoのID）の場合は同じプロジェクト内でのソート
    const overData = over.data.current;
    const isProjectDrop = overData?.type === 'project';
    
    if (isProjectDrop) {
      // プロジェクト間での移動
      const targetProjectId = over.id;
      
      // 同じプロジェクトへの移動は無視
      if (currentProjectId === targetProjectId) {
        setActiveId(null);
        setOverId(null);
        return;
      }

      const projectId = targetProjectId === 'unassigned' ? null : (targetProjectId as number);
      
      // 楽観的更新：即座にUIを更新
      setOptimisticTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId ? { ...t, project_id: projectId } : t
        )
      );
      
      setActiveId(null);
      setOverId(null);

      try {
        // API呼び出し
        const updateData: { project_id: number | null } = {
          project_id: projectId,
        };
        
        await todoApi.update(todoId, updateData);
        
        // サーバーから最新データを取得
        onTodosUpdate();
      } catch (error: any) {
        console.error('Error moving todo:', error);
        // エラー時は楽観的更新を元に戻す
        setOptimisticTodos(todos);
      }
    } else {
      // Todoの上にドロップした場合、そのTodoが属するプロジェクトに移動
      const targetTodoId = over.id as number;
      const targetTodo = optimisticTodos.find(t => t.id === targetTodoId);
      
      if (!targetTodo) {
        setActiveId(null);
        setOverId(null);
        return;
      }
      
      const targetProjectId = targetTodo.project_id || 'unassigned';
      
      // 同じプロジェクトへの移動は無視
      if (currentProjectId === targetProjectId) {
        setActiveId(null);
        setOverId(null);
        return;
      }

      const projectId = targetProjectId === 'unassigned' ? null : (targetProjectId as number);
      
      // 楽観的更新：即座にUIを更新
      setOptimisticTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId ? { ...t, project_id: projectId } : t
        )
      );
      
      setActiveId(null);
      setOverId(null);

      try {
        // API呼び出し
        const updateData: { project_id: number | null } = {
          project_id: projectId,
        };
        
        await todoApi.update(todoId, updateData);
        
        // サーバーから最新データを取得
        onTodosUpdate();
      } catch (error: any) {
        console.error('Error moving todo:', error);
        // エラー時は楽観的更新を元に戻す
        setOptimisticTodos(todos);
      }
    }
  };

  // プロジェクトリスト（未分類を含む）
  const allProjects: (Project | { id: 'unassigned'; name: string; due_date: null; description: null })[] = [
    ...projects,
    { id: 'unassigned' as const, name: '未分類', due_date: null, description: null },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-700">プロジェクト</h2>
        <button
          onClick={openProjectModal}
          className="w-10 h-10 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          title="プロジェクトを追加"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* プロジェクト編集モーダル */}
      <Dialog open={!!editingProject} onClose={closeEditModal} className="relative z-50">
        {/* オーバーレイ */}
        <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" />

        {/* モーダルコンテンツ */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] min-h-[600px] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-700">プロジェクトを編集</h3>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      プロジェクト名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      placeholder="例: 租税法レギュラー答練1回目"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">期限日</label>
                    <DatePicker
                      selected={editProjectDueDate}
                      onChange={(date: Date | null) => setEditProjectDueDate(date)}
                      dateFormat="yyyy年MM月dd日"
                      locale="ja"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholderText="期限日を選択"
                      isClearable
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      value={editProjectDescription}
                      onChange={(e) => setEditProjectDescription(e.target.value)}
                      placeholder="プロジェクトの説明（任意）"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={closeEditModal}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* プロジェクトボード */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {allProjects.map((project) => {
              const projectTodos = todosByProject[project.id] || [];
              const isDragOver = overId === project.id;

              return (
                <DroppableProjectColumn
                  key={project.id}
                  project={project}
                  todos={projectTodos}
                  isDragOver={isDragOver}
                  openMenuProjectId={openMenuProjectId}
                  setOpenMenuProjectId={setOpenMenuProjectId}
                  handleStartEdit={handleStartEdit}
                  handleDeleteProject={handleDeleteProject}
                  onAddTodoClick={openTodoModal}
                  getSubjectColor={getSubjectColor}
                  onUpdateTodos={onTodosUpdate}
                  onDeleteTodo={handleDeleteTodo}
                  onToggleProject={handleToggleProject}
                  subjectsWithColors={subjectsWithColors}
                />
              );
            })}
          </div>
        </div>
        <DragOverlay>
          {activeId ? (() => {
            const todo = optimisticTodos.find(t => t.id === activeId);
            if (!todo) return null;
            const todoColor = getSubjectColor(todo.subject || null);
            return (
              <div
                className="p-3 bg-white rounded-lg shadow-lg border-l-4 opacity-90"
                style={{
                  borderLeftColor: todoColor,
                  width: '320px',
                }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {(() => {
                        let displayTitle = todo.title;
                        // タイトルに【科目名】の形式が含まれている場合、最新の科目名に置き換え
                        if (todo.subject) {
                          const titleMatch = displayTitle.match(/^【(.+?)】(.+)$/);
                          if (titleMatch) {
                            displayTitle = `【${todo.subject}】${titleMatch[2]}`;
                          } else if (!displayTitle.startsWith('【')) {
                            displayTitle = `【${todo.subject}】${displayTitle}`;
                          }
                        }
                        return displayTitle;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : null}
        </DragOverlay>
      </DndContext>

      {/* リマインダ作成モーダル */}
      <TodoCreateModal
        isOpen={isTodoModalOpen}
        onClose={closeTodoModal}
        onSubmit={onTodosUpdate}
        subjects={subjects}
        subjectsWithColors={subjectsWithColors}
        initialProjectId={selectedProjectIdForTodo === 'unassigned' ? null : (selectedProjectIdForTodo as number | null)}
      />

      {/* プロジェクト作成モーダル */}
      <ProjectCreateModal
        isOpen={isProjectModalOpen}
        onClose={closeProjectModal}
        onSubmit={onProjectsUpdate}
      />
    </div>
  );
}

