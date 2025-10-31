import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Layout from '@/components/Layout'
import { Search, Loader2, FileText, Users, Building2, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null
      const { data } = await axios.get(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      return data
    },
    enabled: !!session && debouncedQuery.length >= 2
  })

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search</h1>
          <p className="text-gray-600">Search across tasks, contacts, vendors, and more</p>
        </div>

        {/* Search Input */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for tasks, contacts, vendors..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            autoFocus
          />
        </div>

        {/* Results */}
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 2 && results && (
          <div className="space-y-6">
            {/* Tasks */}
            {results.tasks && results.tasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Tasks ({results.tasks.length})
                </h2>
                <div className="space-y-2">
                  {results.tasks.map((task: any) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Board: {task.board?.name}</span>
                        <span>Status: {task.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            {results.contacts && results.contacts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Contacts ({results.contacts.length})
                </h2>
                <div className="space-y-2">
                  {results.contacts.map((contact: any) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.company && <span>{contact.company}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Vendors */}
            {results.vendors && results.vendors.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Vendors ({results.vendors.length})
                </h2>
                <div className="space-y-2">
                  {results.vendors.map((vendor: any) => (
                    <Link
                      key={vendor.id}
                      href={`/vendors/${vendor.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900">{vendor.name}</h3>
                      {vendor.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{vendor.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Meetings */}
            {results.meetings && results.meetings.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Meetings ({results.meetings.length})
                </h2>
                <div className="space-y-2">
                  {results.meetings.map((meeting: any) => (
                    <Link
                      key={meeting.id}
                      href={`/meetings/${meeting.id}`}
                      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                      {meeting.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{meeting.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(meeting.startTime).toLocaleString()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {(!results.tasks || results.tasks.length === 0) &&
             (!results.contacts || results.contacts.length === 0) &&
             (!results.vendors || results.vendors.length === 0) &&
             (!results.meetings || results.meetings.length === 0) && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No results found for &ldquo;{debouncedQuery}&rdquo;</p>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!debouncedQuery && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Start typing to search...</p>
            <p className="text-sm text-gray-400 mt-2">Search across tasks, contacts, vendors, and meetings</p>
          </div>
        )}

        {/* Too Short */}
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
