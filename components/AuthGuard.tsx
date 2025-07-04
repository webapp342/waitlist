'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { verifyToken, decryptData, hashPassword, verifyPassword, generateToken, encryptData } from '@/lib/auth';
import { userService } from '@/lib/supabase';
import Image from 'next/image';
import PasswordModal from './PasswordModal';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'set' | 'verify'>('set');
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Define which paths should redirect to dashboard after auth
  const shouldRedirectToDashboard = (path: string) => {
    // Only redirect to dashboard if user is on the home page
    return path === '/';
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if wallet is connected
        if (!isConnected || !address) {
          setIsAuthenticated(false);
          router.push('/');
          return;
        }

        // First check for existing valid token
        const encryptedToken = localStorage.getItem('bblip_auth_token');
        if (encryptedToken) {
          try {
            const token = decryptData(encryptedToken);
            const decoded = await verifyToken(token);
            
            if (decoded && decoded.walletAddress.toLowerCase() === address.toLowerCase()) {
              // Valid token exists
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } catch {
            // Invalid token, remove it
            localStorage.removeItem('bblip_auth_token');
          }
        }

        // No valid token, check if user has password
        const user = await userService.getUserByWallet(address);
        if (!user) {
          // User doesn't exist, create account first
          await userService.addUser(address);
        }

        const passwordHash = await userService.getUserPasswordHash(address);
        
        if (!passwordHash || passwordHash === null) {
          // Password is NULL, show set password modal
          setPasswordMode('set');
          setShowPasswordModal(true);
        } else {
          // Password exists, show verify modal
          setPasswordMode('verify');
          setShowPasswordModal(true);
        }
        
      } catch {
        // If any error occurs during auth check, redirect to home
        setIsAuthenticated(false);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [isConnected, address, router]);

  const handlePasswordSubmit = async (password: string) => {
    if (!address) return;

    try {
      if (passwordMode === 'set') {
        // Hash and save new password
        const hashedPassword = await hashPassword(password);
        await userService.setUserPassword(address, hashedPassword);
      } else {
        // Verify existing password
        const storedHash = await userService.getUserPasswordHash(address);
        if (!storedHash) {
          throw new Error('No password found');
        }
        
        const isValid = await verifyPassword(password, storedHash);
        if (!isValid) {
          throw new Error('Invalid password');
        }
      }

      // Generate and save token
      const token = await generateToken(address);
      const encryptedToken = encryptData(token);
      localStorage.setItem('bblip_auth_token', encryptedToken);
      
      // Success!
      setShowPasswordModal(false);
      setIsAuthenticated(true);

      // Only redirect to dashboard if user was on home page
      if (shouldRedirectToDashboard(pathname)) {
        router.push('/dashboard');
      }
      
    } catch (err) {
      // Handle error with proper type checking
      let errorMessage = 'Authentication failed';
      if (err && typeof err === 'object' && 'message' in err) {
        const message = err.message;
        if (typeof message === 'string') {
          errorMessage = message;
        }
      }
      throw new Error(errorMessage);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400"></div>
          <Image 
            src="/logo.svg" 
            alt="BBLP" 
            width={32} 
            height={32} 
            className="absolute inset-0 m-auto animate-pulse" 
          />
        </div>
      </div>
    );
  }

  // Show password modal if needed
  if (showPasswordModal) {
    return (
      <>
        <div className="min-h-screen bg-black">
          {/* Keep the background dark while modal is open */}
        </div>
        <PasswordModal
          open={showPasswordModal}
          onClose={() => {
            // Don't allow closing without password
            router.push('/');
          }}
          mode={passwordMode}
          onPasswordSubmit={handlePasswordSubmit}
          walletAddress={address}
        />
      </>
    );
  }

  // If not authenticated and no modal showing, redirect
  if (!isAuthenticated) {
    router.push('/');
    return null;
  }

  // Render children if authenticated
  return <>{children}</>;
} 