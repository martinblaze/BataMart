export default function MostBoughtLoading() {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-4 animate-pulse">
          <div className="h-7 bg-gray-100 rounded w-56 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-72" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
