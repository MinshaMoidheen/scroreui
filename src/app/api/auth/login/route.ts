import { BASE_URL } from '@/constants'
import { NextRequest, NextResponse } from 'next/server'



export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          success: false,
          code: 'BadRequest',
          message: 'Email and password are required' 
        }, 
        { status: 400 }
      )
    }

    // Log the request for debugging (remove sensitive data in production)
    console.log('Login request:', {
      email: body.email,
      passwordLength: body.password?.length,
      baseUrl: BASE_URL,
    })

    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    let data
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, read as text for debugging
      const text = await response.text()
      console.error('Non-JSON response from backend:', text)
      return NextResponse.json(
        {
          success: false,
          code: 'Server Error',
          message: 'Invalid response from server',
        },
        { status: 500 }
      )
    }

    if (!response.ok) {
      // Log the full error for debugging
      console.error('Backend login error - Status:', response.status)
      console.error('Backend login error - Data:', JSON.stringify(data, null, 2))
      
      // Ensure error response has proper structure matching RTK Query expectations
      const errorResponse: {
        code: string
        message: string
        errors?: Record<string, { msg?: string; type?: string; value?: string; path?: string; location?: string }>
      } = {
        code: data.code || 'Error',
        message: data.message || 'An error occurred',
      }
      
      // Include validation errors if present
      if (data.errors) {
        // Map the errors to ensure they have the expected structure
        const mappedErrors: Record<string, { msg?: string }> = {}
        Object.entries(data.errors).forEach(([field, errorDetails]: [string, any]) => {
          mappedErrors[field] = {
            msg: errorDetails.msg || errorDetails.message || 'Invalid value',
          }
        })
        errorResponse.errors = mappedErrors
        
        // Extract first error message if no general message
        if (!errorResponse.message || errorResponse.message === 'An error occurred') {
          const firstError = Object.values(mappedErrors)[0]
          if (firstError?.msg) {
            errorResponse.message = firstError.msg
          }
        }
      }
      
      return NextResponse.json(errorResponse, { status: response.status })
    }

    // Set the refresh token cookie if it exists
    const refreshToken = response.headers.get('set-cookie')
    if (refreshToken) {
      const nextResponse = NextResponse.json(data, { status: response.status })
      nextResponse.headers.set('set-cookie', refreshToken)
      return nextResponse
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Login API error:', error)
    
    // Handle different types of errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { 
          success: false,
          code: 'BadRequest',
          message: 'Invalid JSON in request body' 
        }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        code: 'Server Error',
        message: 'Internal server error' 
      }, 
      { status: 500 }
    )
  }
}
