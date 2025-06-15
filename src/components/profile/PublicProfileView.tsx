"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ExternalLink,
  Github,
  Linkedin,
  Share,
  Twitter
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Separator } from "../ui/separator";
import { ShareProfileDialog } from "./ShareProfileDialog";

interface PublicProfileViewProps {
  username: string;
}

// Type for social links with proper validation
interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

// URL validation utility
const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

// Social link validation with domain checking
const validateSocialLink = (platform: string, url: string): boolean => {
  if (!isValidUrl(url)) return false;

  const parsedUrl = new URL(url);
  const allowedDomains: Record<string, string[]> = {
    github: ["github.com", "www.github.com"],
    twitter: ["twitter.com", "www.twitter.com", "x.com", "www.x.com"],
    linkedin: ["linkedin.com", "www.linkedin.com"],
  };

  if (platform in allowedDomains) {
    return allowedDomains[platform].includes(parsedUrl.hostname.toLowerCase());
  }

  return true; // Allow any domain for website
};

// Sanitize display text to prevent XSS
const sanitizeText = (text: string): string => {
  return text.replace(/[<>]/g, "");
};

export function PublicProfileView({ username }: PublicProfileViewProps) {
  const { user: currentUser } = useUser();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const viewRecordedRef = useRef(false);

  const profile = useQuery(api.userProfiles.getProfileBySlug, {
    slug: username,
  });
  const recordView = useMutation(api.userProfiles.recordProfileView);

  // Memoized computed values
  const isOwnProfile = useMemo(
    () => currentUser?.id === profile?.userId,
    [currentUser?.id, profile?.userId]
  );

  const displayName = useMemo(
    () =>
      profile ? sanitizeText(profile.displayName || profile.username) : "",
    [profile]
  );

  const avatarUrl = useMemo(
    () => profile?.avatar || currentUser?.imageUrl,
    [profile?.avatar, currentUser?.imageUrl]
  );

  // Optimized profile view recording with proper error handling
  useEffect(() => {
    let isMounted = true;

    const recordProfileView = async () => {
      if (!profile || !currentUser || viewRecordedRef.current) return;
      if (currentUser.id === profile.userId) return; // Don't record own views

      try {
        viewRecordedRef.current = true;
        await recordView({
          profileUserId: profile.userId,
          ipAddress: undefined, // Server should handle IP detection
          userAgent: navigator.userAgent.slice(0, 500), // Limit length
        });
      } catch (error) {
        viewRecordedRef.current = false; // Reset on error to allow retry
        console.error("Failed to record profile view:", error);
      }
    };

    if (isMounted && profile && currentUser) {
      recordProfileView();
    }

    return () => {
      isMounted = false;
    };
  }, [profile, currentUser, recordView]);

  // Open share dialog handler
  const handleShare = useCallback(() => {
    if (!profile) return;
    setShowShareDialog(true);
  }, [profile]);

  // Loading state
  if (profile === undefined) {
    return <ProfileSkeleton />;
  }

  // Not found state
  if (profile === null) {
    return <ProfileNotFound username={username} />;
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border mb-8 w-full bg-dot">
      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Avatar Section */}
        <div className="flex gap-4 w-full">
          {/* Profile Info */}
          <div className="flex-1 flex flex-col w-full">
            <div className="flex items-center gap-4 border-b border-border p-4">
              <Avatar className="w-14 h-14">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={`${displayName}'s avatar`}
                    loading="lazy"
                  />
                ) : (
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {displayName}
                </h1>
                {/* Role */}
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <p>@{sanitizeText(profile.username)}</p>
                  <Separator orientation="vertical" />
                  {profile.role && (
                    <p className="leading-relaxed">
                      {sanitizeText(profile.role)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 p-2">
              {profile.socialLinks && (
                <div className="w-full flex flex-col gap-2 p-2">
                  {/* Social Links */}
                  <SocialLinksSection socialLinks={profile.socialLinks} />
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 p-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Share className="w-4 h-4" aria-hidden="true" />
                  Share Profile
                </Button>

                {isOwnProfile && (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <a href="/profile/edit">Edit Profile</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShareDialog && (
        <ShareProfileDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          profile={profile}
        />
      )}
    </div>
  );
}

// Extracted social links component for better organization and reusability
function SocialLinksSection({ socialLinks }: { socialLinks: SocialLinks }) {
  const validatedLinks = useMemo(() => {
    const links: Array<{
      platform: string;
      url: string;
      icon: React.ReactNode;
      label: string;
    }> = [];

    if (
      socialLinks.github &&
      validateSocialLink("github", socialLinks.github)
    ) {
      links.push({
        platform: "github",
        url: socialLinks.github,
        icon: <Github className="w-4 h-4" aria-hidden="true" />,
        label: "GitHub",
      });
    }

    if (
      socialLinks.twitter &&
      validateSocialLink("twitter", socialLinks.twitter)
    ) {
      links.push({
        platform: "twitter",
        url: socialLinks.twitter,
        icon: <Twitter className="w-4 h-4" aria-hidden="true" />,
        label: "Twitter",
      });
    }

    if (
      socialLinks.linkedin &&
      validateSocialLink("linkedin", socialLinks.linkedin)
    ) {
      links.push({
        platform: "linkedin",
        url: socialLinks.linkedin,
        icon: <Linkedin className="w-4 h-4" aria-hidden="true" />,
        label: "LinkedIn",
      });
    }

    if (
      socialLinks.website &&
      validateSocialLink("website", socialLinks.website)
    ) {
      links.push({
        platform: "website",
        url: socialLinks.website,
        icon: <ExternalLink className="w-4 h-4" aria-hidden="true" />,
        label: "Website",
      });
    }

    return links;
  }, [socialLinks]);

  if (validatedLinks.length === 0) return null;

  return (
    <div className="flex flex-row gap-3 w-full">
      {validatedLinks.map(({ platform, url, icon, label }) => (
        <Button key={platform} variant="outline" size="sm" asChild>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            aria-label={`Visit ${label} profile`}
          >
            {icon}
          </a>
        </Button>
      ))}
    </div>
  );
}

// Optimized skeleton with better accessibility
function ProfileSkeleton() {
  return (
    <div
      className="bg-card rounded-xl shadow-sm border border-border p-8 mb-8"
      role="status"
      aria-label="Loading profile"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-32 h-32 bg-muted rounded-full animate-pulse" />
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-96 animate-pulse" />
          <div className="h-4 bg-muted rounded w-80 animate-pulse" />
        </div>
      </div>
      <span className="sr-only">Loading profile information...</span>
    </div>
  );
}

// Improved not found component with better UX
function ProfileNotFound({ username }: { username: string }) {
  const sanitizedUsername = sanitizeText(username);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-8 mb-8 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-foreground">
          Profile Not Found
        </h1>
        <p className="text-muted-foreground">
          The profile &quot;@{sanitizedUsername}&quot; doesn&apos;t exist or is
          not public.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
