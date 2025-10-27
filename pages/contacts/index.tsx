import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import ContactCard from '@/components/ContactCard'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { StageLabel, STAGES } from '@/lib/constants'
import Textarea from '@/components/ui/Textarea'

export default function ContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [jobFunctionFilter, setJobFunctionFilter] = useState('ALL')
  const [letterFilter, setLetterFilter] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    company: '',
    jobTitle: '',
    jobFunction: '',
    stage: 'CONTACTED',
    ownerId: '',
    boardId: '',
    notes: '',
    tags: ''
  })

  const [draggedContact, setDraggedContact] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', stageFilter, ownerFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (stageFilter !== 'ALL') params.append('stage', stageFilter)
      if (ownerFilter !== 'ALL') params.append('ownerId', ownerFilter)
      const { data } = await axios.get(`/api/contacts?${params.toString()}`)
      return data
    },
    enabled: !!session
  })

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data } = await axios.get('/api/boards')
      return data
    },
    enabled: !!session
  })

  const owners = useMemo(() => {
    // Owners from board members + current user
    const members = boards.flatMap((b: any) => b.members.map((m: any) => m.user))
    const uniq = new Map<string, any>()
    members.concat(session?.user ? [session.user] : []).forEach((u: any) => {
      if (u?.id) uniq.set(u.id, u)
    })
    return Array.from(uniq.values())
  }, [boards, session])

  const jobFunctions = useMemo(() => {
    const set = new Set<string>()
    contacts.forEach((c: any) => { if (c.jobFunction) set.add(c.jobFunction) })
    return Array.from(set)
  }, [contacts])

  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      if (searchQuery) {
        const haystack = [
          c.firstName,
          c.lastName,
          c.email,
          c.phone,
          c.website,
          c.company,
          c.jobTitle,
          c.jobFunction,
          c.addressLine1,
          c.addressLine2,
          c.city,
          c.state,
          c.postalCode,
          c.country,
          Array.isArray(c.tags) ? c.tags.join(' ') : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(searchQuery.toLowerCase())) return false
      }
      if (jobFunctionFilter !== 'ALL' && c.jobFunction !== jobFunctionFilter) return false
      if (letterFilter) {
        const firstLetter = (c.lastName || c.firstName || '').charAt(0).toUpperCase()
        if (firstLetter !== letterFilter) return false
      }
      return true
    })
  }, [contacts, searchQuery, jobFunctionFilter, letterFilter])

  const contactsByStage: Record<string, any[]> = useMemo(() => {
    const map: Record<string, any[]> = {}
    STAGES.forEach(s => { map[s] = [] })
    filtered.forEach((c: any) => {
      const s = c.stage || 'CONTACTED'
      if (!map[s]) map[s] = []
      map[s].push(c)
    })
    return map
  }, [filtered])

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { data } = await axios.put(`/api/contacts/${id}`, { stage })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact updated')
    },
    onError: () => {
      toast.error('Failed to update contact')
    }
  })

  const archiveContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { data } = await axios.put(`/api/contacts/${contactId}`, { stage: 'ARCHIVED' })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact archived')
    },
    onError: () => {
      toast.error('Failed to archive contact')
    }
  })

  const unarchiveContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { data } = await axios.put(`/api/contacts/${contactId}`, { stage: 'CONTACTED' })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Contact unarchived')
    },
    onError: () => {
      toast.error('Failed to unarchive contact')
    }
  })

  const handleDragStart = (id: string) => setDraggedContact(id)
  const handleDragEnd = () => { setDraggedContact(null); setDragOverStage(null) }
  const handleDragOver = (e: React.DragEvent, stage: string) => { e.preventDefault(); setDragOverStage(stage) }
  const handleDragLeave = () => setDragOverStage(null)
  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    if (draggedContact) updateStageMutation.mutate({ id: draggedContact, stage })
    setDraggedContact(null)
    setDragOverStage(null)
  }

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...newContact,
        ownerId: newContact.ownerId || session?.user?.id,
        boardId: newContact.boardId || undefined,
        tags: newContact.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0)
      }

      const { data } = await axios.post('/api/contacts', payload)
      return data
    },
    onSuccess: () => {
      toast.success('Contact created')
      setShowCreateModal(false)
      setCreateSubmitting(false)
      setCreateError(null)
      setNewContact({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        website: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        company: '',
        jobTitle: '',
        jobFunction: '',
        stage: 'CONTACTED',
        ownerId: session?.user?.id || '',
        boardId: '',
        notes: '',
        tags: ''
      })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: (error: any) => {
      setCreateSubmitting(false)
      setCreateError(error.response?.data?.error || 'Failed to create contact')
    }
  })

  const handleCreateContact = () => {
    setCreateError(null)

    if (!newContact.firstName && !newContact.lastName && !newContact.email) {
      setCreateError('Provide at least a first name, last name, or email.')
      return
    }

    setCreateSubmitting(true)
    createContactMutation.mutate()
  }

  const updateNewContact = (field: keyof typeof newContact, value: string) => {
    setNewContact(prev => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (session?.user?.id && !newContact.ownerId) {
      setNewContact(prev => ({ ...prev, ownerId: session.user?.id || '' }))
    }
  }, [session, newContact.ownerId])

  if (status === 'loading' || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
            <p className="text-gray-600 mt-1">
              Manage vendor, community, and partner contacts. Use AI Drop Zone on dashboard to import contacts from files.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} className="mr-2" /> New Contact
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search contacts (name, company, phone, website, address, tags...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white"
              />
            </div>

            {/* Stage */}
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              options={[{ value: 'ALL', label: 'All Stages' }, ...STAGES.map(s => ({ value: s, label: StageLabel[s] }))]}
            />

            {/* Owner */}
            <Select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              options={[{ value: 'ALL', label: 'All Owners' }, ...owners.map((u: any) => ({ value: u.id, label: u.name }))]}
            />

            {/* Job Function */}
            <Select
              value={jobFunctionFilter}
              onChange={(e) => setJobFunctionFilter(e.target.value)}
              options={[{ value: 'ALL', label: 'All Functions' }, ...jobFunctions.map(j => ({ value: j, label: j }))]}
            />
          </div>

          {/* A-Z Letter Filter */}
          <div className="flex items-center gap-1 pt-3 border-t border-gray-200">
            <span className="text-xs font-medium text-gray-500 mr-2">Filter by:</span>
            <button
              onClick={() => setLetterFilter(null)}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded transition-colors',
                letterFilter === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              All
            </button>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <button
                key={letter}
                onClick={() => setLetterFilter(letter)}
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded transition-colors',
                  letterFilter === letter
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Kanban by stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">{StageLabel[stage]}</h2>
                <span className="text-xs text-gray-500">{contactsByStage[stage]?.length || 0}</span>
              </div>
              <div
                className={cn(
                  'flex-1 space-y-3 rounded-md p-2 border-2 border-dashed transition-colors min-h-[120px] overflow-y-auto',
                  dragOverStage === stage ? 'border-blue-500 bg-blue-50' : 'border-transparent'
                )}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {(contactsByStage[stage] || []).map((contact: any) => (
                  <div
                    key={contact.id}
                    onDragStart={() => handleDragStart(contact.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <ContactCard
                      contact={contact}
                      draggable={true}
                      onClick={() => router.push(`/contacts/${contact.id}`)}
                      onArchive={(id) => archiveContactMutation.mutate(id)}
                      onUnarchive={(id) => unarchiveContactMutation.mutate(id)}
                    />
                  </div>
                ))}
                {(contactsByStage[stage] || []).length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6">Drop contacts here</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Contact"
          size="lg"
        >
          <p className="text-sm text-gray-600 mb-4">
            Add a new contact to your database.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="First Name"
                value={newContact.firstName}
                onChange={(e) => updateNewContact('firstName', e.target.value)}
              />
              <Input
                placeholder="Last Name"
                value={newContact.lastName}
                onChange={(e) => updateNewContact('lastName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Email"
                type="email"
                value={newContact.email}
                onChange={(e) => updateNewContact('email', e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => updateNewContact('phone', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Company"
                value={newContact.company}
                onChange={(e) => updateNewContact('company', e.target.value)}
              />
              <Input
                placeholder="Job Title"
                value={newContact.jobTitle}
                onChange={(e) => updateNewContact('jobTitle', e.target.value)}
              />
            </div>

            <Input
              placeholder="Website (https://...)"
              value={newContact.website}
              onChange={(e) => updateNewContact('website', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Address Line 1"
                value={newContact.addressLine1}
                onChange={(e) => updateNewContact('addressLine1', e.target.value)}
              />
              <Input
                placeholder="Address Line 2"
                value={newContact.addressLine2}
                onChange={(e) => updateNewContact('addressLine2', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="City"
                value={newContact.city}
                onChange={(e) => updateNewContact('city', e.target.value)}
              />
              <Input
                placeholder="State / Region"
                value={newContact.state}
                onChange={(e) => updateNewContact('state', e.target.value)}
              />
              <Input
                placeholder="Postal Code"
                value={newContact.postalCode}
                onChange={(e) => updateNewContact('postalCode', e.target.value)}
              />
            </div>

            <Input
              placeholder="Country"
              value={newContact.country}
              onChange={(e) => updateNewContact('country', e.target.value)}
            />

            <Input
              placeholder="Job Function"
              value={newContact.jobFunction}
              onChange={(e) => updateNewContact('jobFunction', e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                value={newContact.stage}
                onChange={(e) => updateNewContact('stage', e.target.value)}
                options={STAGES.map(s => ({ value: s, label: StageLabel[s] }))}
              />

              <Select
                value={newContact.ownerId || session?.user?.id || ''}
                onChange={(e) => updateNewContact('ownerId', e.target.value)}
                options={[{ value: '', label: 'Assign to me' }, ...owners.map((u: any) => ({ value: u.id, label: u.name }))]}
              />
            </div>

            {boards.length > 0 && (
              <Select
                value={newContact.boardId}
                onChange={(e) => updateNewContact('boardId', e.target.value)}
                options={[{ value: '', label: 'No board (global contact)' }, ...boards.map((b: any) => ({ value: b.id, label: b.name }))]}
              />
            )}

            <Textarea
              placeholder="Notes"
              value={newContact.notes}
              onChange={(e) => updateNewContact('notes', e.target.value)}
              rows={4}
            />

            <Input
              placeholder="Tags (comma separated)"
              value={newContact.tags}
              onChange={(e) => updateNewContact('tags', e.target.value)}
            />

            {createError && (
              <p className="text-sm text-red-600">{createError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={createSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleCreateContact} disabled={createSubmitting}>
                {createSubmitting ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </Layout>
  )
}
