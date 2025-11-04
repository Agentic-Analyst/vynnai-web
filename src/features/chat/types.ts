export type Message = {
  role: "user" | "assistant";
  kind?: string;
  content: string;
  timestamp?: string;
  [k: string]: any;
};

export type Conversation = {
  id: number;
  title: string;
  messages: Message[];
  activeJobId?: string | null;
  isStreaming?: boolean;
  jobProgress?: string | null;
};
