import { cn } from '@/lib/utils'
import { Mail, Phone, Building2, Tag, MoreVertical, Archive, ArchiveRestore } from 'lucide-react'
import { useState } from 'react'

interface ContactCardProps {
  contact: any
  onClick?: () => void
  draggable?: boolean
  onArchive?: (contactId: string) => void
  onUnarchive?: (contactId: string) => void
}

const stageColors: Record<string, string> = {
  LEAD: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-emerald-100 text-emerald-700',
  NEGOTIATING: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-orange-100 text-orange-700',
  WON: 'bg-teal-100 text-teal-700',
  LOST: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

export default function ContactCard({ contact, onClick, draggable = false, onArchive, onUnarchive }: ContactCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contact.stage === 'ARCHIVED') {
      onUnarchive?.(contact.id)
    } else {
      onArchive?.(contact.id)
    }
    setShowMenu(false)
  }

  return (
    <div
      role={draggable ? 'button' : undefined}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('contactId', contact.id)
      }}
      className={cn(
        'bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-grab active:cursor-grabbing relative'
      )}
      onClick={onClick}
    >
      {/* Archive Menu Button */}
      {(onArchive || onUnarchive) && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <MoreVertical size={16} className="text-gray-500" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <button
                onClick={handleArchiveClick}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {contact.stage === 'ARCHIVED' ? (
                  <>
                    <ArchiveRestore size={14} />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive size={14} />
                    Archive
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">
          {contact.firstName} {contact.lastName || ''}
        </h3>
        {contact.jobTitle && (
          <p className="text-sm text-gray-600 truncate">{contact.jobTitle}{contact.jobFunction ? ` · ${contact.jobFunction}` : ''}</p>
        )}
        {!contact.jobTitle && contact.jobFunction && (
          <p className="text-sm text-gray-600 truncate">{contact.jobFunction}</p>
        )}
      </div>

      {contact.company && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 min-w-0">
          <Building2 size={16} className="flex-shrink-0" />
          <span className="truncate">{contact.company}</span>
        </div>
      )}

      <div className="mt-2 space-y-1 text-sm">
        {contact.email && (
          <div className="flex items-center gap-2 text-gray-600 min-w-0">
            <Mail size={16} className="flex-shrink-0" />
            <a href={`mailto:${contact.email}`} className="hover:underline truncate">{contact.email}</a>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={16} className="flex-shrink-0" />
            <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
          </div>
        )}
      </div>

      {Array.isArray(contact.tags) && contact.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {contact.tags.slice(0, 4).map((t: string) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              <Tag size={12} /> {t}
            </span>
          ))}
          {contact.tags.length > 4 && (
            <span className="text-xs text-gray-500">+{contact.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap', stageColors[contact.stage] || 'bg-gray-100 text-gray-600')}>
          {contact.stage.replaceAll('_', ' ')}
        </span>
      </div>
    </div>
  )
}
