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
        "inline-block max-w-[920px] break-words",
        "rounded-2xl shadow-sm ring-1",
        isUser
          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-blue-700/30"
          : "bg-white text-slate-800 ring-slate-200",
      ].join(" ")}
    >
      <div className={isUser ? "p-3 sm:p-4" : "p-4 sm:p-5"}>{children}</div>
    </div>
  );
};

export default Bubble;
