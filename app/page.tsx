"use client";

import CTA from "@/components/cta";
import Testimonials from "@/components/testimonials";
import Form from "@/components/form";
import Logos from "@/components/logos";
import Particles from "@/components/ui/particles";
import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesGrid from "@/components/features-grid";
import FAQSection from "@/components/faq-section";
import CTAFinal from "@/components/cta-final";
import Container from "@/components/container";
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import FeaturesGridSecond from "@/components/features-grid-second";
import FeaturesGridThird from "@/components/features-grid-third";
import RewardsMarket from '@/components/rewards-market';
import SecurityFeatures from '@/components/security-features';
import { userService, referralService } from '@/lib/supabase';
import { toast } from 'sonner';

export default function Home() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referralProcessed, setReferralProcessed] = useState(false);

  useEffect(() => {
    // If already connected when page loads, redirect to dashboard
    if (isConnected) {
      router.replace('/dashboard');
    }
  }, [isConnected, router]);

  // Process referral code when user connects wallet
  useEffect(() => {
    const processReferralCode = async () => {
      if (isConnected && address && !referralProcessed) {
        const referralCode = searchParams.get('ref');
        
        if (referralCode) {
          try {
            console.log('Processing referral code:', referralCode);
            
            // First save the user to database
            const user = await userService.addUser(address);
            
            if (user) {
              console.log('User saved, processing referral...');
              
              // Small delay to ensure user is properly saved
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Process the referral
              const success = await referralService.processReferral(referralCode, address);
              
              if (success) {
                toast.success('Referral bonus applied! 🎉');
                console.log('Referral processed successfully');
              } else {
                console.log('Referral processing failed or invalid code');
                toast.error('Invalid referral code or already used');
              }
            }
            
            setReferralProcessed(true);
          } catch (error) {
            console.error('Error processing referral:', error);
            toast.error('Failed to process referral');
            setReferralProcessed(true);
          }
        } else {
          // No referral code, just save the user
          try {
            await userService.addUser(address);
            console.log('User saved without referral');
          } catch (error) {
            console.error('Error saving user:', error);
          }
        }
      }
    };

    processReferralCode();
  }, [isConnected, address, searchParams, referralProcessed]);

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip">
      {/* Header */}
      <Header />
      
      {/* Hero Section with Trust Badges */}
      <HeroSection />
      
      {/* Main CTA with Cards */}
      <section className="w-full py-12">
        <Container size="lg">
          <CTA />
        </Container>
      </section>
      
      {/* Partner Logos */}
     

      {/* DeFi Features Grid */}
      <FeaturesGridThird />

      <section className="w-full py-12">
        <Container size="lg">
          <Logos />
        </Container>
      </section>
      
      {/* Features Grid */}
      <FeaturesGrid />


      <SecurityFeatures />


      <FeaturesGridSecond />




      <RewardsMarket />

      
      {/* Testimonials */}
      <Testimonials />


      
      {/* FAQ Section */}
      <FAQSection />
      
      {/* Final CTA */}
    
          <CTAFinal />
    

      {/* Footer */}
      <Footer />

      {/* Background Particles */}
      <Particles
        quantityDesktop={120}
        quantityMobile={40}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
}
