import { TypeAnimation } from 'react-type-animation';
import { Shield, Wallet, Clock, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import TextBlur from "./ui/text-blur";
import AnimatedShinyText from "./ui/shimmer-text";
import { EnhancedButton } from "./ui/enhanced-btn";
import { FaArrowRightLong } from "react-icons/fa6";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function CTA() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const cardImages = [
    { src: "/Classic.svg", alt: "Bblip Classic Card" },
    { src: "/light.svg", alt: "Bblip Light Card" },
    { src: "/Classi2c.svg", alt: "Bblip Classic 2 Card" },
  ];

  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      setShowConnectors(!showConnectors);
    }
  };

  const handleConnectorClick = async (connector: any) => {
    try {
      await connect({ connector });
      setShowConnectors(false);
      if (connector.ready) {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Connection failed. Please try again.');
    }
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev === 0 ? cardImages.length - 1 : prev - 1));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev === cardImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 -py-0 md:-py-0 md:-pb-0 lg:py-0 lg:-pb-0">
      <div className="space-y-1">
        <TextBlur
          className="text-center text-4xl font-medium tracking-tighter sm:text-6xl"
          text="Live the Crypto Life"
        />

        <div className="flex items-center justify-center text-4xl font-medium tracking-tighter sm:text-6xl">
          <span>With</span>
          <span className="ml-3">
            <AnimatedShinyText>Bblip Card</AnimatedShinyText>
          </span>
        </div>
      </div>
      
      <div className="min-h-[60px] text-center text-lg sm:text-xl mt-6 max-w-[30rem]">
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
      <div className="relative w-full max-w-[800px] -mt-10 mb-0">
        <div className="relative h-[300px] flex items-center justify-center">
          {/* Previous Button */}
      

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
                position = '-translate-x-32 md:-translate-x-40';
                scale = 'scale-75';
                zIndex = 'z-0';
                opacity = 'opacity-60';
              } else if (isRight) {
                position = 'translate-x-32 md:translate-x-40';
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
                  <div className="w-[280px] md:w-[320px] hover:scale-105 transition-transform duration-200">
                    <Image
                      src={card.src}
                      alt={card.alt}
                      width={519}
                      height={376}
                      className="w-full h-auto drop-shadow-2xl"
                      priority={isCenter}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Next Button */}
        
        </div>

        {/* Card Indicators */}
        <div className="flex justify-center gap-2 -mt-10">
          {cardImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCardIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentCardIndex
                  ? "w-8 bg-yellow-400 shadow-lg"
                  : "w-2 bg-zinc-600 hover:bg-zinc-500"
              }`}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>

        {/* Card Labels */}
        <div className="flex justify-center mt-4">
          <motion.div
            key={currentCardIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
         
          </motion.div>
        </div>
      </div>

      {/* Connect Wallet Button Section */}
      <div className="mt-8 flex w-full max-w-[24rem] flex-col gap-2">
        <EnhancedButton
          variant="expandIcon"
          Icon={FaArrowRightLong}
          onClick={handleWalletAction}
          iconPlacement="right"
          className="w-full"
          disabled={isPending}>
          {isPending ? "Connecting..." : isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : "Get the Card"}
        </EnhancedButton>
        
        {/* Connector Options */}
        {showConnectors && !isConnected && (
          <div className="flex flex-col gap-2 mt-2">
            {connectors
              .filter((connector) => {
                // Mobil cihazlarda injected connector'ı gizle
                if (isMobile && connector.id === 'injected') {
                  return false;
                }
                return true;
              })
              .map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => handleConnectorClick(connector)}
                  className="w-full p-2 text-sm border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
                  disabled={isPending}>
                  {connector.name}
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {/* No KYC Feature */}
        <div className="flex flex-col items-center rounded-2xl bg-zinc-900/50 p-6 text-center">
          <div className="mb-4 rounded-full bg-yellow-200/10 p-3">
            <Shield className="h-6 w-6 text-yellow-200" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-white">100% Anonymous</h3>
          <p className="text-sm text-zinc-400">No KYC required. No email, no phone number. Just connect your wallet and get your card.</p>
        </div>

        {/* Direct Spending Feature */}
        <div className="flex flex-col items-center rounded-2xl bg-zinc-900/50 p-6 text-center">
          <div className="mb-4 rounded-full bg-yellow-200/10 p-3">
            <Wallet className="h-6 w-6 text-yellow-200" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-white">Direct from Wallet</h3>
          <p className="text-sm text-zinc-400">Spend your crypto assets directly from your wallet. No intermediary accounts needed.</p>
        </div>

        {/* Instant Access Feature */}
        <div className="flex flex-col items-center rounded-2xl bg-zinc-900/50 p-6 text-center">
          <div className="mb-4 rounded-full bg-yellow-200/10 p-3">
            <Clock className="h-6 w-6 text-yellow-200" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-white">Instant Access</h3>
          <p className="text-sm text-zinc-400">Connect wallet, get card. Start spending your crypto in minutes, not days.</p>
        </div>

        {/* Privacy Feature */}
        <div className="flex flex-col items-center rounded-2xl bg-zinc-900/50 p-6 text-center">
          <div className="mb-4 rounded-full bg-yellow-200/10 p-3">
            <Lock className="h-6 w-6 text-yellow-200" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-white">Complete Privacy</h3>
          <p className="text-sm text-zinc-400">Your identity stays private. Only your wallet connects you to your card.</p>
        </div>
      </div>
    </section>
  );
}
