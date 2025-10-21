import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_'
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

// Using DuckDuckGo's instant answer API (free, no key required)
async function searchWeb(query: string) {
  try {
    // DuckDuckGo Instant Answer API
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    )
    const data = await response.json()
    
    // Extract relevant information
    const results = {
      abstract: data.Abstract || '',
      abstractSource: data.AbstractSource || '',
      abstractURL: data.AbstractURL || '',
      relatedTopics: (data.RelatedTopics || [])
        .filter((topic: any) => topic.Text && topic.FirstURL)
        .slice(0, 5)
        .map((topic: any) => ({
          text: topic.Text,
          url: topic.FirstURL
        })),
      answer: data.Answer || '',
      definition: data.Definition || '',
      definitionSource: data.DefinitionSource || ''
    }
    
    return results
  } catch (error) {
    console.error('Search error:', error)
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query } = req.body

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    // Search the web
    const searchResults = await searchWeb(query)

    if (!searchResults) {
      return res.status(500).json({ error: 'Search failed' })
    }

    console.log('DuckDuckGo Results:', {
      hasAbstract: !!searchResults.abstract,
      hasAnswer: !!searchResults.answer,
      hasDefinition: !!searchResults.definition,
      relatedTopicsCount: searchResults.relatedTopics.length
    })

    // Use AI to summarize and enhance the results
    const contextText = `
Abstract: ${searchResults.abstract}
Answer: ${searchResults.answer}
Definition: ${searchResults.definition}
Related Topics: ${searchResults.relatedTopics.map((t: any) => t.text).join('; ')}
    `.trim()

    if (!contextText || contextText.length < 10) {
      // No good results, return a simple message
      return res.status(200).json({
        query,
        summary: `No detailed information found for "${query}". Try refining your search or using different keywords.`,
        searchResults: null,
        source: 'No Results'
      })
    }

    // Generate AI summary of search results
    let aiSummary = 'Unable to generate summary.'
    
    try {
      const prompt = `Based on this web search information, provide a clear and concise answer to: "${query}"

Information found:
${contextText}

Provide a helpful summary:`

      const aiResponse = await fetch(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 400,
              temperature: 0.5,
              return_full_text: false
            }
          })
        }
      )

      if (aiResponse.ok) {
        const hfResponse = await aiResponse.json()
        console.log('HF Response:', hfResponse)
        
        if (Array.isArray(hfResponse) && hfResponse[0]?.generated_text) {
          aiSummary = hfResponse[0].generated_text.trim()
        } else if (hfResponse.error) {
          console.error('HF API Error:', hfResponse.error)
          // Fallback to search results
          aiSummary = searchResults.abstract || searchResults.answer || searchResults.definition || 'No summary available.'
        }
      } else {
        const errorData = await aiResponse.json()
        console.error('HF API Error Response:', errorData)
        // Fallback to search results
        aiSummary = searchResults.abstract || searchResults.answer || searchResults.definition || 'No summary available.'
      }
    } catch (aiError) {
      console.error('AI Summary Error:', aiError)
      // Fallback to search results
      aiSummary = searchResults.abstract || searchResults.answer || searchResults.definition || 'No summary available.'
    }

    return res.status(200).json({
      query,
      summary: aiSummary.trim(),
      searchResults: {
        abstract: searchResults.abstract,
        abstractSource: searchResults.abstractSource,
        abstractURL: searchResults.abstractURL,
        relatedTopics: searchResults.relatedTopics,
        answer: searchResults.answer,
        definition: searchResults.definition
      },
      source: searchResults.abstractSource || 'Web Search'
    })
  } catch (error: any) {
    console.error('Error in web search:', error)
    return res.status(500).json({ 
      error: 'Search failed',
      details: error.message 
    })
  }
}
