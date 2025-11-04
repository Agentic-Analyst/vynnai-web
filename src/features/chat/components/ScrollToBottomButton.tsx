import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

type ScrollToBottomButtonProps = {
  scrollToBottom: () => void;
  unreadMessages?: number;
};

const ScrollToBottomButton = ({
  scrollToBottom,
  unreadMessages = 0,
}: ScrollToBottomButtonProps) => {
  return (
    <div className="absolute bottom-4 right-4 z-50 opacity-100 transform transition-all duration-300 ease-in-out">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={scrollToBottom}
            variant="default"
            size="default"
            className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white border-2 border-white transition-all duration-200 hover:scale-105 relative group"
          >
            <ArrowDown className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>
            {unreadMessages > 0
              ? `${unreadMessages} new message${unreadMessages > 1 ? "s" : ""}`
              : "Scroll to bottom"}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default ScrollToBottomButton;
