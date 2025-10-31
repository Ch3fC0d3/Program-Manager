import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Bug, X, Send, Loader2 } from 'lucide-react'
import Button from './ui/Button'
import Input from './ui/Input'
import toast from 'react-hot-toast'

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [severity, setSeverity] = useState('medium')

  const submitBugMutation = useMutation({
    mutationFn: async (bugData: any) => {
      const { data } = await axios.post('/api/bug-reports', bugData)
      return data
    },
    onSuccess: () => {
      toast.success('Bug report submitted! Thank you for helping us improve.')
      setTitle('')
      setDescription('')
      setSteps('')
      setSeverity('medium')
      setIsOpen(false)
    },
    onError: () => {
      toast.error('Failed to submit bug report. Please try again.')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) {
      toast.error('Please fill in title and description')
      return
    }
    submitBugMutation.mutate({
      title,
      description,
      steps,
      severity,
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-16 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-lg transition-all hover:scale-110 z-50"
        title="Report a Bug"
      >
        <Bug className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-16 w-96 bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          <h3 className="font-semibold">Report a Bug</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 rounded p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bug Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the issue"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? What did you expect to happen?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Steps to Reproduce (Optional)
          </label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="low">Low - Minor issue</option>
            <option value="medium">Medium - Affects functionality</option>
            <option value="high">High - Blocks work</option>
            <option value="critical">Critical - System down</option>
          </select>
        </div>

        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
          <p className="font-medium mb-1">Automatically included:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Current page URL</li>
            <li>Browser information</li>
            <li>Your user account</li>
          </ul>
        </div>

        <Button
          type="submit"
          disabled={submitBugMutation.isPending}
          className="w-full"
        >
          {submitBugMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Bug Report
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
