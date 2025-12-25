import { useEffect, useRef, useState } from 'react';
import type React from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
}

export default function Tabs({ activeTab, onTabChange, tabs, showHomeButton = false, onHomeClick, showSettingsButton = false, onSettingsClick }: TabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const homeButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const updateIndicator = () => {
    if (activeTab === 'settings' && settingsButtonRef.current && containerRef.current) {
      // 設定タブがアクティブのとき、歯車アイコンの位置を計算
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = settingsButtonRef.current.getBoundingClientRect();
      const left = buttonRect.left - containerRect.left;
      const width = buttonRect.width;
      
      setIndicatorStyle({
        left: left,
        width: width,
      });
    } else if (activeTab === 'dashboard' && homeButtonRef.current && containerRef.current) {
      // ダッシュボードタブがアクティブのとき、ホームアイコンの位置を計算
      const containerRect = containerRef.current.getBoundingClientRect();
      const buttonRect = homeButtonRef.current.getBoundingClientRect();
      const left = buttonRect.left - containerRect.left;
      const width = buttonRect.width;
      
      setIndicatorStyle({
        left: left,
        width: width,
      });
    } else {
      // 通常のタブがアクティブのとき
      const activeTabElement = tabRefs.current[activeTab];
      
      if (activeTabElement) {
        // offsetLeftとoffsetWidthを使用（親要素からの相対位置）
        const left = activeTabElement.offsetLeft;
        const width = activeTabElement.offsetWidth;
        
        setIndicatorStyle({
          left: left,
          width: width,
        });
      } else {
        // アクティブなタブが見つからない場合はインジケータを非表示
        setIndicatorStyle({ left: 0, width: 0 });
      }
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
    <div className="flex-1" ref={containerRef}>
      <nav ref={navRef} className="flex relative items-center" aria-label="Tabs">
        {showHomeButton && (
          <button
            ref={homeButtonRef}
            onClick={onHomeClick}
            className={`p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors mr-8 ${
              activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : ''
            }`}
            title="ホーム"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        )}
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
        {showSettingsButton && (
          <div className="ml-auto">
            <button
              ref={settingsButtonRef}
              onClick={onSettingsClick}
              className={`p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : ''
              }`}
              title="設定"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        )}
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
