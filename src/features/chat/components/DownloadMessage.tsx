import { ChevronRight } from "lucide-react";
import { Message } from "..";

type DownloadMessageProps = {
  message: Message;
  onDownload: (entry: any) => void;
};

const DownloadMessage = ({ message, onDownload }: DownloadMessageProps) => {
  return (
    <div className="m-0">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        Available Downloads
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Array.isArray(message.entries) &&
          message.entries.map((entry) => (
            <button
              key={entry.key}
              onClick={() => onDownload(entry)}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
                </svg>
                {entry.label}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
      </div>
    </div>
  );
};

export default DownloadMessage;
