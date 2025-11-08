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
      <div className="my-3">
        {/* Natural Language Summary */}
        {nlSummary && (
          <div
            className={`
      group relative flex flex-col items-left text-left
      rounded-2xl px-4 py-3
      backdrop-blur-sm transition-colors
      bg-transparent
    `}
          >
            <div className="text-left">{nlSummary}</div>
          </div>
        )}

        {/* Technical Logs - collapsible */}
        {hasLogs && (
          <div className="mt-2">
            <Collapsible
              open={!isCollapsed}
              onOpenChange={() => toggleCollapse(index)}
            >
              {/* Trigger */}
              <CollapsibleTrigger asChild>
                <button
                  className={`
                    flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 
                    hover:text-slate-700 dark:hover:text-slate-200 transition-colors 
                    px-2 py-1.5 rounded-lg 
                    hover:bg-black/[0.05] dark:hover:bg-white/[0.05]
                  `}
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  <span>{logLines.length} technical log lines</span>
                  <div className="flex gap-2 items-center">
                    <StatusIcon
                      className={`h-4 w-4 text-blue-500 ${
                        isStreaming ? "animate-spin" : ""
                      } `}
                    />
                    <span className="text-xs text-slate-500 uppercase tracking-wide">
                      {isStreaming ? "Analyzing" : "Analysis Completed"}
                    </span>
                  </div>
                </button>
              </CollapsibleTrigger>

              {/* Content */}
              <CollapsibleContent asChild>
                <div className="relative mt-2">
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className={`
                      max-h-60 overflow-y-auto
                      bg-transparent
                      rounded-xl border border-slate-200/40 dark:border-slate-700/40 
                      backdrop-blur-sm
                    `}
                  >
                    <pre
                      className={`
                        text-xs font-mono whitespace-pre-wrap p-3 
                        text-slate-600 dark:text-slate-400
                      `}
                    >
                      {logLines.join("\n")}
                    </pre>
                  </div>
                  {!autoScrollEnabled && (
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
