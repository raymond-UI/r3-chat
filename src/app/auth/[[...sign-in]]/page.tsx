// app/sign-in/page.tsx
"use client";
// import MmeziIcon from "@/components/layout/MmeziIcon";
import { Button } from "@/components/ui/button";
import { useSignIn } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  const { signIn } = useSignIn();

  if (!signIn) return null;

  const signInWith = (strategy: OAuthStrategy) => {
    return signIn
      .authenticateWithRedirect({
        strategy,
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: "/",
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err: unknown) => {
        console.log((err as { errors?: unknown }).errors);
        console.error(err, null, 2);
      });
  };

  return (
    <div className="flex gap-4 flex-col p-4 mt-28 sm:mt-0 items-center sm:justify-center h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md overflow-clip flex border bg-secondary border-border shadow-xl rounded-xl flex-col items-center justify-center">
        <div className="flex p-6 w-full rounded-md flex-col items-center justify-center bg-background border-b shadow-md">
          <h1 className="text-xl font-bold">Continue to R3 Chat</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back! Please sign in to continue.
          </p>
          <Button
            variant={"outline"}
            className="w-full mt-8"
            onClick={() => signInWith("oauth_google")}
          >
            <Image src="/googleicon.svg" alt="Google" width={16} height={16} />
            Continue with Google
          </Button>
          <Button
            variant={"secondary"}
            className="w-full mt-8"
            onClick={() => signInWith("oauth_github")}
          >
            <Image src="/githubicon.svg" alt="Github" width={16} height={16} />
            Continue with Github
          </Button>
        </div>
        {/* CAPTCHA Widget */}
        <div id="clerk-captcha"></div>

        <Link
          href="/"
          className="flex items-center gap-2 p-4 font-bold text-muted-foreground text-sm"
        >
          R3 Chat
          {/* <MmeziIcon size="lg" variant="animated" /> */}
        </Link>
      </div>
    </div>
  );
}
