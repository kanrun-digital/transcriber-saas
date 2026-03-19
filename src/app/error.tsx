"use client";

import Link from "next/link";
import { useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-zinc-100">
          Щось пішло не так
        </h1>
        <p className="text-zinc-400 mt-3 text-lg">
          Виникла непередбачена помилка. Спробуйте ще раз або поверніться на
          головну сторінку.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-500 hover:to-pink-500 transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            Спробувати знову
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-200"
          >
            На головну
          </Link>
        </div>

        {/* Collapsible error details */}
        <div className="mt-8">
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors underline underline-offset-4"
          >
            {showDetails ? "Сховати деталі" : "Показати деталі помилки"}
          </button>
          {showDetails && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left">
              <p className="text-sm text-zinc-400 font-mono break-all">
                <span className="text-red-400 font-semibold">
                  {error.name}:
                </span>{" "}
                {error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
