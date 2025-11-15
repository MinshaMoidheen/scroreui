import { NextRequest, NextResponse } from 'next/server'
import { STREAMING_SERVER_URL } from '@/constants'

export async function OPTIONS() {
  // Handle preflight requests for CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

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
    console.log(`[Video Proxy] Fetching video ${videoId} from ${STREAMING_SERVER_URL}/api/videos/stream/${videoId}`)
    
    const response = await fetch(`${STREAMING_SERVER_URL}/api/videos/stream/${videoId}`, {
      method: 'GET',
      headers,
    })

    console.log(`[Video Proxy] Response status: ${response.status} ${response.statusText}`)
    console.log(`[Video Proxy] Content-Type: ${response.headers.get('content-type')}`)
    console.log(`[Video Proxy] Content-Length: ${response.headers.get('content-length')}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error(`[Video Proxy] Error response:`, errorData)
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
    // Backend serves WebM format, so default to video/webm
    const contentType = response.headers.get('content-type') || 'video/webm'
    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')

    // Build response headers for video streaming
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges || 'bytes',
      'Cache-Control': 'no-cache',
      // CORS headers for video streaming
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    }

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange
    }

    // Return the streaming response with proper status code
    // 206 for partial content (range requests), 200 for full content
    return new NextResponse(stream, {
      status: response.status, // This will be 206 for range requests or 200 for full
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
