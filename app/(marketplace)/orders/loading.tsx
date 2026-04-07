export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-20">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-44 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-5 bg-gray-100 rounded w-1/4 mt-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
