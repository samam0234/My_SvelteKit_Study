import { z } from 'zod';
export const postSchema = z.object({
	title: z.string().trim().min(1).max(200),
	body: z.string().trim().min(1).max(20000),
	tags: z.array(z.string().trim().min(1).max(30)).max(10).default([])
});
export const postPatchSchema = z
	.object({
		title: postSchema.shape.title.optional(),
		body: postSchema.shape.body.optional(),
		tags: z.array(z.string().trim().min(1).max(30)).max(10).optional()
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0);
export const signupSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(254),
	nickname: z.string().trim().min(1).max(80),
	password: z.string().min(10).max(128)
});
export const loginSchema = signupSchema.pick({ email: true, password: true });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });
export const questionSchema = z.object({
	text: z.string().min(1).max(20000),
	question: z.string().min(1).max(500)
});
