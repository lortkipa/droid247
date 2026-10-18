import { z } from 'zod';

export const EmailSchema = z.email();

export const DisplayNameSchema = z.string().trim().min(1).max(100);

/** Number of digits in an email sign-in code. */
export const VERIFICATION_CODE_LENGTH = 6;
