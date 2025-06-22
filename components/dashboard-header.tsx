'use client'

import Link from "next/link";
import { Button } from "./ui/button";
import { motion } from "framer-motion";
import { FaHome, FaSignOutAlt } from "react-icons/fa";
import { useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

import { containerVariants, itemVariants } from "@/lib/animation-variants";

export default function DashboardHeader() {
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const handleDisconnect = () => {
    disconnect();
    router.push('/');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="fixed flex right-0 left-0 justify-between top-0 z-[50] m-4">
      <motion.div variants={itemVariants}>
        <Link href="/">
          <Button
            size="sm"
            variant="secondary"
            className="text-yellow-50 transition-all duration-150 ease-linear md:hover:text-yellow-200">
            <FaHome className="md:mr-1.5" />
            <span className="hidden md:inline">Back to Home</span>
          </Button>
        </Link>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDisconnect}
          className="text-yellow-50 transition-all duration-150 ease-linear md:hover:text-yellow-200">
          <FaSignOutAlt className="md:mr-1.5" />
          <span className="hidden md:inline">Disconnect Wallet</span>
        </Button>
      </motion.div>
    </motion.div>
  );
} 