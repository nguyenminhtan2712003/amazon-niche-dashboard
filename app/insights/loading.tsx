export default function Loading() {
  return (
    <div className="max-w-[1500px] mx-auto p-[18px]">
      <div className="bg-gradient-to-br from-[#101a35] via-[#131c3a] to-[#0d1726] border border-line rounded-xl shadow-card px-7 py-5 mb-4">
        <div className="h-7 w-72 rounded bg-card-2 animate-pulse" />
      </div>
      <div className="text-center text-[12px] text-muted py-4">
        <span className="inline-block w-2 h-2 mr-2 rounded-full bg-emerald-500 animate-pulse" />
        Loading 203K niches analysis…
      </div>
    </div>
  );
}
