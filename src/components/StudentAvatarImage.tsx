import { AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof AvatarImage>, "src"> & {
  avatarUrl: string | null | undefined;
};

/**
 * Drop-in replacement for AvatarImage that handles signed URLs
 * for the private student-avatars bucket.
 */
export const StudentAvatarImage = ({ avatarUrl, ...props }: Props) => {
  const signedUrl = useAvatarUrl(avatarUrl);
  return <AvatarImage src={signedUrl || ""} {...props} />;
};
