import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Plus, Mail, Phone, Building2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import axios from 'axios'

export default function VendorsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await axios.get('/api/vendors')
      return data
    },
    enabled: !!session,
  })

  const filteredVendors = vendors.filter((vendor: any) => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      vendor.name?.toLowerCase().includes(search) ||
      vendor.email?.toLowerCase().includes(search) ||
      vendor.phone?.toLowerCase().includes(search) ||
      vendor.contact?.company?.toLowerCase().includes(search)
    )
  })

  const createVendorMutation = useMutation({
    mutationFn: async (vendorData: typeof newVendor) => {
      // Create contact first
      const { data: contact } = await axios.post('/api/contacts', {
        firstName: vendorData.name.split(' ')[0] || 'Vendor',
        lastName: vendorData.name.split(' ').slice(1).join(' ') || '',
        email: vendorData.email || null,
        phone: vendorData.phone || null,
        company: vendorData.company || vendorData.name,
        notes: vendorData.notes || null,
        isVendor: true,
        ownerId: session?.user?.id,
      })

      // Create linked vendor record
      const { data: vendor } = await axios.post('/api/vendors', {
        contactId: contact.id,
        name: vendorData.company || vendorData.name,
        email: vendorData.email || null,
        phone: vendorData.phone || null,
        notes: vendorData.notes || null,
        tags: [],
      })

      return { contact, vendor }
    },
    onSuccess: ({ contact, vendor }) => {
      toast.success('Vendor created successfully')
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowAddModal(false)
      setNewVendor({ name: '', email: '', phone: '', company: '', notes: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create vendor')
    },
  })

  const handleCreateVendor = () => {
    if (!newVendor.name && !newVendor.company) {
      toast.error('Please provide a name or company')
      return
    }
    createVendorMutation.mutate(newVendor)
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
            <p className="text-gray-600 mt-1">
              Centralize vendor contacts and logistics. Use AI Drop Zone on dashboard to import vendors from PDFs/documents.
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="mr-2" /> Add Vendor
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <Input
            placeholder="Search vendors by name, email, phone, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3"
          />
        </div>

        {/* Vendor Cards Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No vendors found</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4">
              <Plus size={18} className="mr-2" /> Add Your First Vendor
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVendors.map((vendor: any) => (
              <div
                key={vendor.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/vendors/${vendor.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">
                      {vendor.name}
                    </h3>
                    {vendor.contact?.company && vendor.contact.company !== vendor.name && (
                      <p className="text-sm text-gray-500 truncate">{vendor.contact.company}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {vendor.contact && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 size={16} className="flex-shrink-0" />
                      <span className="truncate">
                        {vendor.contact.firstName} {vendor.contact.lastName}
                      </span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} className="flex-shrink-0" />
                      <a
                        href={`mailto:${vendor.email}`}
                        className="hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.email}
                      </a>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} className="flex-shrink-0" />
                      <a
                        href={`tel:${vendor.phone}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.phone}
                      </a>
                    </div>
                  )}
                </div>

                {vendor.notes && (
                  <p className="mt-3 text-xs text-gray-500 line-clamp-2">{vendor.notes}</p>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(vendor.createdAt).toLocaleDateString()}
                  </span>
                  {vendor.contactId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/contacts/${vendor.contactId}`)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View Contact <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Vendor"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVendor} disabled={createVendorMutation.isPending}>
              {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={newVendor.company}
              onChange={(e) => setNewVendor({ ...newVendor, company: e.target.value })}
              placeholder="Drill Tech, Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <Input
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              placeholder="contact@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              type="tel"
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              placeholder="928-636-8006"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={newVendor.notes}
              onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })}
              placeholder="Additional information..."
            />
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
