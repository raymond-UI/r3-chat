"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, MessageSquare, Share, Eye, Zap } from "lucide-react";

export function CollaborationFeatures() {
  const features = [
    {
      title: "Real-time Messaging",
      description: "Instant message synchronization across all users",
      icon: <Zap className="h-5 w-5" />,
      status: "completed",
      details: [
        "Live message updates via Convex subscriptions",
        "Optimistic updates for instant feel",
        "Message persistence and history"
      ]
    },
    {
      title: "User Presence & Typing",
      description: "See who's online and when they're typing",
      icon: <Eye className="h-5 w-5" />,
      status: "completed",
      details: [
        "Live typing indicators with user avatars",
        "Online/offline status tracking",
        "Auto-cleanup of stale presence data"
      ]
    },
    {
      title: "Participant Management",
      description: "Add and manage conversation participants",
      icon: <Users className="h-5 w-5" />,
      status: "completed",
      details: [
        "Participants list with online status",
        "Add users via email/ID input",
        "Visual participant count display"
      ]
    },
    {
      title: "Invite System",
      description: "Share conversations with instant join links",
      icon: <Share className="h-5 w-5" />,
      status: "completed",
      details: [
        "One-click invite link generation",
        "Join confirmation dialog with conversation preview",
        "Automatic conversation addition to user history"
      ]
    },
    {
      title: "Multi-user Chat Rooms",
      description: "Create and join collaborative chat rooms",
      icon: <MessageSquare className="h-5 w-5" />,
      status: "completed",
      details: [
        "Create collaborative vs standard chats",
        "Visual indicators for room types",
        "Room joining via invite links"
      ]
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          R3 Chat Collaboration Features
        </h2>
        <p className="text-muted-foreground">
          Powered by Convex for real-time, seamless collaboration
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </Badge>
              </div>
              <CardDescription className="mt-2">
                {feature.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feature.details.map((detail, detailIndex) => (
                  <li key={detailIndex} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{detail}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="border rounded-lg p-6 bg-muted/50">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          How to Test Collaborative Features
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium mb-2">Creating Collaborative Rooms:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click "Create Collaborative Room" on welcome screen</li>
              <li>Or create a new chat and mark it as collaborative</li>
              <li>See the Users icon indicating collaborative mode</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-2">Inviting Users:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click the participants count button in chat header</li>
              <li>Add users by email/ID or copy invite link</li>
              <li>Share the link for instant joining</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 