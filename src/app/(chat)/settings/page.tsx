{
  /* Settings Page - page.tsx */
}
import { Metadata } from "next";
import { Suspense } from "react";

import { AiPreferences } from "@/components/settings/AiPreferences";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings - R3 Chat",
  description: "Configure your AI models and API keys",
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Settings
          </h1>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys & Models
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              AI Preferences
            </TabsTrigger>

          </TabsList>

          <TabsContent value="api-keys" className="space-y-6">
            <Suspense fallback={<div>Loading API key settings...</div>}>
              <ApiKeySettings />
            </Suspense>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Preferences</CardTitle>
                <CardDescription>
                  Customize your AI experience with default models and
                  optimization settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div>Loading AI preferences...</div>}>
                  <AiPreferences />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
