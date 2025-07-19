import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, password } = await request.json();

    // Sadece belirtilen wallet address'e izin ver
    const allowedWalletAddress = "0x7B76EEd8E62Ccc76d449240853E400c42AFC4e19";
    
    if (walletAddress !== allowedWalletAddress) {
      return NextResponse.json(
        { error: 'Unauthorized wallet address' },
        { status: 403 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Şifreyi hash'le
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Kullanıcıyı kontrol et ve şifreyi ayarla
    const user = await userService.getUserByWallet(walletAddress);
    
    if (!user) {
      // Kullanıcı yoksa oluştur
      await userService.addUser(walletAddress);
    }

    // Şifreyi ayarla
    await userService.setUserPassword(walletAddress, passwordHash);

    return NextResponse.json(
      { success: true, message: 'Admin password set successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 