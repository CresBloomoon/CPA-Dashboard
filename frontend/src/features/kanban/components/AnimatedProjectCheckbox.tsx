import { useState, type CSSProperties } from 'react';
import type { Project } from '../../../api/types';

interface AnimatedProjectCheckboxProps {
  project: Project;
  onToggle: () => void | Promise<void>;
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function AnimatedProjectCheckbox({
  project,
  onToggle,
  color = '#22c55e',
  size = 'sm',
  className = '',
}: AnimatedProjectCheckboxProps) {
  const [isSaving, setIsSaving] = useState(false);

  const checkboxDiameter = size === 'sm' ? '20px' : '25px';

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSaving) return;
    // プロジェクトは「完了」方向の操作に限定（誤操作防止）
    if (project.completed) return;
    try {
      setIsSaving(true);
      await onToggle();
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`ui-checkbox-wrapper ${className}`} onClick={handleToggle}>
      <input
        type="checkbox"
        className="ui-checkbox"
        checked={project.completed}
        onChange={() => {}}
        disabled={isSaving || project.completed}
        style={{
          '--primary-color': color,
          '--secondary-color': '#fff',
          '--primary-hover-color': color,
          '--checkbox-diameter': checkboxDiameter,
          '--checkbox-border-radius': '50%',
          '--checkbox-border-color': color,
          '--checkbox-border-width': '1px',
          '--checkbox-border-style': 'solid',
          opacity: (isSaving || project.completed) ? 0.6 : 1,
          cursor: (isSaving || project.completed) ? 'not-allowed' : 'pointer',
        } as CSSProperties}
      />
    </div>
  );
}


