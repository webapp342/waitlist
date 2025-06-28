import { TypeAnimation } from 'react-type-animation';
import { Shield, Wallet, Clock, Lock, ChevronLeft, ChevronRight, Container } from "lucide-react";
import TextBlur from "./ui/text-blur";
import AnimatedShinyText from "./ui/shimmer-text";
import { EnhancedButton } from "./ui/enhanced-btn";
import { FaArrowRightLong } from "react-icons/fa6";
import { useAccount, useDisconnect } from 'wagmi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import WalletModal from "./WalletModal";

export default function CTA() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const router = useRouter();

  const cardImages = [
    { src: "/Classic.png", alt: "Bblip Classic Card" },
    { src: "/light.png", alt: "Bblip Light Card" },
    { src: "/Classi2c.png", alt: "Bblip Classic 2 Card" },
  ];

  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      setIsWalletModalOpen(true);
    }
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev === 0 ? cardImages.length - 1 : prev - 1));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev === cardImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="mx-auto flex flex-col items-center gap-2 py-0 lg:py-0">
      <div className="space-y-1">
        <TextBlur
          className="text-center text-4xl font-medium tracking-tighter sm:text-6xl"
          text="Spend Crypto."
        />

        <div className="flex items-center justify-center text-4xl font-medium tracking-tighter sm:text-6xl">
          <AnimatedShinyText>Anywhere.</AnimatedShinyText>
        </div>
      </div>
      
      <div className="min-h-[60px] text-center text-lg sm:text-xl mt-4 ">
        <TypeAnimation
          sequence={[
            'Instant spending direct from your crypto wallet, anywhere anytime',
            3000,
            'Experience true financial freedom with zero restrictions',
            3000,
            'Your crypto, your card, your way - 100% anonymous',
            3000,
            'No KYC, no hassle - just pure crypto convenience',
            3000,
          ]}
          wrapper="span"
          speed={40}
          deletionSpeed={80}
          style={{ 
            display: 'inline-block',
            color: '#939393',
            opacity: 0.9,
          }}
          repeat={Infinity}
          omitDeletionAnimation={true}
        />
      </div>

      {/* Card Carousel */}
      <div className="relative w-full -mt-10  mb-0">
        <div className="relative h-[280px] sm:h-[300px] md:h-[340px] lg:h-[380px] flex items-center justify-center">
          {/* Cards Container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {cardImages.map((card, index) => {
              const isCenter = index === currentCardIndex;
              const isLeft = index === (currentCardIndex === 0 ? cardImages.length - 1 : currentCardIndex - 1);
              const isRight = index === (currentCardIndex === cardImages.length - 1 ? 0 : currentCardIndex + 1);
              
              if (!isCenter && !isLeft && !isRight) return null;

              let position = 'translate-x-0';
              let scale = 'scale-100';
              let zIndex = 'z-10';
              let opacity = 'opacity-100';

              if (isLeft) {
                position = '-translate-x-40';
                scale = 'scale-75';
                zIndex = 'z-0';
                opacity = 'opacity-60';
              } else if (isRight) {
                position = 'translate-x-40';
                scale = 'scale-75';
                zIndex = 'z-0';
                opacity = 'opacity-60';
              } else if (isCenter) {
                position = 'translate-x-0';
                scale = 'scale-100';
                zIndex = 'z-10';
                opacity = 'opacity-100';
              }

              return (
                <motion.div
                  key={index}
                  className={`absolute ${position} ${scale} ${zIndex} ${opacity} cursor-pointer transition-all duration-300 ease-out`}
                  onClick={() => !isCenter && setCurrentCardIndex(index)}
                  initial={false}
                  animate={{
                    x: isLeft ? -140 : isRight ? 140 : 0,
                    scale: isCenter ? 1 : 0.75,
                    opacity: isCenter ? 1 : 0.6,
                    rotateY: isLeft ? 25 : isRight ? -25 : 0,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ 
                    transformStyle: "preserve-3d",
                    perspective: "1000px"
                  }}
                >
                  <div className="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px] hover:scale-105 transition-transform duration-200">
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={519}
                      height={376}
                      className="w-full h-auto drop-shadow-xl"
                      priority={isCenter}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Card Indicators */}
        <div className="flex justify-center gap-2 -mt-10">
          {cardImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCardIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentCardIndex
                  ? "w-8 bg-yellow-200 shadow-lg"
                  : "w-2 bg-zinc-600 hover:bg-zinc-500"
              }`}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>

       

        {/* Connect Wallet Button */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={handleWalletAction}
            className="group relative px-8 py-3 bg-yellow-200  text-black font-medium rounded-xl transition-all duration-200 min-w-[280px]"
          >
            <div className="flex items-center justify-center gap-2">
              <span>{isConnected ? 'Disconnect Wallet' : 'Create your cards'}</span>
              {!isConnected && <FaArrowRightLong className="w-4 h-4" />}
            </div>
          </button>

          {/* Microcopy under button */}
          {!isWalletModalOpen && (
            <p className="text-sm text-zinc-400 -mt-2">Start in 30&nbsp;seconds — no KYC required</p>
          )}
        </div>
    
       

        {/* Wallet Modal */}
        <WalletModal open={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
      </div>
    </section>
  );
}
