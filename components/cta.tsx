import { TypeAnimation } from 'react-type-animation';
import { Shield, Wallet, Clock, Lock, ChevronLeft, ChevronRight, Container } from "lucide-react";
import TextBlur from "./ui/text-blur";
import AnimatedShinyText from "./ui/shimmer-text";
import { EnhancedButton } from "./ui/enhanced-btn";
import { FaArrowRightLong } from "react-icons/fa6";
import { useAccount, useDisconnect } from 'wagmi';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import Image from 'next/image';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import WalletModal from "./WalletModal";

export default function CTA() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragX = useMotionValue(0);
  const dragControls = useAnimation();
  const router = useRouter();

  const cardImages = [
    { src: "/Classic.png", alt: "Bblip Bronze Card", type: "BRONZE CARD" },
    { src: "/light.png", alt: "Bblip Silver Card", type: "SILVER CARD" },
    { src: "/Classi2c.png", alt: "Bblip Black Card", type: "BLACK CARD" }
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

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50; // Minimum drag distance to trigger card change
    
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        handlePrevCard();
      } else {
        handleNextCard();
      }
    }
    
    dragControls.start({ x: 0 });
    setIsDragging(false);
  };

  return (
    <section className="mx-auto flex flex-col items-center gap-2 py-0 lg:py-0">
      <div className="space-y-1  -mb-10">
        <TextBlur
          className="text-center text-4xl font-medium tracking-tighter sm:text-6xl"
          text="Spend Any Crypto."
        />
        <div className="flex items-center justify-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 text-6xl font-medium tracking-tighter sm:text-6xl">
         Anywhere.
        </div>
      </div>
      
     

      {/* Card Carousel */}
      <div className="relative w-full mt-10  mb-0">
        <div className="relative h-[280px] sm:h-[300px] md:h-[340px] lg:h-[380px] flex items-center justify-center">
          {/* Cards Container */}
          <motion.div 
            className="relative w-full h-full flex items-center justify-center touch-pan-x"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            animate={dragControls}
            style={{ x: dragX }}
          >
            {cardImages.map((card, index) => {
              const isCenter = index === currentCardIndex;
              const isLeft = index === (currentCardIndex === 0 ? cardImages.length - 1 : currentCardIndex - 1);
              const isRight = index === (currentCardIndex === cardImages.length - 1 ? 0 : currentCardIndex + 1);
              
              if (!isCenter && !isLeft && !isRight) return null;

              return (
                <motion.div
                  key={index}
                  className="absolute cursor-pointer"
                  initial={false}
                  animate={{
                    x: isLeft ? -140 : isRight ? 140 : 0,
                    scale: isCenter ? 1 : 0.75,
                    opacity: isCenter ? 1 : 0.6,
                    rotateY: isLeft ? 25 : isRight ? -25 : 0,
                    zIndex: isCenter ? 10 : 0
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  style={{ 
                    transformStyle: "preserve-3d",
                    perspective: "1000px"
                  }}
                  onClick={() => !isDragging && !isCenter && setCurrentCardIndex(index)}
                >
                  <div className={`w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px] transition-transform duration-200 ${isCenter && !isDragging ? 'hover:scale-105' : ''}`}>
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={519}
                      height={376}
                      className="w-full h-auto drop-shadow-xl"
                      priority={isCenter}
                      draggable={false}
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Card Indicators */}
        <div className="flex justify-center gap-2 -mt-10">
          {cardImages.map((card, index) => (
            <button
              key={index}
              onClick={() => setCurrentCardIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentCardIndex
                  ? "w-8 bg-yellow-200 shadow-lg"
                  : "w-2 bg-zinc-600 hover:bg-zinc-500"
              }`}
              aria-label={`Go to ${card.type}`}
            />
          ))}
        </div>

       

        {/* Connect Wallet Button */}
        <div className="mt-20 mb-10 flex flex-col items-center gap-4">
          <button
            onClick={handleWalletAction}
            className="group relative px-8 py-3 bg-yellow-200  text-black font-medium rounded-xl transition-all duration-200 min-w-[280px]"
          >
            <div className="flex items-center justify-center gap-2">
              <span>{isConnected ? 'Disconnect Wallet' : 'Get your cards'}</span>
              {!isConnected && <FaArrowRightLong className="w-4 h-4" />}
            </div>
          </button>

          {/* Microcopy under button */}
          {!isWalletModalOpen && (
            <div className="text-center">
              <p className="text-xs text-yellow-400 -mt-2">⚡ Limited time offer </p>
            </div>
          )}
        </div>
    
       

        {/* Wallet Modal */}
        <WalletModal open={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
      </div>
    </section>
  );
}
