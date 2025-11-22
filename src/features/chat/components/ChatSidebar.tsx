import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { KeyboardEvent, useEffect, useState } from "react";
import { Conversation } from "..";

type ChatSidebarProps = {
  isSidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  activeConversationId: string | number | null;
  renamingId: string | number | null;
  renameValue: string;
  onRenameValueChange: (newValue: string) => void;
  onStartNewConversation: () => void;
  onSwitchConversation: (id: string | number) => void;
  onStartRename: (id: string | number, currentTitle: string) => void;
  onCommitRename: (id: string | number, newName: string) => void;
  onCancelRename: () => void;
  onDeleteConversation: (id: string | number) => void;
};

const ChatSidebar = ({
  isSidebarOpen,
  onSidebarOpenChange,
  conversations,
  activeConversationId,
  renamingId,
  renameValue,
  onRenameValueChange,
  onStartNewConversation,
  onSwitchConversation,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDeleteConversation,
}: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredConversations, setFilteredConversations] = useState(
    conversations.filter((c) => !c.isDraft)
  );

  useEffect(() => {
    setFilteredConversations(
      conversations
        .filter((c) => !c.isDraft)
        // Sort by lastUsedAt in descending order (most recent first)
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .map((c, idx) => ({ ...c, _index: idx }))
        .filter((c) =>
          (c.title || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
  }, [searchQuery, conversations]);

  // Helper to handle renaming form submission
  const handleRenameSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    id: string | number
  ) => {
    e.preventDefault();
    const trimmedValue = (renameValue || "").trim();
    if (trimmedValue) {
      onCommitRename(id, trimmedValue);
    } else {
      onCancelRename();
    }
  };

  // Helper to handle key down for renaming input (e.g., Escape to cancel)
  const handleRenameKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    id: string | number
  ) => {
    if (e.key === "Escape") {
      onCancelRename(); // Trigger parent's cancel function
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <Collapsible
      open={isSidebarOpen}
      onOpenChange={onSidebarOpenChange}
      className="bg-white/80 dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-800 h-full relative backdrop-blur-xl transition-colors duration-300"
    >
      <CollapsibleContent className="w-64 p-4 h-full flex flex-col">
        {/* New Conversation Button */}
        <Button onClick={onStartNewConversation} className="w-full mb-4 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white border-none shadow-md shadow-amber-500/20 dark:shadow-amber-900/20">
          {/* Use parent's handler */}
          <PlusCircle className="mr-2 h-4 w-4" /> New Analysis
        </Button>

        {/* Search Input */}
        <div className="relative mb-4">
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-500 focus-visible:ring-amber-500/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-auto space-y-1 pr-1 custom-scrollbar">
          {filteredConversations.map((c) => {
            const isActive = activeConversationId === c.id;
            const isEditing = renamingId === c.id;

            return (
              <div key={c.id} className="group relative">
                {isEditing ? (
                  // Rename Input Form
                  <form
                    onSubmit={(e) => handleRenameSubmit(e, c.id)}
                    className="flex items-center gap-2 mb-1"
                  >
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => onRenameValueChange(e.target.value)}
                      onBlur={() =>
                        onCommitRename(c.id, (renameValue || "").trim())
                      }
                      onKeyDown={(e) => handleRenameKeyDown(e, c.id)}
                      className="h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Save
                    </Button>
                  </form>
                ) : (
                  // Conversation Item and Actions
                  <>
                    <Button
                      onClick={() => onSwitchConversation(c.id)}
                      variant="ghost"
                      className={`w-full justify-start pr-9 truncate transition-all duration-200 ${
                        isActive 
                          ? "bg-amber-50 dark:bg-slate-800/80 text-amber-700 dark:text-amber-400 font-medium border-l-2 border-amber-500 pl-3 shadow-sm" 
                          : "text-slate-700 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate">{c.title}</span>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity"
                          aria-label="Chat actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        side="right"
                        className="w-44 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <DropdownMenuItem
                          onClick={() => onStartRename(c.id, c.title)}
                          className="flex items-center gap-2 focus:bg-slate-100 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
                        <DropdownMenuItem
                          onClick={() => onDeleteConversation(c.id)}
                          className="flex items-center gap-2 text-red-500 dark:text-red-400 focus:text-red-600 dark:focus:text-red-300 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-4 ${
            isSidebarOpen ? "left-64" : "left-0"
          } transition-all duration-300 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50`}
        >
          {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
};

export default ChatSidebar;
