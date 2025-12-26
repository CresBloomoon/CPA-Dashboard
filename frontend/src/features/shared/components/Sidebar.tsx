import { useState, useEffect, useRef } from 'react';

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
}

export default function Sidebar({ title, items, activeItemId, onItemClick }: SidebarProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number }>({ top: 0, height: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navRef = useRef<HTMLElement | null>(null);

  const updateIndicator = () => {
    const activeButton = buttonRefs.current[activeItemId];
    if (activeButton && navRef.current) {
      // nav要素を基準に位置を計算
      const navRect = navRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const top = buttonRect.top - navRect.top;
      const height = buttonRect.height;
      
      setIndicatorStyle({
        top: top,
        height: height,
      });
    } else {
      // アクティブなボタンが見つからない場合はインジケータを非表示
      setIndicatorStyle({ top: 0, height: 0 });
    }
  };

  useEffect(() => {
    // レンダリング後に位置を更新
    const timer = setTimeout(() => {
      updateIndicator();
    }, 0);
    
    // ウィンドウリサイズ時にも位置を再計算
    const handleResize = () => {
      updateIndicator();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeItemId, items]);

  // ボタンがマウントされた後にも位置を更新
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicator();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeItemId, items]);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex-shrink-0 h-full flex flex-col">
      <div className="p-6 flex-shrink-0 relative">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">{title}</h2>
        <nav ref={navRef} className="space-y-2 relative">
          {/* アクティブインジケーター */}
          {indicatorStyle.height > 0 && (
            <div
              className="absolute left-0 right-0 bg-blue-500 rounded-lg z-0 animate-fade-in"
              style={{
                top: `${indicatorStyle.top}px`,
                height: `${indicatorStyle.height}px`,
              }}
            />
          )}
          {items.map((item) => {
            const isActive = activeItemId === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  buttonRefs.current[item.id] = el;
                  if (el && activeItemId === item.id) {
                    // refが設定されたら位置を更新
                    setTimeout(() => updateIndicator(), 0);
                  }
                }}
                onClick={() => onItemClick(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-lg transition-colors duration-200 text-lg relative z-10 ${
                  isActive
                    ? 'bg-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`text-sm font-normal transition-colors duration-200 ${
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
      </div>
    </div>
  );
}

