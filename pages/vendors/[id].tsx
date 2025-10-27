import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import { ArrowLeft, Building2, Mail, Phone, Globe, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export default function VendorDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  type FormState = {
    name: string
    email: string
    phone: string
    website: string
    notes: string
    tags: string
  }

  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    tags: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const vendorQuery = useQuery({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/vendors/${id}`)
      return data
    },
    enabled: !!session && typeof id === 'string'
  })

  const updateVendorMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await axios.put(`/api/vendors/${id}`, payload)
      return data
    },
    onSuccess: () => {
      toast.success('Vendor updated')
      queryClient.invalidateQueries({ queryKey: ['vendor', id] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
    onError: () => {
      toast.error('Failed to update vendor')
    }
  })

  const vendor = vendorQuery.data
  const isLoading = vendorQuery.isLoading || status === 'loading'

  const deleteVendorMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/vendors/${id}`)
    },
    onSuccess: () => {
      toast.success('Vendor deleted')
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setShowDeleteModal(false)
      router.push('/vendors')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete vendor')
    }
  })

  useEffect(() => {
    if (vendor) {
      setFormState({
        name: vendor.name || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        website: vendor.website || '',
        notes: vendor.notes || '',
        tags: Array.isArray(vendor.tags) ? vendor.tags.join(', ') : ''
      })
    }
  }, [vendor])

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (vendorQuery.isError || !vendor) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-500">Vendor not found or you do not have access.</p>
          <Button className="mt-4" onClick={() => router.push('/vendors')}>
            Back to Vendors
          </Button>
        </div>
      </Layout>
    )
  }

  const linkedContact = vendor.contact

  const handleSave = () => {
    updateVendorMutation.mutate({
      name: formState.name,
      email: formState.email || null,
      phone: formState.phone || null,
      website: formState.website || null,
      notes: formState.notes || null,
      tags: formState.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean)
    })
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/vendors')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} className="mr-1" /> Vendors
          </button>
          <div className="flex items-center gap-2">
            {linkedContact && (
              <Button variant="outline" onClick={() => router.push(`/contacts/${linkedContact.id}`)}>
                View Contact
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Delete Vendor
            </Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {formState.name || vendor.name || 'Vendor'}
              </h1>
              {linkedContact?.company && (
                <p className="text-sm text-gray-600">{linkedContact.company}</p>
              )}
            </div>
            {linkedContact && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} className="text-gray-500" />
                <div>
                  <p className="text-gray-800">
                    {linkedContact.firstName} {linkedContact.lastName}
                  </p>
                  {linkedContact.email && (
                    <a href={`mailto:${linkedContact.email}`} className="text-blue-600 hover:underline text-xs">
                      {linkedContact.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Vendor Name"
              value={formState.name}
              onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              label="Email"
              value={formState.email}
              onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
            />
            <Input
              label="Phone"
              value={formState.phone}
              onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
            />
            <Input
              label="Website"
              value={formState.website}
              onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            <Textarea
              label="Notes"
              rows={4}
              value={formState.notes}
              onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
            />
            <Textarea
              label="Tags"
              rows={4}
              value={formState.tags}
              onChange={(e) => setFormState((s) => ({ ...s, tags: e.target.value }))}
              placeholder="Comma separated"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateVendorMutation.isPending}
              className={cn({ 'opacity-75 cursor-not-allowed': updateVendorMutation.isPending })}
            >
              {updateVendorMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-sm text-gray-600 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Company Details</h2>
            {linkedContact?.company && (
              <p className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-500" />
                <span>{linkedContact.company}</span>
              </p>
            )}
            {linkedContact?.email && (
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <a href={`mailto:${linkedContact.email}`} className="text-blue-600 hover:underline">
                  {linkedContact.email}
                </a>
              </p>
            )}
            {linkedContact?.phone && (
              <p className="flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                <a href={`tel:${linkedContact.phone}`} className="text-blue-600 hover:underline">
                  {linkedContact.phone}
                </a>
              </p>
            )}
            {linkedContact?.jobTitle && (
              <p>Title: {linkedContact.jobTitle}</p>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-sm text-gray-600 space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Vendor Links</h2>
            {formState.website && (
              <p className="flex items-center gap-2">
                <Globe size={16} className="text-gray-500" />
                <a href={formState.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                  {formState.website}
                </a>
              </p>
            )}
            {linkedContact && (
              <p>
                Primary contact:{' '}
                <button
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => router.push(`/contacts/${linkedContact.id}`)}
                >
                  {linkedContact.firstName} {linkedContact.lastName || ''}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteVendorMutation.isPending) {
            setShowDeleteModal(false)
          }
        }}
        title="Delete Vendor"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteVendorMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteVendorMutation.mutate()}
              disabled={deleteVendorMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteVendorMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          This will permanently remove the vendor record. Linked contacts will remain, but you may lose vendor-specific
          notes and tags. Are you sure you want to continue?
        </p>
      </Modal>
    </Layout>
  )
}
