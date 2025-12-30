import type { Subject, Project } from '../api/types';
import { SUBJECT_COLOR_FALLBACK } from '../config/subjects';

/**
 * 科目名から色を取得
 */
export const getSubjectColor = (
  subjectName: string | undefined,
  subjectsWithColors: Subject[],
  fallbackColor: string = SUBJECT_COLOR_FALLBACK
): string | undefined => {
  if (!subjectName) return undefined;
  const subject = subjectsWithColors.find(s => s.name === subjectName);
  return subject?.color || fallbackColor;
};

/**
 * プロジェクトIDからプロジェクト名を取得
 */
export const getProjectName = (
  projectId: number | null | undefined,
  projects: Project[]
): string | undefined => {
  if (projectId == null) return undefined;
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    console.log('Project not found for projectId:', projectId, 'Available projects:', projects);
    return undefined;
  }
  return project.name;
};


