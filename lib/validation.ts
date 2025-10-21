import { z } from 'zod'

// Task validation schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional().nullable(),
  boardId: z.string().cuid('Invalid board ID'),
  status: z.enum(['BACKLOG', 'NEXT_7_DAYS', 'IN_PROGRESS', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().cuid('Invalid assignee ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  labelIds: z.array(z.string().cuid()).optional(),
  parentId: z.string().cuid('Invalid parent ID').optional().nullable(),
  customFields: z.record(z.any()).optional(),
})

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().cuid('Invalid task ID'),
})

// User validation schemas
export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']).optional(),
})

// Contact validation schemas
export const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name must be less than 100 characters'),
  lastName: z.string().max(100, 'Last name must be less than 100 characters').optional().nullable(),
  email: z.string().email('Invalid email address').max(255, 'Email must be less than 255 characters').optional().nullable(),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional().nullable(),
  company: z.string().max(200, 'Company must be less than 200 characters').optional().nullable(),
  jobTitle: z.string().max(100, 'Job title must be less than 100 characters').optional().nullable(),
  jobFunction: z.string().max(100, 'Job function must be less than 100 characters').optional().nullable(),
  stage: z.enum(['LEAD', 'CONTACTED', 'PENDING', 'QUALIFIED', 'NEGOTIATING', 'ACTIVE', 'ON_HOLD', 'WON', 'LOST', 'ARCHIVED']).optional(),
  boardId: z.string().cuid('Invalid board ID').optional().nullable(),
  ownerId: z.string().cuid('Invalid owner ID').optional().nullable(),
  notes: z.string().max(5000, 'Notes must be less than 5000 characters').optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
  isVendor: z.boolean().optional(),
})

export const updateContactSchema = createContactSchema.partial().extend({
  id: z.string().cuid('Invalid contact ID'),
})

// Board validation schemas
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  color: z.string().max(20, 'Color must be less than 20 characters').optional().nullable(),
  icon: z.string().max(50, 'Icon must be less than 50 characters').optional().nullable(),
  organizationId: z.string().cuid('Invalid organization ID').optional().nullable(),
})

// Comment validation schemas
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment must be less than 2000 characters'),
  taskId: z.string().cuid('Invalid task ID'),
})

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename must be less than 255 characters'),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().int().positive().max(10485760, 'File size must be less than 10MB'), // 10MB max
})

// Meeting validation schemas
export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional().nullable(),
  notes: z.string().max(10000, 'Notes must be less than 10000 characters').optional().nullable(),
  meetingDate: z.string().datetime('Invalid meeting date'),
  duration: z.number().int().positive().max(1440, 'Duration must be less than 1440 minutes (24 hours)').optional().nullable(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional().nullable(),
  attendees: z.array(z.string().max(255)).optional(),
  tags: z.array(z.string().max(50)).optional(),
  boardId: z.string().cuid('Invalid board ID').optional().nullable(),
})

// Expense validation schemas
export const createExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)').optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  date: z.string().datetime().optional(),
  vendorId: z.string().cuid('Invalid vendor ID').optional().nullable(),
  taskId: z.string().cuid('Invalid task ID').optional().nullable(),
  boardId: z.string().cuid('Invalid board ID').optional().nullable(),
})

// Helper function to validate and parse data
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return { success: false, error: firstError.message }
    }
    return { success: false, error: 'Validation failed' }
  }
}
