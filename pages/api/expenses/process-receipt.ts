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

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_'
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

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

    // Read file content (for text extraction - in production, use OCR service)
    const fileContent = fs.readFileSync(file.filepath, 'utf-8').substring(0, 2000)

    // AI prompt for receipt extraction
    const prompt = `You are an AI that extracts information from receipts. Analyze this receipt and extract the following information in JSON format:

Receipt Content:
${fileContent}

Extract and return ONLY valid JSON in this exact format:
{
  "vendorName": "string",
  "amount": number,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "category": "string (e.g., Office Supplies, Travel, Food, etc.)",
  "items": ["item1", "item2"],
  "taxAmount": number,
  "confidence": 0.95
}

If you cannot extract certain fields, use null. Ensure the JSON is valid.`

    let extractedData
    
    try {
      const response = await fetch(
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
              temperature: 0.2,
              return_full_text: false
            }
          })
        }
      )

      if (!response.ok) {
        console.warn('AI API unavailable, using fallback')
        throw new Error('AI unavailable')
      }

      const hfResponse = await response.json()
      
      if (hfResponse.error?.includes('loading')) {
        throw new Error('Model loading')
      }

      const generatedText = hfResponse[0]?.generated_text || ''
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch (error) {
      console.warn('AI extraction failed, using fallback:', error)
      extractedData = null
    }

    // Fallback: Basic regex extraction
    if (!extractedData) {
      const amountMatch = fileContent.match(/\$?\s*(\d+\.?\d{0,2})/)?.[1]
      const dateMatch = fileContent.match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/)?.[1]
      
      extractedData = {
        vendorName: fileContent.split('\n')[0].substring(0, 50) || 'Unknown Vendor',
        amount: amountMatch ? parseFloat(amountMatch) : 0,
        currency: 'USD',
        date: dateMatch || new Date().toISOString().split('T')[0],
        category: 'Uncategorized',
        items: [],
        taxAmount: null,
        confidence: 0.4
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
