import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the file path from a stored avatar_url.
 * Handles both legacy full public URLs and new path-only values.
 */
function extractFilePath(avatarUrl: string): string {
  // If it's a full URL, extract the file name after the bucket path
  const publicPrefix = "/storage/v1/object/public/student-avatars/";
  const idx = avatarUrl.indexOf(publicPrefix);
  if (idx !== -1) {
    return avatarUrl.substring(idx + publicPrefix.length);
  }
  // Already a path-only value
  return avatarUrl;
}

/**
 * Returns a signed URL for a student avatar, valid for 1 hour.
 * Handles legacy public URLs and new path-only values.
 */
export function useAvatarUrl(avatarUrl: string | null | undefined): string | undefined {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!avatarUrl) {
      setSignedUrl(undefined);
      return;
    }

    const filePath = extractFilePath(avatarUrl);

    supabase.storage
      .from("student-avatars")
      .createSignedUrl(filePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) {
          // Fallback: try using the raw value (may be an external URL)
          setSignedUrl(avatarUrl);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [avatarUrl]);

  return signedUrl;
}
