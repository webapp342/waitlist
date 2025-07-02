import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface CreditCardProps {
  cardType: 'bronze' | 'silver' | 'black';
  cardNumber: string;
  cvv: string;
  expirationDate: string;
  isReserved: boolean;
  balance?: string;
  onClick?: () => void;
}

export default function CreditCard({ 
  cardType, 
  cardNumber, 
  cvv, 
  expirationDate, 
  isReserved, 
  balance,
  onClick 
}: CreditCardProps) {
  const [showPrioritiesModal, setShowPrioritiesModal] = useState(false);

  const getSVGPath = () => {
    switch (cardType) {
      case 'bronze':
        return '/bronze.png';
      case 'silver':
        return '/silver.png';
      case 'black':
        return '/gold.png';
      default:
        return '/bronze.png';
    }
  };

  const formatCardNumber = (number: string) => {
    // First, remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '');
    
    // Ensure the number is exactly 16 digits, pad with zeros if needed
    const paddedNumber = cleanNumber.padStart(16, '0');
    
    // Replace each group of 4 digits with stars except the last group
    return paddedNumber.replace(/(\d{4})/g, (_, group, offset) => {
      const isLast = offset + 4 >= paddedNumber.length;
      return isLast ? group : '**** ';
    });
  };

  const formatExpirationDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: '2-digit', 
      year: '2-digit' 
    });
  };

  return (
    <>
      <motion.div
        className="relative cursor-pointer w-full mx-auto"
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        {/* Custom CSS for blinking animation */}
        <style jsx>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          .blink-animation {
            animation: blink 2s infinite;
          }
        `}</style>

        {/* SVG Background with Overlay */}
        <div className="relative">
          <Image
            src={getSVGPath()}
            alt={`${cardType} card`}
            width={474}
            height={296}
            className="w-full h-auto"
            priority
          />
          
          {/* Card Information Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-3 text-white">
            {/* Top Row: Status Indicator */}
            <div className="flex justify-end items-start">
              <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                {/* Status Light */}
                <div className={`w-2 h-2 rounded-full ${
                  isReserved 
                    ? 'bg-green-400 blink-animation' 
                    : 'bg-red-400'
                }`} />
                {/* Status Text */}
                <span className={`text-xs font-bold ${
                  isReserved ? 'text-green-300' : 'text-red-400'
                }`}>
                  {isReserved ? 'Reserved' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Center: Balance and Card Number */}
            <div className="flex flex-col">
              {balance && (
                <div className="text-2xl font-bold opacity-90 -mt-2 -mb-1">
                   {balance}
                </div>
              )}
              <div className="font-mono text-xl tracking-wider font-bold mt-0 -mb-5">
                {formatCardNumber(cardNumber)}
              </div>
            </div>

            {/* Bottom Row: CVV and Expiration */}
            <div className="flex  ">
              <div>
                <div className="text-xs font-bold">CVV</div>
                <div className="font-mono text-xs font-bold">{cvv}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold ml-20">EXPIRES</div>
                <div className="font-mono text-left text-xs font-bold ml-20">
                  {formatExpirationDate(expirationDate)}
                </div>
              </div>
       
            </div>
          </div>
        </div>
      </motion.div>

      
    </>
  );
} 