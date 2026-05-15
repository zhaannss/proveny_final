const { z } = require("zod");

const dueDateSchema = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid due date")
  .transform((value) => new Date(value).toISOString());

const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(300),
  weekNumber: z.number().int().min(1).max(16),
  expectedScore: z.number().min(0).max(100),
  dueDate: dueDateSchema,
});

module.exports = { createAssignmentSchema };

