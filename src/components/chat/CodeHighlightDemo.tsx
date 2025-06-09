"use client";

import { MarkdownRenderer } from "./MarkdownRenderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sampleMarkdown = `
# Code Highlighting Demo

Here are some examples of our beautiful syntax highlighting:

## TypeScript/JavaScript
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email?: string;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

// React component example
const UserCard: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};
\`\`\`

## Python
\`\`\`python
from typing import Optional, List
import asyncio

class ChatBot:
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.conversation_history: List[dict] = []
    
    async def send_message(self, message: str) -> str:
        """Send a message and get AI response"""
        self.conversation_history.append({
            "role": "user", 
            "content": message
        })
        
        # Simulate API call
        response = await self._call_ai_api()
        self.conversation_history.append({
            "role": "assistant",
            "content": response
        })
        
        return response
    
    async def _call_ai_api(self) -> str:
        await asyncio.sleep(0.1)  # Simulate network delay
        return "Hello! I'm your AI assistant."
\`\`\`

## SQL
\`\`\`sql
-- Complex query with joins and aggregations
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(c.id) as conversation_count,
    MAX(c.updated_at) as last_activity,
    COALESCE(SUM(m.word_count), 0) as total_words
FROM users u
LEFT JOIN conversations c ON u.id = c.user_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE u.created_at >= '2024-01-01'
    AND u.status = 'active'
GROUP BY u.id, u.name, u.email
HAVING COUNT(c.id) > 0
ORDER BY last_activity DESC
LIMIT 50;
\`\`\`

## Bash/Shell
\`\`\`bash
#!/bin/bash

# Deploy script with error handling
set -e

echo "🚀 Starting deployment..."

# Environment setup
export NODE_ENV=production
export DATABASE_URL=$PROD_DATABASE_URL

# Build the application
echo "📦 Building application..."
pnpm install --frozen-lockfile
pnpm build

# Run tests
echo "🧪 Running tests..."
pnpm test:ci

# Deploy to server
echo "🌐 Deploying to production..."
rsync -avz --delete dist/ user@server:/var/www/app/

# Restart services
ssh user@server "sudo systemctl restart nginx && sudo systemctl restart app"

echo "✅ Deployment completed successfully!"
\`\`\`

## Inline Code Examples

You can also use inline code like \`const message = "Hello World"\`, \`npm install react\`, or \`SELECT * FROM users\` within sentences.

**Features included:**
- ✅ Syntax highlighting for 20+ languages
- ✅ Copy-to-clipboard functionality  
- ✅ Line numbers
- ✅ Dark/light theme support
- ✅ Responsive design
- ✅ Beautiful hover states
`;

export function CodeHighlightDemo() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Code Highlighting System</CardTitle>
        <CardDescription>
          Showcasing beautiful syntax highlighting with copy functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MarkdownRenderer content={sampleMarkdown} />
      </CardContent>
    </Card>
  );
} 