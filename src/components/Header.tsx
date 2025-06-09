"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { Button } from "./ui/button";

export default function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <header className="flex justify-between items-center p-2 px-4 bg-secondary/50">
      <Link href="/" className="text-2xl font-bold">
        R3 chat
      </Link>
      {isLoading ? (
        <div className="size-8 bg-primary/50 rounded-full animate-pulse" />
      ) : isAuthenticated ? (
        <UserButton />
      ) : (
        <Button variant="outline" asChild>
          <SignInButton />
        </Button>
      )}
    </header>
  );
}
