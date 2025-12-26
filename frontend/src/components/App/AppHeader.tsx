interface AppHeaderProps {
  onHomeClick: () => void;
}

export default function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={onHomeClick}
            className="text-left hover:opacity-80 transition-opacity"
          >
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              CPA Dashboard
            </h1>
            <p className="text-gray-600">公認会計士の勉強進捗管理</p>
          </button>
        </div>
      </div>
    </header>
  );
}


