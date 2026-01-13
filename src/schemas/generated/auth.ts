import { z } from 'zod';

// User profile response from /internal/auth/me
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  username: z.string().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  githubUsername: z.string().nullable(),
  githubLinked: z.boolean(),
  verified: z.boolean(),
  publishedBundles: z.number(),
  totalDownloads: z.number(),
  createdAt: z.union([z.string(), z.date()]).nullable(),
  lastLoginAt: z.union([z.string(), z.date()]).nullable(),
});

// Export TypeScript type
export type UserProfile = z.infer<typeof UserProfileSchema>;
