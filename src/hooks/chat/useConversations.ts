import { Conversation, Message } from "@/features/chat";
import { useCallback, useEffect, useState } from "react";
import { userStorage } from "@/lib/userStorage";
import { createWelcomeMessage } from "@/pages/chat/utils";

export function useConversations(initialIndex = 0) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = userStorage.getJSON("conversations");
    if (saved) {
      return saved.map((c: any) => ({
        ...c,
        activeJobId: c.activeJobId || null,
        isStreaming: c.isStreaming || false,
        jobProgress: c.jobProgress || null,
      }));
    }
    return [
      {
        id: Date.now(),
        title: "New Analysis",
        messages: [createWelcomeMessage()],
        activeJobId: null,
        isStreaming: false,
        jobProgress: null,
      },
    ];
  });

  const [currentConversationIndex, setCurrentConversationIndex] =
    useState<number>(initialIndex);

  // persist
  useEffect(() => {
    if (userStorage.hasUser()) {
      userStorage.setJSON("conversations", conversations);
    }
  }, [conversations]);

  const addMessage = useCallback(
    (msg: Message, convIndex = currentConversationIndex) => {
      setConversations((prev) => {
        const next = [...prev];
        const convo = next[convIndex] ?? {
          id: Date.now(),
          title: "New Analysis",
          messages: [],
        };
        convo.messages = [
          ...(convo.messages || []),
          { ...msg, timestamp: new Date().toISOString() },
        ];
        next[convIndex] = convo;
        return next;
      });
    },
    [currentConversationIndex]
  );

  const updateConversation = useCallback(
    (idx: number, patch: Partial<Conversation>) => {
      setConversations((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    },
    []
  );

  const startNewConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: Date.now(),
      title: "New Analysis",
      messages: [createWelcomeMessage()],
      activeJobId: null,
      isStreaming: false,
      jobProgress: null,
    };
    setConversations((prev) => [...prev, newConversation]);
    setCurrentConversationIndex((prev) => prev + 1);
  }, []);

  const deleteConversation = useCallback(
    (id: number, opts?: { preserveIndex?: boolean }) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === id);
        if (idx === -1) return prev;

        const next = prev.filter((c) => c.id !== id);

        // fallback: always keep at least one chat
        const finalList = next.length
          ? next
          : [
              {
                id: Date.now(),
                title: "New Analysis",
                messages: [createWelcomeMessage()],
                activeJobId: null,
                isStreaming: false,
                jobProgress: null,
              },
            ];

        // Only update the currentConversationIndex here if caller has not asked to preserve it.
        if (!opts?.preserveIndex) {
          // default behavior: select index 0 (you can change this logic if you prefer)
          setCurrentConversationIndex(0);
        }

        return finalList;
      });
    },
    []
  );

  return {
    conversations,
    currentConversationIndex,
    setCurrentConversationIndex,
    addMessage,
    updateConversation,
    startNewConversation,
    deleteConversation,
    setConversations, // keep for complex migrations
  };
}
