import { MessageSquareIcon, BarChart3 } from "lucide-react";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Chat",
    to: "/chat",
    icon: <MessageSquareIcon className="h-4 w-4" />,
    page: <ChatPage />,
  },
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: <BarChart3 className="h-4 w-4" />,
    page: <DashboardPage />,
  },
];