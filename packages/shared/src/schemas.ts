import { z } from 'zod';
import { isLanguageCode, type LanguageCode } from './languages';

export const languageCodeSchema = z
  .string()
  .refine(isLanguageCode, { message: 'Ngôn ngữ không được hỗ trợ' })
  .transform((c) => c as LanguageCode);

export const roleSchema = z.enum(['teacher', 'student', 'admin']);
export type Role = z.infer<typeof roleSchema>;

export const lessonFormatSchema = z.enum(['room', 'online', 'hybrid']);
export type LessonFormat = z.infer<typeof lessonFormatSchema>;

export const audioSourceSchema = z.enum(['mic', 'tab']);
export type AudioSource = z.infer<typeof audioSourceSchema>;

export const lessonStatusSchema = z.enum(['live', 'processing', 'review', 'published']);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

/** 6 characters, no 0/O/1/I to avoid misreading on a projector. */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/, { message: 'Mã lớp gồm 6 ký tự' });

/**
 * A recognised utterance. `partial` results may still change and are never persisted;
 * only `final` segments are stored and translated (CLAUDE.md rule 6).
 */
export const segmentSchema = z.object({
  lessonId: z.uuid(),
  seq: z.number().int().nonnegative(),
  state: z.enum(['partial', 'final']),
  source: audioSourceSchema,
  speaker: z.string().optional(),
  text: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  translations: z.partialRecord(languageCodeSchema, z.string()).default({}),
});
export type Segment = z.infer<typeof segmentSchema>;
