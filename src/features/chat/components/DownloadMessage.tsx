import { ChevronRight } from "lucide-react";
import { Message } from "..";

type DownloadMessageProps = {
  message: Message;
  onDownload: (entry: any) => void;
};

const DownloadMessage = ({ message, onDownload }: DownloadMessageProps) => {
  return (
    <div className="m-0">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        Available Downloads
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.isArray(message.entries) &&
          message.entries.map((entry) => (
            <button
              key={entry.key}
              onClick={() => onDownload(entry)}
              className="group flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 hover:bg-amber-50/50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <span className="flex items-center gap-3 font-medium">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 group-hover:scale-110 transition-transform duration-200">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                  </svg>
                </div>
                {entry.label}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
      </div>
    </div>
  );
};

export default DownloadMessage;
