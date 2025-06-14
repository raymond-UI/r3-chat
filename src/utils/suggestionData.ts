import { Sparkles, Search, Code, BookOpen } from "lucide-react";
export type TabId = "create" | "explore" | "code" | "learn";

interface Suggestion {
  id: string;
  text: string;
  description?: string;
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
        description: "Generate an engaging narrative",
      },
      {
        id: "2",
        text: "Create a marketing plan for a tech startup",
        description: "Business strategy and planning",
      },
      {
        id: "3",
        text: "Design a workout routine for beginners",
        description: "Health and fitness planning",
      },
      {
        id: "4",
        text: "Generate ideas for a mobile app",
        description: "Innovation and brainstorming",
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
        description: "Computer science concepts",
      },
      {
        id: "6",
        text: "What are the implications of quantum computing?",
        description: "Future technology exploration",
      },
      {
        id: "7",
        text: "How do neural networks actually work?",
        description: "AI and machine learning",
      },
      {
        id: "8",
        text: "Are black holes real?",
        description: "Space and physics",
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
        description: "Programming tutorial",
      },
      {
        id: "10",
        text: "Build a REST API with Node.js and Express",
        description: "Backend development",
      },
      {
        id: "11",
        text: "Optimize React app performance",
        description: "Frontend optimization",
      },
      {
        id: "12",
        text: "Database design best practices",
        description: "Data architecture",
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
        description: "Technology economics",
      },
      {
        id: "14",
        text: "How to improve critical thinking skills",
        description: "Personal development",
      },
      {
        id: "15",
        text: "Understanding cryptocurrency and blockchain",
        description: "Financial technology",
      },
      {
        id: "16",
        text: "The psychology of decision making",
        description: "Behavioral science",
      },
    ],
  },
];
