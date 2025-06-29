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
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import FeaturesGridSecond from "@/components/features-grid-second";
import FeaturesGridThird from "@/components/features-grid-third";
import RewardsMarket from '@/components/rewards-market';
import SecurityFeatures from '@/components/security-features';

export default function Home() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // If already connected when page loads, redirect to dashboard
    if (isConnected) {
      router.replace('/dashboard');
    }
  }, [isConnected, router]);

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
