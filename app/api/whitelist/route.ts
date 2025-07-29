import { NextRequest, NextResponse } from 'next/server'
import { whitelistService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, email, networkPreference, walletBalance } = body

    // Validate required fields
    if (!walletAddress || !email || !networkPreference || !walletBalance) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate network preference
    if (!['ETH', 'BNB'].includes(networkPreference)) {
      return NextResponse.json(
        { error: 'Invalid network preference' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already has complete registration
    const registrationStatus = await whitelistService.getUserRegistrationStatus(walletAddress)
    
    if (registrationStatus.is_complete) {
      return NextResponse.json(
        { error: 'User has already completed registration for both networks' },
        { status: 409 }
      )
    }

    // Check if user already registered for this specific network
    const hasNetworkRegistration = networkPreference === 'ETH' ? registrationStatus.has_eth : registrationStatus.has_bnb
    
    if (hasNetworkRegistration) {
      return NextResponse.json(
        { error: `User has already registered for ${networkPreference} network` },
        { status: 409 }
      )
    }

    // Add whitelist registration
    const registration = await whitelistService.addWhitelistRegistration({
      wallet_address: walletAddress,
      email: email,
      network_preference: networkPreference,
      wallet_balance: walletBalance,
      status: 'active'
    })

    return NextResponse.json({
      success: true,
      registration,
      message: 'Whitelist registration successful'
    })

  } catch (error: any) {
    console.error('Error in whitelist registration:', error)
    
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Registration already exists for this wallet and network' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to register for whitelist' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get user registration status
    const registrationStatus = await whitelistService.getUserRegistrationStatus(walletAddress)
    
    // Get user registrations if they have any
    let registrations = []
    if (registrationStatus.registration_count > 0) {
      registrations = await whitelistService.getUserRegistrations(walletAddress)
    }

    return NextResponse.json({
      success: true,
      registrationStatus,
      registrations
    })

  } catch (error) {
    console.error('Error getting whitelist status:', error)
    return NextResponse.json(
      { error: 'Failed to get whitelist status' },
      { status: 500 }
    )
  }
} 