import { NextResponse } from 'next/server'
import { whitelistService } from '@/lib/supabase'

export async function GET() {
  try {
    const stats = await whitelistService.getWhitelistStats()
    
    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error getting whitelist stats:', error)
    return NextResponse.json(
      { error: 'Failed to get whitelist statistics' },
      { status: 500 }
    )
  }
} 