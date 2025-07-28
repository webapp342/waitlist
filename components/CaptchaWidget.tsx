'use client';

import { Turnstile } from 'next-turnstile';
import { useState } from 'react';

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function CaptchaWidget({ onVerify, onError }: CaptchaWidgetProps) {
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = (token: string) => {
    setIsVerified(true);
    onVerify(token);
  };

  const handleError = () => {
    setIsVerified(false);
    onError?.();
  };

  const handleExpire = () => {
    setIsVerified(false);
    // Reset the verification state when CAPTCHA expires
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
        onVerify={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        theme="auto"
        size="normal"
      />
      {isVerified && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ Verification complete
        </p>
      )}
    </div>
  );
} 