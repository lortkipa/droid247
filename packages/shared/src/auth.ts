import { z } from 'zod';

export const EmailSchema = z.email();

export const DisplayNameSchema = z.string().trim().min(1).max(100);

/** Number of digits in an email sign-in code. */
export const VERIFICATION_CODE_LENGTH = 6;

/** Random value that ties a desktop Google sign-in to the app window that started it. */
export const DesktopAuthStateSchema = z.string().regex(/^[A-Za-z0-9_-]{32,128}$/);

export const CompleteProfileInputSchema = z.object({ name: DisplayNameSchema });
