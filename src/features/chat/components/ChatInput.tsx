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
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        placeholder="Ask me to analyze any stock or company."
        className="flex-grow rounded-xl h-12 text-base px-4"
        disabled={isInputDisabled}
      />
      <Button
        type="submit"
        disabled={isButtonDisabled}
        className={`rounded-xl h-12 px-6 ${
          isChatActive
            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
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
