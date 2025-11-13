import { NextRequest, NextResponse } from 'next/server'
import { STREAMING_SERVER_URL } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json()

    // Forward the request to the streaming server
    // Note: stop-recording doesn't require authentication according to the API docs
    const response = await fetch(`${STREAMING_SERVER_URL}/stop-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in stop recording proxy:', error)
    return NextResponse.json(
      { detail: { code: 'ServerError', message: error.message || 'Internal server error' } },
      { status: 500 }
    )
  }
}

