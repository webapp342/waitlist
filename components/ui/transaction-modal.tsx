import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TransactionStatus, type TransactionStatus as TxStatus } from "./transaction-status";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TxStatus;
  message: string;
  type: 'stake' | 'unstake' | 'claim' | 'approve';
  stakedAmount?: string;
}

const CARD_REQUIREMENTS = {
  BRONZE: 1000,
  SILVER: 2500,
  BLACK: 3500
};

const getTypeEmoji = (type: string) => {
  switch (type) {
    case 'stake':
      return '';
    case 'unstake':
      return '';
    case 'claim':
      return '';
    case 'approve':
      return '';
    default:
      return '';
  }
};

const getTypeTitle = (type: string) => {
  switch (type) {
    case 'stake':
      return '';
    case 'unstake':
      return '';
    case 'claim':
      return '';
    case 'approve':
      return '';
    default:
      return '';
  }
};

const CardActivationStatus = ({ stakedAmount }: { stakedAmount: number }) => {
  const staked = Number(stakedAmount);
  
  // Calculate remaining amounts for each tier
  const remainingForBronze = Math.max(0, CARD_REQUIREMENTS.BRONZE - staked);
  const remainingForSilver = Math.max(0, CARD_REQUIREMENTS.SILVER - staked);
  const remainingForBlack = Math.max(0, CARD_REQUIREMENTS.BLACK - staked);

  return (
    <div className="mt-4 space-y-3 w-full">
      <h3 className="text-lg font-semibold text-center text-white/90">
        Card Status Update
      </h3>
      
      <div className="space-y-2">
        {/* Bronze Card Status */}
        <div className="flex items-center justify-between p-2 rounded-lg ">
          <div className="flex items-center gap-2">
            <Image src="/bronze.png" width={24} height={24} alt="Bronze Card" className="rounded-full" />
            <span className="text-[#CD7F32]">Bronze Card</span>
          </div>
          {staked >= CARD_REQUIREMENTS.BRONZE ? (
            <span className="text-green-400 text-sm">Activated! </span>
          ) : (
            <span className="text-white/60 text-sm">Need {remainingForBronze.toFixed(2)} more BBLP</span>
          )}
        </div>

        {/* Silver Card Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-[#C0C0C0]/10 to-[#C0C0C0]/20">
          <div className="flex items-center gap-2">
            <Image src="/silver.png" width={24} height={24} alt="Silver Card" className="rounded-full" />
            <span className="text-[#C0C0C0]">Silver Card</span>
          </div>
          {staked >= CARD_REQUIREMENTS.SILVER ? (
            <span className="text-green-400 text-sm">Activated! </span>
          ) : staked >= CARD_REQUIREMENTS.BRONZE ? (
            <span className="text-white/60 text-sm">Need {remainingForSilver.toFixed(2)} more BBLP</span>
          ) : (
            <span className="text-white/60 text-sm">Unlock Bronze first</span>
          )}
        </div>

        {/* Black Card Status */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-black to-gray-900">
          <div className="flex items-center gap-2">
            <Image src="/gold.png" width={24} height={24} alt="Black Card" className="rounded-full" />
            <span className="text-white">Black Card</span>
          </div>
          {staked >= CARD_REQUIREMENTS.BLACK ? (
            <span className="text-green-400 text-sm">Activated! </span>
          ) : staked >= CARD_REQUIREMENTS.SILVER ? (
            <span className="text-white/60 text-sm">Need {remainingForBlack.toFixed(2)} more BBLP</span>
          ) : staked >= CARD_REQUIREMENTS.BRONZE ? (
            <span className="text-white/60 text-sm">Need {(CARD_REQUIREMENTS.BLACK - staked).toFixed(2)} BBLP for Black</span>
          ) : (
            <span className="text-white/60 text-sm">Need {CARD_REQUIREMENTS.BLACK.toFixed(2)} BBLP total</span>
          )}
        </div>

     
      </div>
    </div>
  );
};

export function TransactionModal({
  isOpen,
  onClose,
  status,
  message,
  type,
  stakedAmount
}: TransactionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]  ">
        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-4xl animate-bounce">
              {getTypeEmoji(type)}
            </div>
            
            <h2 className="text-xl font-semibold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              {getTypeTitle(type)}
            </h2>

            <div className={cn(
              "w-full transition-all duration-500",
              status === 'completed' && "animate-pulse"
            )}>
              <TransactionStatus
                status={status}
                message={message}
                className="w-full justify-center py-3"
              />
            </div>

            {status === 'completed' && type === 'stake' && stakedAmount && (
              <CardActivationStatus stakedAmount={Number(stakedAmount)} />
            )}

            {status === 'completed' && (
              <p className="text-sm text-center text-white/60 animate-fade-in">
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 