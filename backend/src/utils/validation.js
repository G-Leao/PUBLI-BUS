import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  cnpj: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const advertiserSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  companyId: z.string().uuid('Invalid company ID').optional(),
});

export const busSchema = z.object({
  code: z.string().min(1, 'Bus code is required'),
  plate: z.string().optional(),
  model: z.string().optional(),
  line: z.string().optional(),
  status: z.enum(['ACTIVE', 'MAINTENANCE', 'INACTIVE']).default('ACTIVE'),
});

export const advertisingSpaceSchema = z.object({
  busId: z.string().uuid().optional(),
  name: z.string().min(1, 'Space name is required'),
  type: z.string().min(1, 'Space type is required'),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive').default(0),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']).default('AVAILABLE'),
});

export const campaignSchema = z.object({
  advertiserId: z.string().uuid('Invalid advertiser ID'),
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budget: z.number().nonnegative().default(0),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED']).default('DRAFT'),
  durationSeconds: z.number().nonnegative().default(0),
});

export const mediaSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  durationSeconds: z.number().optional(),
});

export const tabletSchema = z.object({
  code: z.string().min(1, 'Tablet code is required'),
  busId: z.string().uuid().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).default('ONLINE'),
});

export const impressionSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  tabletId: z.string().uuid('Invalid tablet ID'),
  startedAt: z.string().datetime().optional(),
  durationSeconds: z.number().nonnegative().default(0),
});
