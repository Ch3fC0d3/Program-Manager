export interface ParsedContactNoteEntry {
  label: string
  value: string | string[]
}

export interface ParsedContactNote {
  estimate: ParsedContactNoteEntry[]
  customer: ParsedContactNoteEntry[]
  location: ParsedContactNoteEntry[]
  vendor: ParsedContactNoteEntry[]
  totals: ParsedContactNoteEntry[]
  lineItems: string[]
  other: ParsedContactNoteEntry[]
}

const KEY_VALUE_REGEX = /^([^:]+):\s*(.*)$/

type ParsedContactNoteGroup = keyof Omit<ParsedContactNote, 'lineItems'>

interface FieldMeta {
  label: string
  group: ParsedContactNoteGroup
  multiLine?: boolean
  treatAsLineItems?: boolean
}

const FIELD_METADATA: Record<string, FieldMeta> = {
  'estimate': { label: 'Estimate', group: 'estimate' },
  'estimate number': { label: 'Estimate #', group: 'estimate' },
  'date': { label: 'Date', group: 'estimate' },
  'name address': { label: 'Customer', group: 'customer', multiLine: true },
  'job location': { label: 'Job Location', group: 'location', multiLine: true },
  'signature': { label: 'Signature', group: 'vendor', multiLine: true },
  'total': { label: 'Total', group: 'totals' },
  'subtotal': { label: 'Subtotal', group: 'totals' },
  'sales tax 3 965': { label: 'Sales Tax (3.965%)', group: 'totals' },
  'sales tax': { label: 'Sales Tax', group: 'totals' },
  'line items': { label: 'Line Items', group: 'other', multiLine: true },
  'descriptionqtyratetotal': { label: 'Line Items', group: 'other', multiLine: true, treatAsLineItems: true }
}

const normalizeKey = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/#/g, ' number ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const collectValueLines = (lines: string[], startIndex: number): { values: string[]; nextIndex: number } => {
  const collected: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const candidate = lines[index]
    if (!candidate) {
      index += 1
      continue
    }

    if (KEY_VALUE_REGEX.test(candidate)) {
      break
    }

    const normalizedCandidate = normalizeKey(candidate.replace(/:$/, ''))
    if (FIELD_METADATA[normalizedCandidate]) {
      break
    }

    collected.push(candidate)
    index += 1
  }

  return { values: collected, nextIndex: index }
}

const pushEntry = (
  target: ParsedContactNote,
  meta: FieldMeta | undefined,
  fallbackLabel: string,
  values: string[]
) => {
  if (meta?.treatAsLineItems) {
    if (values.length > 0) {
      target.lineItems.push(...values)
    }
    return
  }

  const label = meta?.label ?? fallbackLabel
  if (!label) {
    return
  }

  const group = meta?.group ?? 'other'
  const entryValues = meta?.multiLine || values.length > 1 ? values : values[0] ?? ''

  if ((Array.isArray(entryValues) && entryValues.length === 0) || (!Array.isArray(entryValues) && !entryValues)) {
    return
  }

  target[group].push({
    label,
    value: entryValues
  })
}

export function parseContactNotes(notes: string | null | undefined): ParsedContactNote | null {
  if (!notes) {
    return null
  }

  const result: ParsedContactNote = {
    estimate: [],
    customer: [],
    location: [],
    vendor: [],
    totals: [],
    lineItems: [],
    other: []
  }

  const rawLines = notes.split(/\r?\n/).map((line) => line.trim())
  const lines = rawLines.filter((line) => line.length > 0)

  if (lines.length === 0) {
    return result
  }

  const leftover: string[] = []
  const flushLeftover = () => {
    if (leftover.length > 0) {
      result.other.push({ label: 'Additional Details', value: [...leftover] })
      leftover.length = 0
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const colonMatch = line.match(KEY_VALUE_REGEX)

    if (colonMatch) {
      flushLeftover()
      const keyNormalized = normalizeKey(colonMatch[1])
      const meta = FIELD_METADATA[keyNormalized]
      const inlineValue = colonMatch[2].trim()

      if (inlineValue) {
        pushEntry(result, meta, colonMatch[1].trim(), [inlineValue])
      } else {
        const { values, nextIndex } = collectValueLines(lines, index + 1)
        pushEntry(result, meta, colonMatch[1].trim(), values)
        index = nextIndex - 1
      }
      continue
    }

    const normalized = normalizeKey(line.replace(/:$/, ''))
    const meta = FIELD_METADATA[normalized]

    if (meta) {
      flushLeftover()
      const { values, nextIndex } = collectValueLines(lines, index + 1)
      pushEntry(result, meta, line.replace(/:$/, '').trim(), values)
      index = nextIndex - 1
      continue
    }

    leftover.push(line)
  }

  flushLeftover()

  return result
}
