import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Globe, Search, Loader2, ExternalLink, Sparkles } from 'lucide-react'
import Button from './ui/Button'
import toast from 'react-hot-toast'

export default function AIWebSearch() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<any>(null)

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const { data } = await axios.post('/api/ai/web-search', { query: searchQuery })
      return data
    },
    onSuccess: (data) => {
      setResult(data)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Search failed')
    }
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return
    }
    searchMutation.mutate(query)
  }

  const handleReset = () => {
    setQuery('')
    setResult(null)
  }

  const suggestions = [
    "What is React Server Components?",
    "Best practices for Next.js 14",
    "How to optimize database queries",
    "Latest trends in AI development"
  ]

  return (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg border-2 border-dashed border-green-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Web Search</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Search the internet and get AI-powered summaries of the results.
      </p>

      {!result ? (
        <>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... e.g., 'What is TypeScript?'"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={searchMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={searchMutation.isPending || !query.trim()}
              className="w-full"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Search with AI
                </>
              )}
            </Button>
          </form>

          {/* Suggestions */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className="text-xs bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{result.query}</h4>
              <p className="text-xs text-gray-500">Source: {result.source}</p>
            </div>
            <button
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* AI Summary */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">AI Summary</span>
            </div>
            {result.summary && result.summary !== 'No summary available.' ? (
              <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">
                I couldn&apos;t generate a concise summary yet, but here are the top sources I found below.
                Try refining your query for more specific results.
              </p>
            )}
          </div>

          {/* Search Results */}
          {result.searchResults && (
            <div className="space-y-3">
              {result.searchResults.heading && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Topic</h5>
                  <p className="text-sm text-gray-700">{result.searchResults.heading}</p>
                </div>
              )}

              {result.searchResults.abstract && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Overview</h5>
                  <p className="text-sm text-gray-700">{result.searchResults.abstract}</p>
                  {result.searchResults.abstractURL && (
                    <a
                      href={result.searchResults.abstractURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      Read more <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {result.searchResults.answer && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Quick Answer</h5>
                  <p className="text-sm text-gray-700">{result.searchResults.answer}</p>
                </div>
              )}

              {result.searchResults.definition && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-1">Definition</h5>
                  <p className="text-sm text-gray-700">{result.searchResults.definition}</p>
                </div>
              )}

              {result.searchResults.relatedTopics && result.searchResults.relatedTopics.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Related Topics</h5>
                  <div className="space-y-2">
                    {result.searchResults.relatedTopics.map((topic: any, index: number) => (
                      <a
                        key={index}
                        href={topic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                          <span>{topic.text}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {result.searchResults.webResults && result.searchResults.webResults.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Top Sources</h5>
                  <div className="space-y-2">
                    {result.searchResults.webResults.map((item: any, index: number) => (
                      <a
                        key={`${item.url}-${index}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <ExternalLink className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.text}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.url}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full mt-4"
          >
            New Search
          </Button>
        </div>
      )}
    </div>
  )
}
