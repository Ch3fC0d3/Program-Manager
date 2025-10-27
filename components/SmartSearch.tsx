import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Search, Sparkles, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import TaskCard from './TaskCard'

export default function SmartSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading, error } = useQuery({
    queryKey: ['smart-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return null
      try {
        const { data } = await axios.get(`/api/ai/smart-search?q=${encodeURIComponent(debouncedQuery)}`)
        return data
      } catch (err: any) {
        console.error('Smart search error:', err)
        throw err
      }
    },
    enabled: debouncedQuery.length > 2,
    retry: false
  })

  const handleSearch = (value: string) => {
    setQuery(value)
  }

  const handleClear = () => {
    setQuery('')
    setDebouncedQuery('')
  }

  const suggestions = [
    "Show me urgent tasks",
    "My tasks due this week",
    "Blocked tasks",
    "Overdue tasks",
    "Tasks in progress"
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Smart Search</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Search your workspace using natural language. Try: &quot;urgent tasks due this week&quot; or &quot;my blocked tasks&quot;
      </p>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search tasks naturally..."
          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
        )}
      </div>

      {/* Suggestions */}
      {!query && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Try these:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSearch(suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-sm text-red-900">
            Search failed. Please try again or check your connection.
          </p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Quick Links */}
          {results.quickLinks && results.quickLinks.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Jump to:</p>
              <div className="flex flex-wrap gap-2">
                {results.quickLinks.map((link: any) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation */}
          {results.interpretation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <span className="font-medium">Understanding:</span>{' '}
                {results.interpretation.filters.length > 0 && (
                  <span>Filtering by {results.interpretation.filters.join(', ')}. </span>
                )}
                {results.interpretation.searchTerms && (
                  <span>Searching for &quot;{results.interpretation.searchTerms}&quot;</span>
                )}
              </p>
            </div>
          )}

          {/* Tasks */}
          {results.tasks && results.tasks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Tasks ({results.counts.tasks})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.tasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => window.location.href = `/tasks/${task.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {results.contacts && results.contacts.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Contacts ({results.counts.contacts})
              </h4>
              <div className="space-y-2">
                {results.contacts.map((contact: any) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {contact.company && <span>{contact.company} • </span>}
                      {contact.email}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Boards */}
          {results.boards && results.boards.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Boards ({results.counts.boards})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.boards.map((board: any) => (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: board.color || '#3b82f6' }}
                      >
                        {board.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{board.name}</p>
                        {board.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">{board.description}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Vendors */}
          {results.vendors && results.vendors.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Vendors ({results.counts.vendors})</h4>
              <div className="space-y-2">
                {results.vendors.map((vendor: any) => (
                  <Link
                    key={vendor.id}
                    href={`/vendors/${vendor.id}`}
                    className="block bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{vendor.name}</div>
                    <div className="text-xs text-gray-600">
                      {vendor.email && <span>{vendor.email}</span>}
                      {vendor.contact && (
                        <span>
                          {vendor.email && ' • '}Contact: {vendor.contact.firstName} {vendor.contact.lastName || ''}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Expenses */}
          {results.expenses && results.expenses.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Expenses ({results.counts.expenses})</h4>
              <div className="space-y-2">
                {results.expenses.map((expense: any) => (
                  <div key={expense.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-medium">
                        {new Date(expense.date).toLocaleDateString()} · {expense.currency} {expense.amount.toFixed(2)}
                      </span>
                      {expense.board && (
                        <Link href={`/boards/${expense.board.id}`} className="text-xs text-blue-600 hover:underline">
                          {expense.board.name}
                        </Link>
                      )}
                    </div>
                    {expense.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{expense.description}</p>
                    )}
                    {expense.category && (
                      <p className="text-xs text-gray-400 mt-1">Category: {expense.category}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budgets */}
          {results.budgets && results.budgets.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Budgets ({results.counts.budgets})</h4>
              <div className="space-y-2">
                {results.budgets.map((budget: any) => (
                  <div key={budget.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span className="font-medium">{budget.name}</span>
                      {budget.board && (
                        <Link href={`/boards/${budget.board.id}`} className="text-xs text-blue-600 hover:underline">
                          {budget.board.name}
                        </Link>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {budget.currency} {budget.amount.toFixed(2)}
                      {budget.category && <span> · {budget.category}</span>}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {budget.startDate && `Start: ${new Date(budget.startDate).toLocaleDateString()}`}
                      {budget.endDate && ` · End: ${new Date(budget.endDate).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.counts.tasks === 0 &&
            results.counts.contacts === 0 &&
            results.counts.boards === 0 &&
            results.counts.vendors === 0 &&
            results.counts.expenses === 0 &&
            results.counts.budgets === 0 && (
              <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No results found for &quot;{query}&quot;</p>
              <p className="text-sm mt-1">Try a different search term</p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
