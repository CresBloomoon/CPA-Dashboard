import { type ReactNode, useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';

export interface SidebarItem {
  id: string;
  label: string;
  count?: number;
}

interface SidebarProps {
  title: string;
  items: SidebarItem[];
  activeItemId: string;
  onItemClick: (itemId: string) => void;
  headerRight?: ReactNode;
}

export default function Sidebar({ title, items, activeItemId, onItemClick, headerRight }: SidebarProps) {
  // 複数サイドバーが同時に存在する場合の layoutId 競合を避けるため、LayoutGroup を分離
  const layoutGroupIdRef = useRef(`active-pill-${title}`);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex-shrink-0 h-full flex flex-col">
      <div className="p-6 flex-shrink-0 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
          {headerRight && <div className="flex-shrink-0 min-w-10 flex justify-end">{headerRight}</div>}
        </div>
        <LayoutGroup id={layoutGroupIdRef.current}>
          <nav className="space-y-2 relative">
            {items.map((item) => {
              const isActive = activeItemId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-lg transition-colors duration-200 text-lg relative ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {/* アクティブ背景（layoutIdで上下にスライド） */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-blue-500 rounded-lg shadow-md"
                      transition={ANIMATION_THEME.SPRINGS.SIDEBAR_PILL}
                    />
                  )}

                  <span className="relative z-10">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`relative z-10 text-sm font-normal transition-colors duration-200 min-w-10 text-right ${
                        isActive ? 'text-white/70' : 'text-gray-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </LayoutGroup>
      </div>
    </div>
  );
}

