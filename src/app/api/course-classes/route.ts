import { BASE_URL } from '@/constants'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/course-classes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BASE_URL}/api/v1/course-classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error creating course class:', error)
    return NextResponse.json(
      { error: 'Failed to create course class' },
      { status: 500 }
    )
  }
}
