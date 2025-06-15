// app/sign-up/sso-callback
"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import LoadingSpinner from "@/components/loading-spinner";

export default function Page() {
  // Handle the redirect flow by calling the Clerk.handleRedirectCallback() method
  // or rendering the prebuilt <AuthenticateWithRedirectCallback/> component.
  // This is the final step in the custom OAuth flow.

  return (
    <div className="flex items-center justify-center p-4 h-screen">
      <div className="w-full max-w-md overflow-clip flex border bg-secondary border-border shadow-xl rounded-xl flex-col items-center justify-center">
        <div className="flex p-6 w-full rounded-md flex-col items-center justify-center bg-background border-b shadow-md">
          <LoadingSpinner />
          <h1 className="text-xl font-bold">Success!</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Completing sign in...
          </p>
        </div>
        <div className="p-4 font-bold text-muted-foreground text-sm">R3 Chat</div>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
