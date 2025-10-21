import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const productionLogs: (Prisma.LogLevel | Prisma.LogDefinition)[] = ['error']
const developmentLogs: (Prisma.LogLevel | Prisma.LogDefinition)[] = ['query', 'error', 'warn']

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? productionLogs : developmentLogs,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
