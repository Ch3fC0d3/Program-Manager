import { prisma } from '@/lib/prisma'

export class AccessDeniedError extends Error {
  constructor() {
    super('Access denied')
    this.name = 'AccessDeniedError'
  }
}

export async function ensureBoardAccess(boardId: string, userId: string) {
  const membership = await prisma.boardMember.findFirst({
    where: { boardId, userId },
    select: { id: true }
  })

  if (!membership) {
    throw new AccessDeniedError()
  }

  return membership
}

export async function getAccessibleBoardIds(userId: string) {
  const memberships = await prisma.boardMember.findMany({
    where: { userId },
    select: { boardId: true }
  })

  return memberships.map((membership) => membership.boardId)
}
