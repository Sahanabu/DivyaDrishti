export function LoadingState() {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading sensor data...</p>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-center h-40">
      <div className="text-center">
        <p className="text-red-400 text-sm mb-2">⚠ {message || 'Failed to load data'}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-blue-400 hover:underline">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
