export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated mic icon */}
        <div className="relative">
          <div className="text-5xl animate-bounce">🎤</div>
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 animate-ping" />
          </div>
        </div>

        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-purple-500 rounded-full animate-spin" />

        {/* Text */}
        <p className="text-lg text-zinc-400 font-medium tracking-wide">
          Завантаження...
        </p>
      </div>
    </div>
  );
}
