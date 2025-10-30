// AI Backend for Playwright test summaries
// Supports GPT4All (local), Ollama, LM Studio, Hugging Face, Cloudflare Workers AI

export async function summarize(findings) {
  const text = JSON.stringify(findings).slice(0, 12000)
  const prompt = `You are a QA lead. Summarize issues by severity, page, and suggested code fixes.
Prefer concrete HTML/CSS/JS remedies. Keep it under 400 words.

DATA:
${text}`

  const backend = (process.env.AI_BACKEND || 'gpt4all').toLowerCase()
  
  if (backend === 'gpt4all') return summarizeGpt4All(prompt)
  if (backend === 'ollama') return summarizeOllama(prompt)
  if (backend === 'lmstudio') return summarizeLMStudio(prompt)
  if (backend === 'hf') return summarizeHF(prompt)
  if (backend === 'cloudflare') return summarizeCloudflare(prompt)
  
  return 'No AI backend configured; set AI_BACKEND to gpt4all | ollama | lmstudio | hf | cloudflare.'
}

// --- GPT4All (local, free) ------------------------------------------------
// 1) Enable Local API Server in GPT4All Settings → Application → Advanced
// 2) Default port: 4891, Base URL: http://localhost:4891/v1
async function summarizeGpt4All(prompt) {
  const baseURL = process.env.GPT4ALL_BASE_URL || 'http://127.0.0.1:4891/v1'
  const model = process.env.GPT4ALL_MODEL || await firstLocalModel(baseURL)

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer local' 
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a concise, practical QA lead.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 500
    })
  })
  
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || JSON.stringify(data)
}

async function firstLocalModel(baseURL) {
  try {
    const r = await fetch(`${baseURL}/models`)
    const j = await r.json()
    return j?.data?.[0]?.id || 'Llama 3.2 1B Instruct'
  } catch (error) {
    console.error('Failed to fetch GPT4All models:', error)
    return 'Llama 3.2 1B Instruct'
  }
}

// --- Ollama (local, free) -------------------------------------------------
async function summarizeOllama(prompt) {
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b'
  const res = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a concise, practical QA lead.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    })
  })
  const data = await res.json()
  return data?.message?.content || JSON.stringify(data)
}

// --- LM Studio (local, free; OpenAI-compatible) ---------------------------
async function summarizeLMStudio(prompt) {
  const base = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234/v1'
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'Authorization': 'Bearer lm-studio' 
    },
    body: JSON.stringify({
      model: process.env.LMSTUDIO_MODEL || 'local-model',
      messages: [
        { role: 'system', content: 'You are a concise, practical QA lead.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  })
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || JSON.stringify(data)
}

// --- Hugging Face Inference API (hosted; free tier) -----------------------
async function summarizeHF(prompt) {
  const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY
  const model = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
  
  if (!token) return 'HF_TOKEN or HUGGINGFACE_API_KEY missing.'
  
  const payload = {
    inputs: `You are a QA lead.\n\nUser:\n${prompt}\n\nAssistant:`,
    parameters: { 
      max_new_tokens: 500, 
      temperature: 0.2, 
      return_full_text: false 
    }
  }
  
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(payload)
  })
  
  const data = await res.json()
  
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim()
  }
  if (data?.generated_text) return data.generated_text.trim()
  
  return typeof data === 'string' ? data : JSON.stringify(data)
}

// --- Cloudflare Workers AI (hosted; free tier) ----------------------------
async function summarizeCloudflare(prompt) {
  const acct = process.env.CF_ACCOUNT_ID
  const token = process.env.CF_API_TOKEN
  const model = process.env.CF_MODEL || '@cf/meta/llama-3.1-8b-instruct'
  
  if (!acct || !token) {
    return 'CF_ACCOUNT_ID or CF_API_TOKEN missing.'
  }
  
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        messages: [
          { role: 'system', content: 'You are a concise, practical QA lead.' },
          { role: 'user', content: prompt }
        ]
      })
    }
  )
  
  const data = await res.json()
  return data?.result?.response || JSON.stringify(data)
}
