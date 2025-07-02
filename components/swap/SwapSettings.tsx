'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SwapSettings as SwapSettingsType } from '@/types/swap';
import { SLIPPAGE_OPTIONS } from '@/config/swap';
import { Settings, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwapSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SwapSettingsType;
  onUpdate: (settings: Partial<SwapSettingsType>) => void;
}

export const SwapSettings: React.FC<SwapSettingsProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate
}) => {
  const [customSlippage, setCustomSlippage] = useState('');
  const [customDeadline, setCustomDeadline] = useState(settings.deadline.toString());

  const handleSlippageSelect = (slippage: number) => {
    onUpdate({ slippageTolerance: slippage });
    setCustomSlippage('');
  };

  const handleCustomSlippage = (value: string) => {
    setCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      onUpdate({ slippageTolerance: numValue });
    }
  };

  const handleDeadlineChange = (value: string) => {
    setCustomDeadline(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 4320) { // Max 3 days
      onUpdate({ deadline: numValue });
    }
  };

  const isSlippageActive = (slippage: number) => {
    return Math.abs(settings.slippageTolerance - slippage) < 0.01 && !customSlippage;
  };

  const getSlippageWarning = () => {
    if (settings.slippageTolerance < 0.1) {
      return { type: 'warning', message: 'Transaction may fail due to low slippage tolerance' };
    }
    if (settings.slippageTolerance > 5) {
      return { type: 'error', message: 'High slippage tolerance may result in unfavorable trades' };
    }
    return null;
  };

  const warning = getSlippageWarning();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-zinc-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white">
            <Settings className="w-5 h-5 text-yellow-400" />
            <span>Transaction Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Slippage Tolerance */}
          <div>
            <Label className="text-sm font-medium mb-3 block text-white">
              Slippage tolerance
            </Label>
            
            <div className="grid grid-cols-4 gap-2 mb-3">
              {SLIPPAGE_OPTIONS.map((slippage) => (
                <Button
                  key={slippage}
                  variant={isSlippageActive(slippage) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSlippageSelect(slippage)}
                  className={cn(
                    "text-xs font-medium transition-all duration-200",
                    isSlippageActive(slippage)
                      ? "bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black"
                      : "bg-black/20 border-zinc-800 hover:bg-yellow-400/5 hover:border-yellow-400/20 text-gray-300"
                  )}
                >
                  {slippage}%
                </Button>
              ))}
            </div>

            <div className="relative">
              <Input
                placeholder="Custom"
                value={customSlippage}
                onChange={(e) => handleCustomSlippage(e.target.value)}
                className="pr-8 bg-black/20 border-zinc-800 text-white placeholder-gray-500 focus:ring-yellow-400/20 focus:border-yellow-400/20"
                type="number"
                step="0.1"
                min="0"
                max="50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                %
              </span>
            </div>

            {warning && (
              <div className={cn(
                "mt-3 p-3 rounded-xl flex items-start space-x-2",
                warning.type === 'warning'
                  ? "bg-yellow-400/10 border border-yellow-400/20"
                  : "bg-red-400/10 border border-red-400/20"
              )}>
                <AlertTriangle className={cn(
                  "w-4 h-4 mt-0.5",
                  warning.type === 'warning' ? "text-yellow-400" : "text-red-400"
                )} />
                <span className={cn(
                  "text-sm",
                  warning.type === 'warning' ? "text-yellow-200" : "text-red-200"
                )}>
                  {warning.message}
                </span>
              </div>
            )}
          </div>

          {/* Transaction deadline */}
          <div>
            <Label className="text-sm font-medium mb-3 block text-white">
              Transaction deadline
            </Label>
            
            <div className="relative">
              <Input
                value={customDeadline}
                onChange={(e) => handleDeadlineChange(e.target.value)}
                className="pr-16 bg-black/20 border-zinc-800 text-white placeholder-gray-500 focus:ring-yellow-400/20 focus:border-yellow-400/20"
                type="number"
                min="1"
                max="4320"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                minutes
              </span>
            </div>
            
            <p className="text-xs text-gray-400 mt-2">
              Your transaction will revert if it is left confirming for longer than this time.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 text-black font-medium px-6 transition-colors duration-200"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="rounded-xl hover:bg-yellow-400/10 text-gray-400 hover:text-yellow-400 transition-colors duration-200"
    >
      <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
    </Button>
  );
}; 