import { WELCOME_MESSAGE_CONTENT } from "./constants";

export const createWelcomeMessage = () => ({
  role: "assistant",
  content: WELCOME_MESSAGE_CONTENT,
  timestamp: new Date().toISOString(),
});
