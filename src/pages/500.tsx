'use client'

export default function Custom500() {
    return (
        <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', padding: 24 }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>500 - Server error</h1>
                <p style={{ color: '#666' }}>Something went wrong. Please try again later.</p>
            </div>
        </main>
    )
}


