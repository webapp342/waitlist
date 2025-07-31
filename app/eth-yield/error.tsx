'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function EthYieldError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('ETH Yield Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <Card className="bg-red-900/20 border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-300 text-center">
                Something went wrong!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-red-200 mb-4">
                  An error occurred while loading the ETH Yield staking interface.
                </p>
                <p className="text-red-300 text-sm mb-4">
                  {error.message || 'Unknown error occurred'}
                </p>
                <div className="space-x-4">
                  <Button
                    onClick={reset}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Try again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Go home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 