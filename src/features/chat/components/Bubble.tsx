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
            "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-1 ring-blue-700/30 shadow-sm"
          : // AI bubble — transparent, no ring or shadow
            "bg-transparent text-slate-800 dark:text-slate-100",
      ].join(" ")}
    >
      <div className={isUser ? "p-3 sm:p-4" : "p-4 sm:p-5"}>{children}</div>
    </div>
  );
};

export default Bubble;
