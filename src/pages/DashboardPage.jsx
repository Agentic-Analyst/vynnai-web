import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";

const DashboardPage = () => {
  // Mock data for demonstration
  const stats = [
    {
      title: "Total Conversations",
      value: "1,234",
      change: "+20.1%",
      icon: MessageSquare,
      description: "Conversations this month"
    },
    {
      title: "Active Users",
      value: "573",
      change: "+12.5%",
      icon: Users,
      description: "Users this week"
    },
    {
      title: "Response Time",
      value: "2.4s",
      change: "-5.2%",
      icon: TrendingUp,
      description: "Average response time"
    },
    {
      title: "API Calls",
      value: "8,921",
      change: "+18.7%",
      icon: Calendar,
      description: "Calls this month"
    }
  ];

  const recentActivity = [
    { time: "2 hours ago", action: "New conversation started", user: "User #1234" },
    { time: "4 hours ago", action: "API key updated", user: "Admin" },
    { time: "6 hours ago", action: "System message modified", user: "User #5678" },
    { time: "8 hours ago", action: "Conversation exported", user: "User #9012" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI chat application performance and usage</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={stat.change.startsWith('+') ? "default" : "secondary"} className="text-xs">
                      {stat.change}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions in your application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.user}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <h4 className="font-medium text-foreground">Export Conversations</h4>
                  <p className="text-sm text-muted-foreground">Download your chat history</p>
                </div>
                <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <h4 className="font-medium text-foreground">API Settings</h4>
                  <p className="text-sm text-muted-foreground">Manage your API configuration</p>
                </div>
                <div className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <h4 className="font-medium text-foreground">Usage Analytics</h4>
                  <p className="text-sm text-muted-foreground">View detailed usage reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;