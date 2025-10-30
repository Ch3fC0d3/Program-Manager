# Playwright Testing with AI-Powered Summaries

Automated testing for Program Manager using Playwright and GPT4All for intelligent test summaries.

## Setup

### 1. Install Dependencies

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install
```

### 2. Configure GPT4All (Local AI)

1. Open GPT4All desktop app
2. Go to **Settings** → **Application** → **Advanced**
3. Enable **"Local API Server"** (default port: 4891)
4. Verify it's running:
   ```bash
   curl http://localhost:4891/v1/models
   ```

### 3. Set Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
AI_BACKEND=gpt4all
GPT4ALL_BASE_URL=http://127.0.0.1:4891/v1
GPT4ALL_MODEL="Llama 3.2 1B Instruct"
BASE_URL=https://program-manager-iota.vercel.app
```

## Running Tests

### Basic Test Run
```bash
npm test
```

### Interactive UI Mode
```bash
npm run test:ui
```

### Headed Mode (See Browser)
```bash
npm run test:headed
```

### Specific Test File
```bash
npx playwright test tests/smoke.spec.js
```

### With Different AI Backend
```bash
# Using Hugging Face
AI_BACKEND=hf HF_TOKEN=your_token npm test

# Using Ollama
AI_BACKEND=ollama OLLAMA_MODEL=llama3.1:8b npm test
```

## What Gets Tested

### Smoke Tests (`smoke.spec.js`)
- ✅ Homepage loads and is accessible
- ✅ Login page functionality
- ✅ Authentication redirects
- ✅ Manifest and favicon availability
- ✅ API endpoint status codes
- ✅ Accessibility (a11y) violations
- ✅ Console errors

### AI Summary
After tests complete, GPT4All generates an intelligent summary including:
- Issues grouped by severity
- Page-specific problems
- Suggested code fixes (HTML/CSS/JS)
- Accessibility recommendations

## Supported AI Backends

| Backend | Type | Setup |
|---------|------|-------|
| **GPT4All** | Local | Enable API server in app settings |
| **Ollama** | Local | `ollama pull llama3.1:8b` |
| **LM Studio** | Local | Start server in LM Studio |
| **Hugging Face** | Hosted | Get free API token |
| **Cloudflare Workers AI** | Hosted | Get account ID + API token |

## Example Output

```
=== TEST FINDINGS ===
{
  "errors": [],
  "a11y": [
    {
      "page": "Homepage",
      "violations": 2,
      "details": [...]
    }
  ],
  "statuses": [
    { "page": "Homepage", "status": "loaded" },
    { "page": "Login", "status": "loaded" }
  ]
}

=== AI SUMMARY ===
## Test Summary

**Overall Status**: 5/6 tests passed

### Critical Issues
- None detected

### Accessibility Violations (2)
**Homepage**:
1. Missing alt text on logo image
   - Fix: Add `alt="Program Manager Logo"` to img tag
2. Low contrast on secondary buttons
   - Fix: Update button color from #9ca3af to #6b7280

### Recommendations
- All core functionality working correctly
- Consider adding ARIA labels to navigation
- Manifest and favicon loading properly

====================
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
        env:
          BASE_URL: ${{ secrets.VERCEL_URL }}
          AI_BACKEND: hf
          HF_TOKEN: ${{ secrets.HF_TOKEN }}
```

## Troubleshooting

### GPT4All Not Responding
- Ensure Local API Server is enabled in GPT4All settings
- Check port 4891 is not blocked by firewall
- Verify model is downloaded in GPT4All

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check network connection to deployed app
- Verify BASE_URL is correct

### AI Summary Empty
- Check AI_BACKEND environment variable
- Verify API credentials (if using hosted backend)
- Check console for AI backend errors

## Best Practices

1. **Run tests before deploying** to catch issues early
2. **Review AI summaries** for actionable insights
3. **Update tests** when adding new features
4. **Use headed mode** when debugging test failures
5. **Keep GPT4All running** during development for fast feedback
