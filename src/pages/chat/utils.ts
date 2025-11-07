import { Message } from "@/features/chat";
import { WELCOME_MESSAGE_CONTENT } from "./constants";

export const createWelcomeMessage: () => Message = () => ({
  role: "assistant",
  content: WELCOME_MESSAGE_CONTENT,
  timestamp: new Date().toISOString(),
});
