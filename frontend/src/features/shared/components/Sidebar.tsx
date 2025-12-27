import { type ReactNode, useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { ANIMATION_THEME } from '../../../config/appConfig';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../styles/theme';

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
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div 
      className="w-80 flex-shrink-0 h-full flex flex-col"
      style={{
        backgroundColor: colors.backgroundSecondary,
        borderRight: `1px solid ${colors.border}`,
      }}
    >
      <div className="p-6 flex-shrink-0 relative">
        <div className="flex items-center justify-between mb-6">
          <h2 
            className="text-2xl font-semibold"
            style={{ color: colors.textSecondary }}
          >
            {title}
          </h2>
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
                  className="w-full flex items-center justify-between px-6 py-4 rounded-lg transition-colors duration-200 text-lg relative"
                  style={{
                    color: isActive ? colors.textInverse : colors.textSecondary,
                    fontWeight: isActive ? '600' : 'normal',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = colors.cardHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* アクティブ背景（layoutIdで上下にスライド） */}
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-lg shadow-md"
                      style={{
                        backgroundColor: colors.accent,
                      }}
                      transition={ANIMATION_THEME.SPRINGS.SIDEBAR_PILL}
                    />
                  )}

                  <span className="relative z-10">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className="relative z-10 text-sm font-normal transition-colors duration-200 min-w-10 text-right"
                      style={{
                        color: isActive ? `${colors.textInverse}B3` : colors.textTertiary, // B3 = 70% opacity
                      }}
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

