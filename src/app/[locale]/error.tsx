"use client";

import { useEffect } from "react";

/**
 * このセグメント以下のクライアント／サーバーコンポーネントで未捕捉エラーが出たときに表示する。
 * （レイアウト内の兄弟コンポーネントのエラーはここでは拾えない）
 */
export default function LocaleSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[locale segment error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16">
      <h2 className="text-xl font-black text-navy-secondary mb-2 text-center">
        表示できませんでした
      </h2>
      <p className="text-slate-500 text-sm mb-8 text-center max-w-md leading-relaxed">
        一時的な不具合や通信の問題の可能性があります。しばらくしてからもう一度お試しください。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-8 py-3.5 bg-navy-primary text-white rounded-xl font-bold hover:bg-navy-secondary transition-colors shadow-lg shadow-navy-primary/20"
      >
        再読み込み
      </button>
    </div>
  );
}
