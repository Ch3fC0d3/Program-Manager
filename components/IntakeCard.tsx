import { Sparkles, Check, X } from 'lucide-react'
import Button from './ui/Button'

interface IntakeCardProps {
  card: any
  onAccept: () => void
  onReject: () => void
  onOpen: () => void
  isProcessing: boolean
}

export default function IntakeCard({ card, onAccept, onReject, onOpen, isProcessing }: IntakeCardProps) {
  const confidence = typeof card.aiConfidence === 'number' ? Math.round(card.aiConfidence * 100) : null
  const labels = Array.isArray(card.aiLabels) ? card.aiLabels : []

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
      <button
        type="button"
        className="w-full text-left"
        onClick={onOpen}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <h4 className="font-semibold text-gray-900 truncate">{card.title}</h4>
        </div>
        {confidence !== null && (
          <p className="text-xs text-gray-500 mt-1">Confidence {confidence}%</p>
        )}
        {card.aiSummary && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{card.aiSummary}</p>
        )}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {labels.map((label: string) => (
              <span key={label} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {label}
              </span>
            ))}
          </div>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        <Button
          variant="secondary"
          className="flex-1 flex items-center justify-center gap-2"
          onClick={onReject}
          disabled={isProcessing}
        >
          <X size={16} />
          Reject
        </Button>
        <Button
          className="flex-1 flex items-center justify-center gap-2"
          onClick={onAccept}
          disabled={isProcessing}
        >
          <Check size={16} />
          Accept
        </Button>
      </div>
    </div>
  )
}
