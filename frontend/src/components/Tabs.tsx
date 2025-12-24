import { useEffect, useRef, useState } from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
}

export default function Tabs({ activeTab, onTabChange, tabs }: TabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navRef = useRef<HTMLDivElement | null>(null);

  const updateIndicator = () => {
    const activeTabElement = tabRefs.current[activeTab];
    
    if (activeTabElement) {
      // offsetLeftとoffsetWidthを使用（親要素からの相対位置）
      const left = activeTabElement.offsetLeft;
      const width = activeTabElement.offsetWidth;
      
      setIndicatorStyle({
        left: left,
        width: width,
      });
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
  }, [activeTab]);

  // タブがマウントされた後にも位置を更新
  useEffect(() => {
    const timer = setTimeout(() => {
      updateIndicator();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  return (
    <div className="border-b border-gray-200 mb-6 relative">
      <nav ref={navRef} className="flex relative" aria-label="Tabs">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
              if (el && activeTab === tab.id) {
                // refが設定されたら位置を更新
                setTimeout(() => updateIndicator(), 0);
              }
            }}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-4 px-1 font-medium text-sm transition-colors relative
              ${index > 0 ? 'ml-8' : ''}
              ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
        {/* アニメーションする下線 */}
        {indicatorStyle.width > 0 && (
          <div
            className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}
      </nav>
    </div>
  );
}
