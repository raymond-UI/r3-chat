"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Globe, 
  Star, 
  Eye, 
  Heart, 
  MessageSquare, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export function ProfileDemo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full">
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">New Feature</span>
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Showcase Your AI Conversations
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create a public profile to share your most interesting AI conversations with the world. 
          Build your AI expertise portfolio and inspire others.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/profile/edit" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Create Your Profile
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <a href="/u/demo" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View Demo Profile
            </a>
          </Button>
        </div>
      </div>

      {/* Demo Profile Preview */}
      <Card className="border-2 border-gradient-to-r from-blue-200 to-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Example Public Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Profile Header Demo */}
          <div className="flex items-start gap-6 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">AI Enthusiast</h3>
              <p className="text-muted-foreground mb-2">@ai-explorer</p>
              <p className="text-sm leading-relaxed mb-3">
                Passionate about AI, machine learning, and creative problem-solving. 
                I love exploring new models and sharing interesting conversations.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>1,234 views</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>42 conversations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Conversations Demo */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Featured Conversations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Demo Conversation 1 */}
              <Card className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">Building a React Chat App</CardTitle>
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    A deep dive into creating a real-time chat application with React, WebSocket, and TypeScript...
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">coding</Badge>
                    <Badge variant="secondary" className="text-xs">react</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        156
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        23
                      </span>
                    </div>
                    <span>2 days ago</span>
                  </div>
                </CardContent>
              </Card>

              {/* Demo Conversation 2 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Creative Writing with AI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Exploring collaborative storytelling between humans and AI to create engaging narratives...
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">creative</Badge>
                    <Badge variant="secondary" className="text-xs">writing</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        89
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        12
                      </span>
                    </div>
                    <span>1 week ago</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-blue-500" />
              Public Showcase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share your best AI conversations with the world. Create a portfolio of your AI expertise and creativity.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-yellow-500" />
              Featured Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Highlight your most impressive conversations as featured content to grab visitors&apos; attention.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="w-5 h-5 text-red-500" />
              Community Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get likes, views, and engagement from other users. Build your reputation in the AI community.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-8">
          <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
          <p className="text-muted-foreground mb-4">
            Create your profile in minutes and start showcasing your AI conversations.
          </p>
          <Button asChild size="lg">
            <Link href="/profile/edit" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Create Profile Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 