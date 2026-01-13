import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    // Next.js 15+ uses async params
    const resolvedParams = await params
    let { filename } = resolvedParams
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    // Decode the filename if it's URL encoded (Next.js automatically encodes params)
    try {
      filename = decodeURIComponent(filename)
    } catch (e) {
      // If decoding fails, use original filename
      console.warn('Failed to decode filename, using original:', filename)
    }

    console.log('Proxying file request:', filename)

    // Get the API URL from environment
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent(filename)}`
    
    // Forward the request to the backend API
    const response = await fetch(apiUrl, {
      headers: {
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
        // Forward authorization if present
        Authorization: request.headers.get('authorization') || '',
      },
      // Allow redirects
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: response.status }
      )
    }

    // Get the content type from the backend response
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    // Get the file data as an array buffer
    const buffer = await response.arrayBuffer()
    
    // Return the file with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Set CORS headers to allow images to load in iframes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache the image for better performance
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error proxying file:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

