import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
    </div>
  );
}
