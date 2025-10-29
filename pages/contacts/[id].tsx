import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Modal from '@/components/ui/Modal'
import { ArrowLeft, Building2, Mail, Phone, Link2, NotebookText, MapPin, Paperclip, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { StageLabel } from '@/lib/constants'
import { parseContactNotes, ParsedContactNoteEntry } from '@/lib/contactNoteParser'

const interactionMethodOptions = [
  { value: 'NOTE', label: 'Note' },
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'OTHER', label: 'Other' }
]

export default function ContactDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  const [interactionMethod, setInteractionMethod] = useState('NOTE')
  const [interactionSummary, setInteractionSummary] = useState('')
  const [interactionNotes, setInteractionNotes] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const contactQuery = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data } = await axios.get(`/api/contacts/${id}`)
      return data
    },
    enabled: !!session && typeof id === 'string'
  })

  const interactionsQuery = useQuery({
    queryKey: ['contact', id, 'interactions'],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`/api/contacts/${id}/interactions`)
        return data
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status && [404, 500, 501].includes(status)) {
            return []
          }
        }
        throw error
      }
    },
    enabled: !!session && typeof id === 'string'
  })

  const addInteractionMutation = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/contacts/${id}/interactions`, {
        method: interactionMethod,
        summary: interactionSummary || undefined,
        notes: interactionNotes || undefined
      })
    },
    onSuccess: () => {
      toast.success('Interaction added')
      setInteractionSummary('')
      setInteractionNotes('')
      queryClient.invalidateQueries({ queryKey: ['contact', id, 'interactions'] })
    },
    onError: () => {
      toast.error('Failed to add interaction')
    }
  })

  const deleteContactMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/contacts/${id}`)
    },
    onSuccess: () => {
      toast.success('Contact deleted')
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowDeleteModal(false)
      router.push('/contacts')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete contact')
    }
  })

  const isLoading = contactQuery.isLoading || interactionsQuery.isLoading || status === 'loading'
  const contact = contactQuery.data
  const interactions = interactionsQuery.data || []

  const title = contact ? `${contact.firstName} ${contact.lastName || ''}`.trim() || contact.email : 'Contact'

  const addressLines = useMemo(() => {
    if (!contact) return []
    const lines: string[] = []
    const line1 = [contact.addressLine1, contact.addressLine2].filter(Boolean).join(' ')
    if (line1) lines.push(line1)
    const cityStateZip = [contact.city, contact.state, contact.postalCode].filter(Boolean).join(', ')
    if (cityStateZip) lines.push(cityStateZip)
    if (contact.country) lines.push(contact.country)
    return lines
  }, [contact])

  const tags = useMemo(() => {
    if (!contact?.tags) return []
    return contact.tags
  }, [contact])

  const parsedNotes = useMemo(() => parseContactNotes(contact?.notes), [contact?.notes])

  const structuredSections = useMemo(() => {
    if (!parsedNotes) {
      return null
    }

    const hasEntries = (entries: ParsedContactNoteEntry[]) => entries && entries.length > 0
    const hasLineItems = Array.isArray(parsedNotes.lineItems) && parsedNotes.lineItems.length > 0

    if (
      !hasEntries(parsedNotes.estimate) &&
      !hasEntries(parsedNotes.customer) &&
      !hasEntries(parsedNotes.location) &&
      !hasEntries(parsedNotes.vendor) &&
      !hasEntries(parsedNotes.totals) &&
      !hasEntries(parsedNotes.other) &&
      !hasLineItems
    ) {
      return null
    }

    return parsedNotes
  }, [parsedNotes])

  const renderEntries = (entries: ParsedContactNoteEntry[]) =>
    entries.map((entry) => (
      <div key={entry.label} className="space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{entry.label}</p>
        {Array.isArray(entry.value) ? (
          <ul className="space-y-1 text-sm text-gray-700">
            {entry.value.map((line, index) => (
              <li key={`${entry.label}-${index}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-700 break-words">{entry.value}</p>
        )}
      </div>
    ))

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (contactQuery.isError || !contact) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-gray-500">Contact not found or you do not have access.</p>
          <Button className="mt-4" onClick={() => router.push('/contacts')}>
            Back to Contacts
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/contacts')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft size={16} className="mr-1" /> Contacts
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-700">{title}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/contacts/${id}/edit`)}>
              Edit Contact
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
              Delete Contact
            </Button>
          </div>
        </div>

        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            if (!deleteContactMutation.isPending) {
              setShowDeleteModal(false)
            }
          }}
          title="Delete Contact"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteContactMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteContactMutation.mutate()}
                disabled={deleteContactMutation.isPending}
              >
                {deleteContactMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-gray-600">
            This will permanently remove the contact along with related interactions, attachments, and any linked vendor profile.
            Are you sure you want to continue?
          </p>
        </Modal>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{title || 'Unnamed Contact'}</h1>
              {contact.jobTitle && (
                <p className="text-sm text-gray-600">
                  {contact.jobTitle}
                  {contact.jobFunction ? ` · ${contact.jobFunction}` : ''}
                </p>
              )}
              {!contact.jobTitle && contact.jobFunction && (
                <p className="text-sm text-gray-600">{contact.jobFunction}</p>
              )}
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            {contact.company && (
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-gray-500" />
                <span>{contact.company}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-500" />
                <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.website && (
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-gray-500" />
                <a href={contact.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                  {contact.website}
                </a>
              </div>
            )}
            {contact.owner && (
              <div>
                <span className="text-gray-500">Owner:</span>{' '}
                <span className="text-gray-800">{contact.owner.name || contact.owner.email}</span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              <div>Created: {contact.createdAt ? new Date(contact.createdAt).toLocaleString() : '—'}</div>
              <div>Last Updated: {contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : '—'}</div>
            </div>
          </div>

          {contact.notes && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              <p className="font-medium mb-2">Notes</p>
              <p className="whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {structuredSections && (
            <div className="mt-6 bg-white border border-blue-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Structured Note Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {structuredSections.estimate.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Estimate</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.estimate)}</div>
                  </div>
                )}
                {structuredSections.customer.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Customer</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.customer)}</div>
                  </div>
                )}
                {structuredSections.location.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Location</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.location)}</div>
                  </div>
                )}
                {structuredSections.vendor.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Vendor</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.vendor)}</div>
                  </div>
                )}
                {structuredSections.totals.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Financials</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.totals)}</div>
                  </div>
                )}
                {structuredSections.other.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Additional Details</h4>
                    <div className="space-y-3">{renderEntries(structuredSections.other)}</div>
                  </div>
                )}
              </div>
              {structuredSections.lineItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Line Items</h4>
                  <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                    {structuredSections.lineItems.map((lineItem, index) => (
                      <li key={`line-item-${index}`}>{lineItem}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {addressLines.length > 0 && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <MapPin size={18} className="text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium mb-2">Mailing Address</p>
                  <div className="space-y-1">
                    {addressLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {Array.isArray(contact.attachments) && contact.attachments.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Paperclip size={18} className="text-gray-500" /> Attachments
            </h2>
            <ul className="space-y-2">
              {contact.attachments.map((attachment: any) => (
                <li key={attachment.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-md px-3 py-2 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                      {attachment.originalName}
                      <span className="text-xs text-gray-400">{(attachment.size / 1024).toFixed(1)} KB</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {attachment.mimeType} • {attachment.createdAt ? new Date(attachment.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <a
                    href={attachment.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Download size={16} />
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contact.vendorProfile && (
          <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Linked Vendor</h2>
                <p className="text-sm text-gray-600">This contact is associated with a vendor profile.</p>
              </div>
              <Button variant="outline" onClick={() => router.push(`/vendors/${contact.vendorProfile.id}`)}>
                View Vendor
              </Button>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-800">{contact.vendorProfile.name}</p>
              {contact.vendorProfile.email && <p>Email: {contact.vendorProfile.email}</p>}
              {contact.vendorProfile.phone && <p>Phone: {contact.vendorProfile.phone}</p>}
              {contact.vendorProfile.website && (
                <p>
                  Website:{' '}
                  <a href={contact.vendorProfile.website} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                    {contact.vendorProfile.website}
                  </a>
                </p>
              )}
              {contact.vendorProfile.notes && (
                <p className="text-gray-500 whitespace-pre-wrap">{contact.vendorProfile.notes}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Interaction History</h2>
              <span className="text-xs text-gray-400">{interactions.length} records</span>
            </div>
            {interactions.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                <NotebookText size={20} className="mx-auto mb-3 text-gray-400" />
                No interactions logged yet.
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction: any) => (
                  <div key={interaction.id} className="border border-gray-100 rounded-md p-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span className="uppercase font-semibold text-gray-600">{interaction.method}</span>
                      <span>{interaction.occurredAt ? new Date(interaction.occurredAt).toLocaleString() : 'Not logged'}</span>
                    </div>
                    {interaction.summary && (
                      <p className="text-sm text-gray-800 mb-2">{interaction.summary}</p>
                    )}
                    {interaction.notes && (
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{interaction.notes}</p>
                    )}
                    {interaction.createdBy && (
                      <p className="text-xs text-gray-500 mt-3">
                        Logged by {interaction.createdBy.name || interaction.createdBy.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Log Interaction</h2>
            <div className="space-y-4">
              <Select
                value={interactionMethod}
                onChange={(e) => setInteractionMethod(e.target.value)}
                options={interactionMethodOptions}
              />
              <Input
                placeholder="Summary"
                value={interactionSummary}
                onChange={(e) => setInteractionSummary(e.target.value)}
              />
              <Textarea
                placeholder="Notes"
                rows={4}
                value={interactionNotes}
                onChange={(e) => setInteractionNotes(e.target.value)}
              />
              <Button
                onClick={() => addInteractionMutation.mutate()}
                disabled={addInteractionMutation.isPending}
                className={cn({ 'opacity-75 cursor-not-allowed': addInteractionMutation.isPending })}
              >
                {addInteractionMutation.isPending ? 'Saving...' : 'Add Interaction'}
              </Button>
            </div>
          </div>
        </div>

        {contact.board && (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm text-sm text-gray-600">
            <p className="font-medium text-gray-800 mb-2">Board Access</p>
            <p>{contact.board.name}</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
