interface SummaryCardsProps {
  totalHours: number;
  totalTodos: number;
  completedTodos: number;
  todayDueTodos: number;
}

export default function SummaryCards({ totalHours, totalTodos, completedTodos, todayDueTodos }: SummaryCardsProps) {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm mb-1">総学習時間</p>
            <p className="text-3xl font-bold text-gray-800">{totalHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-1">時間</p>
          </div>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">リマインダ</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <p className="text-gray-600 text-sm mb-1">今日が期限</p>
                  <p className="text-2xl font-bold text-gray-800">{todayDueTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                  <p className="text-gray-600 text-sm mb-1">総リマインダ数</p>
                  <p className="text-2xl font-bold text-gray-800">{totalTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">完了リマインダ数</p>
                  <p className="text-2xl font-bold text-gray-800">{completedTodos}</p>
                  <p className="text-gray-500 text-xs mt-1">件</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

