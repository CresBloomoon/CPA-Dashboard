import { useState } from 'react';
import { studyProgressApi, todoApi, projectApi } from '../api/api';
import type { StudyProgress, SubjectSummary, Todo, Project } from '../api/types';

/**
 * アプリのデータ取得ロジック
 */
export const useAppData = () => {
  const [progressList, setProgressList] = useState<StudyProgress[]>([]);
  const [summary, setSummary] = useState<SubjectSummary[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 各APIを個別に呼び出してエラーハンドリング
      try {
        const progress = await studyProgressApi.getAll();
        setProgressList(progress);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
      
      try {
        const summaryData = await studyProgressApi.getSummary();
        setSummary(summaryData);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
      
      try {
        const todosData = await todoApi.getAll();
        setTodos(todosData);
      } catch (error) {
        console.error('Error fetching todos:', error);
      }
      
      try {
        const projectsData = await projectApi.getAll();
        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodos = async () => {
    try {
      const todosData = await todoApi.getAll();
      setTodos(todosData);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  return {
    progressList,
    summary,
    todos,
    projects,
    isLoading,
    fetchData,
    fetchTodos,
  };
};


