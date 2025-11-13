import { NextRequest, NextResponse } from 'next/server'
import { BASE_URL, STREAMING_SERVER_URL } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    // Get the token from the request
    const authHeader = request.headers.get('authorization')
    console.log('[Recording Start] Auth header present:', !!authHeader)
    console.log('[Recording Start] Auth header starts with Bearer:', authHeader?.startsWith('Bearer '))
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Recording Start] No token provided')
      return NextResponse.json(
        { detail: { code: 'AuthenticationError', message: 'Access denied, no token provided' } },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    console.log('[Recording Start] Token extracted, length:', token?.length)

    // Get the request body first (can only read once in Next.js)
    const body = await request.json()
    console.log('[Recording Start] Request body received')
    
    // Check user role from request body (from localStorage) - this is the primary source
    const userRoleFromRequest = body.user_role
    console.log('[Recording Start] User role from request body (localStorage):', userRoleFromRequest)
    
    // Validate role from localStorage first
    if (!userRoleFromRequest) {
      console.warn('[Recording Start] No user role found in localStorage, denying access')
      return NextResponse.json(
        { 
          detail: { 
            code: 'AuthorizationError', 
            message: 'User role not provided. Please ensure you are logged in correctly.' 
          } 
        },
        { status: 403 }
      )
    }
    
    const userRoleLower = userRoleFromRequest.toLowerCase()
    const allowedRoles = ['teacher', 'admin', 'superadmin']
    
    if (!allowedRoles.includes(userRoleLower)) {
      console.log('[Recording Start] Role check failed - user role not in allowed roles:', userRoleLower)
      return NextResponse.json(
        { 
          detail: { 
            code: 'AuthorizationError', 
            message: `Only teachers, admins, and superadmins can start recordings. Your current role (${userRoleFromRequest}) does not have permission to record meetings.` 
          } 
        },
        { status: 403 }
      )
    }
    
    console.log('[Recording Start] Role check passed using localStorage role:', userRoleFromRequest)
    
    // Skip API token validation if we have a valid role from localStorage
    // The token will be validated by the streaming server anyway
    console.log('[Recording Start] Skipping API token validation - using localStorage role for authorization')

    // Forward the request to the streaming server with the token
    console.log('[Recording Start] Forwarding request to streaming server:', `${STREAMING_SERVER_URL}/start-recording`)
    console.log('[Recording Start] Request body keys:', Object.keys(body))
    console.log('[Recording Start] Request body:', JSON.stringify({ ...body, sdp: body.sdp ? `${body.sdp.substring(0, 100)}...` : 'missing' }, null, 2))
    console.log('[Recording Start] Token length:', token?.length)
    console.log('[Recording Start] Token preview (first 50 chars):', token?.substring(0, 50))
    console.log('[Recording Start] STREAMING_SERVER_URL:', STREAMING_SERVER_URL)
    
    // Prepare the body for streaming server (remove user_role as it's not needed by streaming server)
    const streamingServerBody = {
      sdp: body.sdp,
      type: body.type,
      division_id: body.division_id,
    }
    console.log('[Recording Start] Streaming server body:', JSON.stringify({ ...streamingServerBody, sdp: streamingServerBody.sdp ? `${streamingServerBody.sdp.substring(0, 100)}...` : 'missing' }, null, 2))
    
    // First, test if the streaming server is reachable
    try {
      const healthCheck = await fetch(`${STREAMING_SERVER_URL}/health`, { method: 'GET' }).catch(() => null)
      if (healthCheck) {
        const healthText = await healthCheck.text().catch(() => 'No response')
        console.log('[Recording Start] Streaming server health check:', healthText)
      } else {
        console.warn('[Recording Start] Could not reach streaming server health endpoint')
      }
    } catch (e) {
      console.warn('[Recording Start] Health check failed:', e)
    }
    
    try {
      const response = await fetch(`${STREAMING_SERVER_URL}/start-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(streamingServerBody),
      })

      console.log('[Recording Start] Streaming server response status:', response.status, response.statusText)
      console.log('[Recording Start] Streaming server response headers:', Object.fromEntries(response.headers.entries()))
      
      // Get response as text first to handle both JSON and non-JSON responses
      const responseText = await response.text()
      console.log('[Recording Start] Streaming server raw response:', responseText.substring(0, 500))
      
      let data: any
      try {
        data = JSON.parse(responseText)
        console.log('[Recording Start] Streaming server response data:', JSON.stringify(data, null, 2))
      } catch (parseError) {
        console.error('[Recording Start] Failed to parse streaming server response as JSON:', parseError)
        console.error('[Recording Start] Full response text:', responseText)
        // If it's an error response and not JSON, create a structured error
        if (!response.ok) {
          // Try to extract more details from HTML error pages
          let errorMessage = responseText
          if (responseText.includes('<title>')) {
            const titleMatch = responseText.match(/<title>(.*?)<\/title>/i)
            if (titleMatch) errorMessage = titleMatch[1]
          } else if (responseText.includes('Traceback')) {
            // Extract Python traceback if present
            const tracebackMatch = responseText.match(/Traceback[\s\S]*?(?=\n\n|$)/)
            if (tracebackMatch) errorMessage = tracebackMatch[0].substring(0, 500)
          }
          
          return NextResponse.json(
            {
              detail: {
                code: 'ServerError',
                message: `Streaming server returned ${response.status} ${response.statusText}. ${errorMessage.substring(0, 500)}. Please check the streaming server logs for more details.`
              }
            },
            { status: response.status }
          )
        }
        // If successful but not JSON, that's unexpected
        throw new Error(`Streaming server returned non-JSON response: ${responseText.substring(0, 200)}`)
      }
      
      // Log the exact error message from streaming server
      if (data.detail?.message) {
        console.log('[Recording Start] Streaming server error message:', data.detail.message)
      }

    if (!response.ok) {
      console.log('[Recording Start] Streaming server returned error:', data)
      // If the error is about token validation, provide helpful message
      if (data.detail?.code === 'AuthenticationError' || data.detail?.message?.includes('token') || data.detail?.message?.includes('invalid')) {
        return NextResponse.json(
          {
            detail: {
              code: 'AuthenticationError',
              message: 'The streaming server rejected the token. This usually happens when: 1) The JWT_SECRET values don\'t match between servers, OR 2) You\'re using an old token generated before the JWT_SECRET was updated. Please: 1) Ensure both servers use the same JWT_SECRET (athenora-api uses JWT_ACCESS_SECRET, streaming server uses JWT_SECRET), 2) Restart both servers, 3) Log out and log back in to get a new token with the updated secret.'
            }
          },
          { status: 401 }
        )
      }
      return NextResponse.json(data, { status: response.status })
    }

      console.log('[Recording Start] Recording started successfully')
      return NextResponse.json(data)
    } catch (fetchError: any) {
      console.error('[Recording Start] Error calling streaming server:', fetchError)
      return NextResponse.json(
        { 
          detail: { 
            code: 'ServerError', 
            message: `Failed to connect to streaming server: ${fetchError.message}. Please ensure the streaming server is running at ${STREAMING_SERVER_URL}` 
          } 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Recording Start] Error in recording proxy:', error)
    return NextResponse.json(
      { detail: { code: 'ServerError', message: error.message || 'Internal server error' } },
      { status: 500 }
    )
  }
}

