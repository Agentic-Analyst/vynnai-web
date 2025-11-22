import { LegacyRef, ReactNode } from "react";

type BubbleProps = {
  measureRef: LegacyRef<HTMLDivElement>;
  children: ReactNode;
  isUser: boolean;
};

const Bubble = ({ measureRef, children, isUser = false }: BubbleProps) => {
  return (
    <div
      ref={measureRef}
      className={[
        "inline-block max-w-[920px] break-words rounded-2xl",
        isUser
          ? // User bubble — keep gradient and ring
            "bg-gradient-to-br from-blue-700 to-indigo-900 text-white ring-1 ring-blue-500/30 shadow-lg shadow-blue-900/20"
          : // AI bubble — subtle glass effect in light mode, transparent in dark
            "bg-white/40 dark:bg-transparent text-slate-900 dark:text-slate-200 border border-white/50 dark:border-transparent shadow-sm dark:shadow-none backdrop-blur-[1px]",
      ].join(" ")}
    >
      <div className={`${isUser ? "p-3 sm:p-4 text-left" : "p-4 sm:p-5 text-left"}`}>{children}</div>
    </div>
  );
};

export default Bubble;
