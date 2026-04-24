export type SmsSendInput = {
  to: string
  body: string
}

export type SmsSendResult = {
  providerMessageId: string | null
  status: 'queued' | 'sent' | 'mocked'
}

type TwilioSmsConfig =
  | {
      mode: 'twilio'
      accountSid: string
      authToken: string
      messagingServiceSid?: string
      fromPhoneNumber?: string
    }
  | {
      mode: 'mock'
    }
  | {
      mode: 'disabled'
      errorMessage: string
    }

type TwilioSmsDeps = {
  fetchImpl?: typeof fetch
  config?: TwilioSmsConfig
}

function getTwilioSmsConfig(): TwilioSmsConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()
  const fromPhoneNumber = process.env.TWILIO_FROM_NUMBER?.trim()

  if (
    accountSid &&
    authToken &&
    (messagingServiceSid || fromPhoneNumber)
  ) {
    return {
      mode: 'twilio',
      accountSid,
      authToken,
      messagingServiceSid: messagingServiceSid || undefined,
      fromPhoneNumber: fromPhoneNumber || undefined,
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      mode: 'disabled',
      errorMessage:
        'Twilio SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER.',
    }
  }

  return { mode: 'mock' }
}

export function createTwilioSmsSender(deps: TwilioSmsDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch
  const config = deps.config ?? getTwilioSmsConfig()

  return async function sendTwilioSms(input: SmsSendInput): Promise<SmsSendResult> {
    if (config.mode === 'mock') {
      return {
        providerMessageId: `mock-${Date.now()}`,
        status: 'mocked',
      }
    }

    if (config.mode === 'disabled') {
      throw new Error(config.errorMessage)
    }

    const body = new URLSearchParams({
      To: input.to,
      Body: input.body,
    })
    if (config.messagingServiceSid) {
      body.set('MessagingServiceSid', config.messagingServiceSid)
    }
    if (config.fromPhoneNumber) {
      body.set('From', config.fromPhoneNumber)
    }

    const response = await fetchImpl(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.accountSid}:${config.authToken}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    )

    const text = await response.text()
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = JSON.parse(text) as Record<string, unknown>
    } catch {
      parsed = null
    }

    if (!response.ok) {
      const message =
        typeof parsed?.message === 'string'
          ? parsed.message
          : text.slice(0, 300) || `Twilio request failed (${response.status})`
      throw new Error(message)
    }

    return {
      providerMessageId: typeof parsed?.sid === 'string' ? parsed.sid : null,
      status: typeof parsed?.status === 'string' && parsed.status === 'sent' ? 'sent' : 'queued',
    }
  }
}

export const sendTwilioSms = createTwilioSmsSender()
