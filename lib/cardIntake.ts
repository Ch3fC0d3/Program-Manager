import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

type Client = PrismaClient | Prisma.TransactionClient

function getClient(client?: Client): PrismaClient {
  return (client ?? prisma) as PrismaClient
}

export async function ensureNoCycle(client: Client, taskId: string, newParentId: string | null) {
  if (!newParentId) return
  if (newParentId === taskId) {
    throw new Error('Cannot set card as its own parent')
  }

  const db = getClient(client)
  let current: string | null = newParentId

  while (current) {
    if (current === taskId) {
      throw new Error('Cannot create cyclic hierarchy')
    }

    const ancestor: { parentId: string | null } | null = await db.task.findUnique({
      where: { id: current },
      select: { parentId: true }
    })

    if (!ancestor) {
      break
    }

    current = ancestor.parentId
  }
}

export async function refreshParentMetadata(client: Client, parentId: string | null) {
  if (!parentId) return

  const db = getClient(client)
  const childCount = await db.task.count({ where: { parentId } })

  await db.task.update({
    where: { id: parentId },
    data: {
      childCount,
      hasChildren: childCount > 0
    }
  })
}

export async function convertContactsToVendors(client: Client, contactIds: string[]) {
  if (!contactIds?.length) return [] as string[]

  const db = getClient(client)
  const contacts = await db.contact.findMany({
    where: { id: { in: contactIds } },
    include: { vendorProfile: true }
  })

  const vendorIds: string[] = []

  for (const contact of contacts) {
    if (contact.vendorProfile) {
      vendorIds.push(contact.vendorProfile.id)
      if (!contact.isVendor) {
        await db.contact.update({ where: { id: contact.id }, data: { isVendor: true } })
      }
      continue
    }

    const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
    const vendor = await db.vendor.create({
      data: {
        name: fullName || contact.email || 'Vendor',
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags ?? [],
        notes: contact.notes ?? undefined,
        contact: { connect: { id: contact.id } }
      }
    })

    vendorIds.push(vendor.id)

    if (!contact.isVendor) {
      await db.contact.update({ where: { id: contact.id }, data: { isVendor: true } })
    }
  }

  return vendorIds
}

export async function applyCardLinks(
  client: Client,
  cardId: string,
  vendorIds: string[],
  contactIds: string[]
) {
  const db = getClient(client)

  await db.cardLink.deleteMany({
    where: {
      cardId,
      entityType: {
        in: ['VENDOR', 'CONTACT']
      }
    }
  })

  const linkPayload: Prisma.CardLinkCreateManyInput[] = []

  for (const vendorId of vendorIds ?? []) {
    linkPayload.push({ cardId, entityType: 'VENDOR', entityId: vendorId })
  }

  for (const contactId of contactIds ?? []) {
    linkPayload.push({ cardId, entityType: 'CONTACT', entityId: contactId })
  }

  if (linkPayload.length) {
    await db.cardLink.createMany({ data: linkPayload, skipDuplicates: true })
  }
}
