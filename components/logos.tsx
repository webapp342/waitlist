import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { containerVariants, itemVariants } from "@/lib/animation-variants";
import TextBlur from "./ui/text-blur";

const logos = [
  { href: "https://0x.org", src: "/idGOzgQxaB_1751118129573.svg", alt: "0x" },
  { href: "https://consensys.net", src: "/Consensys_idqcVKnRRE_0.svg", alt: "ConsenSys" },
  { href: "https://infura.io", src: "/infura_wordmark_white.svg", alt: "Infura" },
  { href: "https://marqeta.com", src: "/primary-logo-white.svg", alt: "Marqeta" },
  { href: "https://www.mastercard.com", src: "/ma_symbol.svg", alt: "Mastercard" },
  { href: "https://polygon.technology", src: "/idhiQehyPF_logos.svg", alt: "Polygon" },
];

export default function Logos() {
  return (
    <motion.div
      className="flex h-full w-full flex-col gap-2 pb-12 pt-12 md:pb-24 md:pt-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible">
      <motion.div variants={itemVariants}>
        <TextBlur
          className="text-center text-lg font-medium tracking-tight text-zinc-200 md:text-3xl"
          text="Pay with crypto, earn rewards onchain and IRL"
        />
        
      </motion.div>



      <motion.div
        variants={itemVariants}
        className="mt-4 grid w-full grid-cols-2 items-center justify-center gap-4 md:mt-6 md:grid-cols-3 md:gap-2">
        {logos.map((logo, index) => (
          <Link
            key={index}
            href={logo.href}
            rel="noopener noreferrer"
            target="_blank"
            className="flex h-24 items-center justify-center rounded-xl border   transition-all duration-150 ease-in-out md:hover:border-zinc-700 md:hover:bg-accent">
            {logo.src ? (
              <Image
                src={logo.src}
                alt={logo.alt}
                width={100}
                height={100}
                className="h-auto w-24 opacity-85"
              />
            ) : (
              <span className="text-xl font-semibold text-zinc-200">{logo.alt}</span>
            )}
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}
