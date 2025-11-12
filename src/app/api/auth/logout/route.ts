import { BASE_URL } from '@/constants'
import { NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  try {
    // Forward the refresh token cookie to the backend
    const refreshToken = request.cookies.get('refreshToken')
    
    const response = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(refreshToken && { 'Cookie': `refreshToken=${refreshToken.value}` }),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Clear the refresh token cookie
    const nextResponse = NextResponse.json(data, { status: response.status })
    nextResponse.cookies.delete('refreshToken')
    
    return nextResponse
  } catch (error) {
    console.error('Logout API error:', error)
    
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
