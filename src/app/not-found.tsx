import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Mic icon */}
        <div className="text-6xl mb-6">🎤</div>

        {/* 404 number with gradient */}
        <h1 className="text-[10rem] font-black leading-none bg-gradient-to-br from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent select-none">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-zinc-100 mt-4">
          Сторінку не знайдено
        </h2>
        <p className="text-zinc-400 mt-3 text-lg">
          Схоже, ця сторінка більше не існує або була переміщена.
        </p>

        {/* Primary button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 shadow-lg shadow-purple-500/25"
        >
          ← Повернутися на головну
        </Link>

        {/* Alternative links */}
        <div className="mt-8 text-zinc-500">
          <p className="mb-3">Або спробуйте:</p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/chat"
              className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
            >
              Чат
            </Link>
            <span className="text-zinc-700">•</span>
            <Link
              href="/upload"
              className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
            >
              Завантажити
            </Link>
            <span className="text-zinc-700">•</span>
            <Link
              href="/transcriptions"
              className="text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
            >
              Транскрипції
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
