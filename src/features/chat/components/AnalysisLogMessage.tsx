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

    return (
      <div className="bg-muted dark:bg-muted/50 p-4 rounded-lg my-2 border border-border">
        <Collapsible
          open={!isCollapsed}
          onOpenChange={() => toggleCollapse(index)}
        >
          {/* 1. NL Summary, Status Icon, and Toggle Button */}
          <div className="flex justify-between items-center w-full">
            {/* Left side: Icon + Summary */}
            <div className="flex items-center gap-3">
              <StatusIcon
                className={`h-4 w-4 ${iconColor} ${
                  isStreaming ? "animate-spin" : ""
                }`}
              />
              <span className="font-medium text-sm text-foreground">
                {nlSummary}
              </span>
            </div>

            {/* Right side: Toggle Button */}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle logs</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* 2. Collapsible Content (The Logs) */}
          <CollapsibleContent asChild>
            <div className="relative">
              <div
                className="mt-3 pt-3 border-t border-border max-h-60 overflow-y-auto"
                ref={scrollRef}
                onScroll={handleScroll}
              >
                <pre className="text-xs font-mono whitespace-pre-wrap bg-background dark:bg-secondary p-3 rounded-md text-muted-foreground">
                  {logLines.join("\n")}
                </pre>
              </div>
              {autoScrollEnabled ? null : (
                <ScrollToBottomButton scrollToBottom={scrollToBottom} />
              )}
            </div>
          </CollapsibleContent>
          {/* Footer */}
          <div className="text-xs text-right text-muted-foreground pt-2">
            {logLines.length} log lines
          </div>
        </Collapsible>
      </div>
    );
  }
);

export default AnalysisLogMessage;
