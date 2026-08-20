const GEMINI_API_KEY = String(
  import.meta.env.VITE_GEMINI_API_KEY ??
    import.meta.env.VITE_GOOGLE_GENAI_API_KEY ??
    ''
).trim()

const GEMINI_MODEL = 'gemini-2.0-flash'

function extractText(payload: any): string {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim()

  return text || ''
}

export async function draftFollowUpEmail(input: {
  customerName: string
  decisionMakerStatus: string
  interestLevel: string
  nextAction: string
  notes: string
}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY to enable email drafting.')
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: [
                  'Write a concise follow-up email after a field sales visit.',
                  'Return plain text only with a subject line and a short body.',
                  `Customer: ${input.customerName}`,
                  `Met: ${input.decisionMakerStatus}`,
                  `Interest: ${input.interestLevel}`,
                  `Next action: ${input.nextAction}`,
                  `Notes: ${input.notes || 'No notes provided.'}`,
                ].join('\n'),
              },
            ],
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`)
  }

  const payload = await response.json()
  const text = extractText(payload)
  if (!text) {
    throw new Error('Gemini returned an empty draft.')
  }

  return text
}
