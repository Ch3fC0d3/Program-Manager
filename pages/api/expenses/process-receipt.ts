import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'expenses', 'temp')

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    })
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err)
          else resolve([fields, files])
        })
      }
    )

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Convert image to base64 for OpenAI Vision API
    const fileBuffer = fs.readFileSync(file.filepath)
    const base64Image = fileBuffer.toString('base64')
    const mimeType = file.mimetype || 'image/jpeg'

    let extractedData
    
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `You are an expert at extracting information from receipts. Analyze this receipt image and extract the following information.

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "vendorName": "exact business name from receipt",
  "amount": total_amount_as_number,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "category": "one of: Office Supplies, Travel, Food & Dining, Software & Subscriptions, Marketing, Equipment, Utilities, Professional Services, Other",
  "items": ["item1", "item2"],
  "taxAmount": tax_as_number_or_null,
  "confidence": 0.0_to_1.0
}

IMPORTANT:
- Extract the TOTAL amount (not subtotal)
- Use the exact vendor name as it appears
- Infer the best category based on the vendor/items
- Set confidence based on image clarity (0.9+ if clear, 0.7-0.9 if readable, <0.7 if unclear)
- If you cannot extract a field, use null
- Return ONLY the JSON object, nothing else`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 500,
            temperature: 0.1
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.warn('OpenAI API error:', errorData)
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
      }

      const openaiResponse = await response.json()
      const content = openaiResponse.choices?.[0]?.message?.content || ''
      
      // Extract JSON from response (handle markdown code blocks if present)
      const jsonMatch = content.match(/\{[\s\S]*\}/) || content.match(/```json\s*([\s\S]*?)```/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        extractedData = JSON.parse(jsonStr)
        
        // Ensure amount is a number
        if (extractedData.amount && typeof extractedData.amount === 'string') {
          extractedData.amount = parseFloat(extractedData.amount.replace(/[^0-9.]/g, ''))
        }
        
        // Ensure confidence is set
        if (!extractedData.confidence) {
          extractedData.confidence = 0.85
        }
      } else {
        throw new Error('No valid JSON in response')
      }
    } catch (error: any) {
      console.warn('AI extraction failed, using fallback:', error.message)
      extractedData = null
    }

    // Fallback: Return minimal data if AI extraction fails
    if (!extractedData) {
      extractedData = {
        vendorName: file.originalFilename?.replace(/\.(jpg|jpeg|png|pdf)$/i, '') || 'Unknown Vendor',
        amount: 0,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        items: [],
        taxAmount: null,
        confidence: 0.3
      }
    }

    return res.status(200).json({
      success: true,
      data: extractedData,
      fileName: file.originalFilename,
      file: {
        storagePath: file.filepath,
        filename: path.basename(file.filepath),
        originalName: file.originalFilename || path.basename(file.filepath),
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        url: `/uploads/expenses/temp/${path.basename(file.filepath)}`
      }
    })
  } catch (error: any) {
    console.error('Error processing receipt:', error)
    return res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message 
    })
  }
}
