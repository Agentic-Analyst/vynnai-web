import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChangeEvent, FormEvent } from "react";
import { Loader2, StopCircle } from "lucide-react";

type ChatInputProps = {
  onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  value: string;
  onChange: (newValue: string) => void;
  isInputDisabled: boolean;
  isButtonDisabled: boolean;
  isChatActive: boolean;
  isChatStopping: boolean;
};

const ChatInput = ({
  onSubmit,
  value,
  onChange,
  isInputDisabled = false,
  isButtonDisabled = false,
  isChatActive = false,
  isChatStopping = false,
}: ChatInputProps) => {
  return (
    <form onSubmit={onSubmit} className="flex gap-3">
      <Input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder="Ask me to analyze any stock or company."
        className="flex-grow rounded-xl h-14 text-base px-6 bg-slate-900/80 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500/50 shadow-inner"
        disabled={isInputDisabled}
      />
      <Button
        type="submit"
        disabled={isButtonDisabled}
        className={`rounded-xl h-14 px-8 font-medium tracking-wide transition-all duration-300 ${
          isChatActive
            ? "bg-gradient-to-r from-red-900/80 to-red-800 hover:from-red-800 hover:to-red-700 text-red-100 border border-red-700/50 shadow-lg shadow-red-900/20"
            : "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-900/20 border border-amber-500/20"
        }`}
      >
        {isChatActive ? (
          isChatStopping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Stopping...
            </>
          ) : (
            <>
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Analysis
            </>
          )
        ) : (
          "Analyze"
        )}
      </Button>
    </form>
  );
};

export default ChatInput;
