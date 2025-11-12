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

    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      // Ensure error response has proper structure
      const errorResponse = {
        success: false,
        code: data.code || 'Error',
        message: data.message || 'An error occurred',
        ...(data.errors && { errors: data.errors })
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
