import { Sparkles, Search, Code, BookOpen } from "lucide-react";
export type TabId = "create" | "explore" | "code" | "learn";

interface Suggestion {
  id: string;
  text: string;
}

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  suggestions: Suggestion[];
}

export const tabs: Tab[] = [
  {
    id: "create",
    label: "Create",
    icon: Sparkles,
    suggestions: [
      {
        id: "1",
        text: "Write a creative story about time travel",
      },
      {
        id: "2",
        text: "Create a marketing plan for a tech startup",
      },
      {
        id: "3",
        text: "Design a workout routine for beginners",
      },
      {
        id: "4",
        text: "Generate ideas for a mobile app",
      },
    ],
  },
  {
    id: "explore",
    label: "Explore",
    icon: Search,
    suggestions: [
      {
        id: "5",
        text: "Explain the CAP theorem in distributed systems",
      },
      {
        id: "6",
        text: "What are the implications of quantum computing?",
      },
      {
        id: "7",
        text: "How do neural networks actually work?",
      },
      {
        id: "8",
        text: "Are black holes real?",
      },
    ],
  },
  {
    id: "code",
    label: "Code",
    icon: Code,
    suggestions: [
      {
        id: "9",
        text: "Beginner's guide to TypeScript",
      },
      {
        id: "10",
        text: "Build a REST API with Node.js and Express",
      },
      {
        id: "11",
        text: "Optimize React app performance",
      },
      {
        id: "12",
        text: "Database design best practices", 
      },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: BookOpen,
    suggestions: [
      {
        id: "13",
        text: "Why is AI so expensive?",
      },
      {
        id: "14",
        text: "How to improve critical thinking skills",
      },
      {
        id: "15",
        text: "Understanding cryptocurrency and blockchain",
      },
      {
        id: "16",
        text: "The psychology of decision making",
      },
    ],
  },
];
