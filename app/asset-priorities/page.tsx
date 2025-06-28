"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Particles from "@/components/ui/particles";

export default function AssetPriorities() {
  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip pt-12 md:pt-24">
      <section className="flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full">
        <Header />
        <div className="w-full max-w-5xl space-y-8">
          {/* Content will be added here later */}
        </div>
      </section>

      <Footer />

      <Particles
        quantityDesktop={150}
        quantityMobile={50}
        ease={120}
        color={"#F7FF9B"}
        refresh
      />
    </main>
  );
} 