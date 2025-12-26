import type { Subject, Project } from '../types';

/**
 * 科目名から色を取得
 */
export const getSubjectColor = (
  subjectName: string | undefined,
  subjectsWithColors: Subject[]
): string | undefined => {
  if (!subjectName) return undefined;
  const subject = subjectsWithColors.find(s => s.name === subjectName);
  return subject?.color;
};

/**
 * プロジェクトIDからプロジェクト名を取得
 */
export const getProjectName = (
  projectId: number | undefined,
  projects: Project[]
): string | undefined => {
  if (!projectId) return undefined;
  const project = projects.find(p => p.id === projectId);
  if (!project) {
    console.log('Project not found for projectId:', projectId, 'Available projects:', projects);
    return undefined;
  }
  return project.name;
};


