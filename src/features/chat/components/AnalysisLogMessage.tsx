import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle, // Import the "complete" icon
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import ScrollToBottomButton from "./ScrollToBottomButton";
import { Message } from "..";

type AnalysisLogMessageProps = {
  message: Message;
  index: number;
  isCollapsed: boolean;
  toggleCollapse: (index: number) => void;
  isStreaming: boolean;
};

const AnalysisLogMessage = memo(
  ({
    message,
    index,
    isCollapsed,
    toggleCollapse,
    isStreaming,
  }: AnalysisLogMessageProps) => {
    const scrollRef = useRef(null);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

    const scrollToBottom = () => {
      const element = scrollRef.current;
      if (element) {
        const element = scrollRef.current;
        element.scrollTop = element.scrollHeight;
      }
    };

    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const tolerance = 5;
        if (scrollHeight - scrollTop > clientHeight + tolerance) {
          setAutoScrollEnabled(false);
        } else {
          setAutoScrollEnabled(true);
        }
      }
    };

    useEffect(() => {
      if (isStreaming && autoScrollEnabled && scrollRef.current) {
        scrollToBottom();
      }
    }, [message.logLines, isStreaming, autoScrollEnabled]);

    const { nlSummary, logLines = [] } = message;

    const StatusIcon = isStreaming ? Loader2 : CheckCircle;
    const iconColor = isStreaming ? "text-primary" : "text-green-500";
    const hasLogs = logLines && logLines.length > 0;

    return (
      <div className="my-2">
        {/* NL Summary - Modern chat message style */}
        {nlSummary && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <StatusIcon
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor} ${
                  isStreaming ? "animate-spin" : ""
                }`}
              />
              <div className="flex-1 text-base text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {nlSummary}
              </div>
            </div>
          </div>
        )}

        {/* Technical Logs - Collapsible, subtle design */}
        {hasLogs && (
          <div className="mt-2">
            <Collapsible
              open={!isCollapsed}
              onOpenChange={() => toggleCollapse(index)}
            >
              {/* Collapsible Trigger */}
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  {isCollapsed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  <span>{logLines.length} technical log lines</span>
                </button>
              </CollapsibleTrigger>

              {/* Collapsible Content (The Logs) */}
              <CollapsibleContent asChild>
                <div className="relative mt-2">
                  <div
                    className="max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                    ref={scrollRef}
                    onScroll={handleScroll}
                  >
                    <pre className="text-xs font-mono whitespace-pre-wrap p-3 text-slate-600 dark:text-slate-400">
                      {logLines.join("\n")}
                    </pre>
                  </div>
                  {autoScrollEnabled ? null : (
                    <ScrollToBottomButton scrollToBottom={scrollToBottom} />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    );
  }
);

export default AnalysisLogMessage;
