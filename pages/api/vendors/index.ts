import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const vendors = await prisma.vendor.findMany({
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true,
              stage: true,
              ownerId: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json(vendors)
    } catch (error: any) {
      console.error('Error fetching vendors:', error)
      return res.status(500).json({ error: 'Failed to fetch vendors' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { contactId, name, email, phone, website, notes, tags } = req.body

      if (!contactId) {
        return res.status(400).json({ error: 'contactId is required' })
      }

      if (!name) {
        return res.status(400).json({ error: 'name is required' })
      }

      // Verify contact exists and belongs to user or is accessible
      const contact = await prisma.contact.findUnique({
        where: { id: contactId }
      })

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' })
      }

      // Check if vendor already exists for this contact
      const existingVendor = await prisma.vendor.findUnique({
        where: { contactId }
      })

      if (existingVendor) {
        return res.status(400).json({ error: 'Vendor already exists for this contact' })
      }

      const vendor = await prisma.vendor.create({
        data: {
          contactId,
          name,
          email: email || null,
          phone: phone || null,
          website: website || null,
          notes: notes || null,
          tags: tags || []
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true,
              stage: true,
            }
          }
        }
      })

      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'vendor_created',
          details: {
            vendorId: vendor.id,
            vendorName: vendor.name,
            contactId: vendor.contactId
          }
        }
      })

      return res.status(201).json(vendor)
    } catch (error: any) {
      console.error('Error creating vendor:', error)
      return res.status(500).json({ error: 'Failed to create vendor' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
