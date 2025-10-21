import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0'

interface FunctionResponse {
  success: boolean
  message?: string
  details?: Record<string, unknown>
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars')
}

if (!GOOGLE_AI_API_KEY) {
  console.error('Missing GOOGLE_AI_API_KEY')
}

const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY ?? '', {
  auth: { persistSession: false }
})

const AUTO_PLACE_THRESHOLD = 0.92
const SUGGEST_THRESHOLD = 0.85

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Received request body:', JSON.stringify(body, null, 2))
    
    // Handle both direct cardId and nested record structure from webhooks
    const cardId = body.cardId || body.record?.id || body.id

    if (!cardId) {
      console.error('No cardId found in request body:', body)
      return jsonResponse({ success: false, message: 'cardId is required', details: { receivedBody: body } }, 400)
    }

    console.log('Processing card:', cardId)

    const { data: card, error: cardError } = await supabase
      .from('Task')
      .select('*')
      .eq('id', cardId)
      .single()

    if (cardError || !card) {
      console.error('Failed to load card', cardError)
      return jsonResponse({ success: false, message: 'Card not found' }, 404)
    }

    const [{ data: parents }, { data: vendors }, { data: contacts }] = await Promise.all([
      supabase
        .from('Task')
        .select('id,title,parentId')
        .is('deletedAt', null),
      supabase
        .from('Vendor')
        .select('id,name,tags'),
      supabase
        .from('Contact')
        .select('id,firstName,lastName,email,isVendor')
    ])

    const parentList = parents ?? []
    const vendorList = vendors ?? []
    const contactList = contacts ?? []

    const vendorNames = vendorList.map((v) => `- ${v.name}`).join('\n') || '- (none)'
    const contactNames = contactList
      .map((c) => `- ${[c.firstName, c.lastName].filter(Boolean).join(' ')}${c.email ? ` (${c.email})` : ''}`)
      .join('\n') || '- (none)'

    const parentTitles = parentList.map((p) => `- ${p.title}`).join('\n') || '- (none)'

    // Call Google Gemini API
    const prompt = `You organize project execution cards into a nested tree. Respond with JSON matching the schema {"summary":string,"labels":string[],"suggested_parent_title":string|null,"suggested_links":{"vendors":string[],"contacts":string[]},"confidence":number}.

Card title: ${card.title}
Card body: ${card.description ?? ''}

Candidate parents:
${parentTitles}

Known vendors:
${vendorNames}

Known contacts:
${contactNames}`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return jsonResponse({ success: false, message: 'AI API error', details: { error: errorText } }, 500)
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response:', JSON.stringify(geminiData, null, 2))
    
    const payloadRaw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!payloadRaw) {
      console.error('No text in Gemini response')
      return jsonResponse({ success: false, message: 'AI returned empty response', details: { geminiData } }, 500)
    }

    console.log('Raw AI response:', payloadRaw)

    // Clean up potential markdown code blocks
    let cleanedPayload = payloadRaw.trim()
    if (cleanedPayload.startsWith('```json')) {
      cleanedPayload = cleanedPayload.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedPayload.startsWith('```')) {
      cleanedPayload = cleanedPayload.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    const payload = JSON.parse(cleanedPayload) as {
      summary: string
      labels: string[]
      suggested_parent_title: string | null
      suggested_links: { vendors: string[]; contacts: string[] }
      confidence: number
    }

    const suggestedParent = parentList.find((p) => p.title === payload.suggested_parent_title) ?? null

    const suggestedVendorIds = vendorList
      .filter((vendor) => payload.suggested_links.vendors.includes(vendor.name))
      .map((vendor) => vendor.id)

    const suggestedContactIds = contactList
      .filter((contact) => {
        const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ')
        return payload.suggested_links.contacts.includes(fullName)
      })
      .map((contact) => contact.id)

    const intakeStatus = payload.confidence >= SUGGEST_THRESHOLD ? 'SUGGESTED' : 'INBOX'

    const suggestionUpdate = await supabase
      .from('Task')
      .update({
        aiSummary: payload.summary,
        aiLabels: payload.labels,
        aiSuggestedParentId: suggestedParent?.id ?? null,
        aiSuggestedLinks: {
          vendors: suggestedVendorIds,
          contacts: suggestedContactIds
        },
        aiConfidence: payload.confidence,
        intakeStatus
      })
      .eq('id', cardId)
      .select('id')
      .maybeSingle()

    if (suggestionUpdate.error) {
      console.error('Failed to update AI suggestion', suggestionUpdate.error)
      return jsonResponse({ success: false, message: 'Failed to update suggestion' }, 500)
    }

    let autoApplied = false

    if (payload.confidence >= AUTO_PLACE_THRESHOLD && suggestedParent) {
      const { error: applyError } = await supabase.rpc('apply_ai_suggestion', {
        p_card_id: cardId,
        p_parent_id: suggestedParent.id,
        p_vendor_ids: suggestedVendorIds,
        p_contact_ids: suggestedContactIds,
        p_summary: payload.summary,
        p_labels: payload.labels,
        p_confidence: payload.confidence
      })

      if (!applyError) {
        autoApplied = true
      } else {
        console.warn('Auto apply failed, leaving as suggestion', applyError)
      }
    }

    return jsonResponse({
      success: true,
      message: autoApplied ? 'Suggestion applied automatically' : 'Suggestion stored',
      details: {
        autoApplied,
        suggestion: payload
      }
    })
  } catch (error) {
    console.error('AI suggester error', error)
    return jsonResponse({ success: false, message: 'Unhandled error', details: { error: String(error) } }, 500)
  }
})

function jsonResponse(body: FunctionResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
