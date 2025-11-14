import { NextRequest, NextResponse } from 'next/server'
import { STREAMING_SERVER_URL } from '@/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId

    if (!videoId) {
      return NextResponse.json(
        { detail: { code: 'ValidationError', message: 'Video ID is required' } },
        { status: 400 }
      )
    }

    // Get the token from the Authorization header or query parameter
    const authHeader = request.headers.get('authorization')
    const tokenFromQuery = request.nextUrl.searchParams.get('token')
    const token = authHeader?.replace('Bearer ', '') || tokenFromQuery

    if (!token) {
      return NextResponse.json(
        { detail: { code: 'AuthenticationError', message: 'Access token is required' } },
        { status: 401 }
      )
    }

    // Get the Range header for video streaming
    const rangeHeader = request.headers.get('range')

    // Build headers for the streaming server request
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    }

    if (rangeHeader) {
      headers['Range'] = rangeHeader
    }

    // Forward the request to the streaming server
    const response = await fetch(`${STREAMING_SERVER_URL}/api/videos/stream/${videoId}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(errorData, { status: response.status })
    }

    // Get the response body as a stream
    const stream = response.body

    if (!stream) {
      return NextResponse.json(
        { detail: { code: 'ServerError', message: 'No video stream available' } },
        { status: 500 }
      )
    }

    // Get content type and other headers from the streaming server
    const contentType = response.headers.get('content-type') || 'video/mkv'
    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')

    // Build response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
    }

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges
    }

    // Return the streaming response
    return new NextResponse(stream, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error: any) {
    console.error('Error in video proxy:', error)
    return NextResponse.json(
      { detail: { code: 'ServerError', message: error.message || 'Internal server error' } },
      { status: 500 }
    )
  }
}
