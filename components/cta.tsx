import { TypeAnimation } from 'react-type-animation';
import { Shield, Wallet, Clock, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import TextBlur from "./ui/text-blur";
import AnimatedShinyText from "./ui/shimmer-text";
import { EnhancedButton } from "./ui/enhanced-btn";
import { FaArrowRightLong } from "react-icons/fa6";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';
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
      setShowConnectors(!showConnectors);
    }
  };

  const handleConnectorClick = async (connector: any) => {
    try {
      await connect({ connector });
      setShowConnectors(false);
      router.replace('/dashboard');
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
                  <div className="w-[320px] hover:scale-105 transition-transform duration-200">
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

        {/* Connect Wallet Button */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <EnhancedButton onClick={handleWalletAction}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>{isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}</span>
              {!isConnected && <FaArrowRightLong className="w-4 h-4" />}
            </div>
          </EnhancedButton>

          {/* Wallet Connectors */}
          {showConnectors && !isConnected && (
            <div className="flex flex-col gap-2 w-full max-w-[320px]">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnectorClick(connector)}
                  disabled={isPending}
                  className={`
                    w-full px-4 py-3 rounded-xl text-sm font-medium
                    bg-black/60 backdrop-blur-xl border border-yellow-400/10
                    hover:bg-black/40 hover:border-yellow-400/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-300
                  `}
                >
                  {connector.name}
                  {isPending && ' (connecting)'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-black/60 backdrop-blur-xl border border-yellow-400/10">
            <Shield className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-medium text-white">Secure</h3>
              <p className="text-sm text-gray-400">Non-custodial solution</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-black/60 backdrop-blur-xl border border-yellow-400/10">
            <Clock className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-medium text-white">Instant</h3>
              <p className="text-sm text-gray-400">Real-time transactions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-black/60 backdrop-blur-xl border border-yellow-400/10">
            <Lock className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-medium text-white">Private</h3>
              <p className="text-sm text-gray-400">No KYC required</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-black/60 backdrop-blur-xl border border-yellow-400/10">
            <Wallet className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="font-medium text-white">Flexible</h3>
              <p className="text-sm text-gray-400">Multi-wallet support</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
