'use client'

import { motion } from 'framer-motion'
import { 
  FileDown, 
  Shield, 
  Coins, 
  Users, 
  TrendingUp,
  CreditCard,
  Lock,
  Globe,
  ChartBar,
  Rocket,
  CheckCircle,
  ArrowRight,
  Zap,
  Star,
  Award
} from 'lucide-react'
import Container from '@/components/container'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
// @ts-ignore
import jsPDF from 'jspdf'

export default function WhitepaperPage() {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // PDF page dimensions
      const pageWidth = 210
      const pageHeight = 297
      const margin = 15

      // Add title page
      pdf.setFontSize(24)
      pdf.setTextColor(204, 153, 0) // Dark yellow color for visibility
      pdf.text('BBLIP WHITEPAPER', pageWidth / 2, 50, { align: 'center' })
      
      pdf.setFontSize(14)
      pdf.setTextColor(64, 64, 64) // Dark gray color
      pdf.text('The Future of Crypto Spending', pageWidth / 2, 70, { align: 'center' })
      
      pdf.setFontSize(12)
      pdf.text('Version 1.0 - January 2025', pageWidth / 2, 85, { align: 'center' })

      // Add executive summary on new page
      pdf.addPage()
      let yPosition = 30

      // Function to add text with wrapping
      const addWrappedText = (text: string, fontSize: number = 10, color: [number, number, number] = [0, 0, 0]) => {
        if (yPosition > 270) {
          pdf.addPage()
          yPosition = 30
        }
        
        pdf.setFontSize(fontSize)
        pdf.setTextColor(color[0], color[1], color[2])
        const splitText = pdf.splitTextToSize(text, pageWidth - 2 * margin)
        pdf.text(splitText, margin, yPosition)
        yPosition += (splitText.length * fontSize * 0.6) + 2
        return yPosition
      }

      // Add section header
      const addSectionHeader = (title: string) => {
        if (yPosition > 240) {
          pdf.addPage()
          yPosition = 30
        }
        yPosition += 15
        addWrappedText(title, 16, [204, 153, 0]) // Dark yellow/orange for headers
        yPosition += 8
      }

      // Executive Summary
      addSectionHeader('EXECUTIVE SUMMARY')
      addWrappedText('BBLIP represents a paradigm shift in cryptocurrency spending, offering the world&apos;s first truly decentralized, KYC-free crypto card ecosystem. By combining cutting-edge blockchain technology with user-friendly interfaces, BBLIP enables anyone to spend their cryptocurrency anywhere in the world without traditional banking restrictions.')
      
      yPosition += 5
      addWrappedText('Key Highlights:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• 100M Fixed Supply: Deflationary tokenomics with burn mechanisms')
      addWrappedText('• 32% APR Staking: Industry-leading returns with flexible unstaking')
      addWrappedText('• 40M+ Merchants: Global acceptance across 180+ countries')

      // Problem Statement
      addSectionHeader('PROBLEM STATEMENT')
      addWrappedText('Current crypto card solutions suffer from several critical limitations:')
      addWrappedText('• Invasive KYC Requirements: Most crypto cards require extensive personal documentation')
      addWrappedText('• High Fees: Traditional crypto cards charge 2-3% conversion fees plus monthly fees')
      addWrappedText('• Limited Acceptance: Many cards work only in specific regions')
      addWrappedText('• Custodial Risk: Users must trust third parties with their funds')

      // Solution
      addSectionHeader('THE BBLIP SOLUTION')
      addWrappedText('BBLIP addresses these challenges through:')
      addWrappedText('• No KYC Required: True financial freedom with zero personal information required')
      addWrappedText('• Self-Custody: Your keys, your crypto. BBLIP never holds your funds')
      addWrappedText('• Three Card Tiers: Bronze, Silver, and Black cards with increasing benefits')
      addWrappedText('• Instant Activation: Virtual cards activate instantly upon wallet connection')

      // Tokenomics
      addSectionHeader('TOKENOMICS')
      addWrappedText('Token Distribution (100M Total Supply):', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Staking Rewards: 30% (30M BBLP)')
      addWrappedText('• ICO & Presale: 25% (25M BBLP)')
      addWrappedText('• Team & Development: 15% (15M BBLP)')
      addWrappedText('• Private Sale: 10% (10M BBLP)')
      addWrappedText('• Liquidity: 5% (5M BBLP)')
      addWrappedText('• Business Partnerships: 5% (5M BBLP)')
      addWrappedText('• Initial Staking: 5% (5M BBLP)')
      addWrappedText('• Airdrop: 5% (5M BBLP)')

      yPosition += 5
      addWrappedText('Token Utility:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Governance voting rights')
      addWrappedText('• Staking for card tier upgrades')
      addWrappedText('• Cashback rewards in BBLP')
      addWrappedText('• Revenue sharing from fees')
      addWrappedText('• Referral program rewards')

      // Card System
      addSectionHeader('CARD SYSTEM')
      addWrappedText('Bronze Card (1,000 BBLP stake):', 12, [184, 115, 51]) // Bronze color
      addWrappedText('• 1% Cashback Rate')
      addWrappedText('• $1,000 Daily Limit')
      addWrappedText('• Virtual card only')
      
      yPosition += 3
      addWrappedText('Silver Card (2,000 BBLP stake):', 12, [128, 128, 128]) // Silver color
      addWrappedText('• 1.5% Cashback Rate')
      addWrappedText('• $5,000 Daily Limit')
      addWrappedText('• Virtual + Physical card')
      
      yPosition += 3
      addWrappedText('Black Card (3,500 BBLP stake):', 12, [32, 32, 32]) // Dark color for black card
      addWrappedText('• 2% Cashback Rate')
      addWrappedText('• $25,000 Daily Limit')
      addWrappedText('• Premium metal card with NFC')

      // Staking System
      addSectionHeader('STAKING SYSTEM')
      addWrappedText('Staking Tiers & Rewards:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Tier 1 (100+ BBLP): 15% APR')
      addWrappedText('• Tier 2 (1,000+ BBLP): 22% APR')
      addWrappedText('• Tier 3 (5,000+ BBLP): 28% APR')
      addWrappedText('• Tier 4 (10,000+ BBLP): 32% APR')
      
      yPosition += 3
      addWrappedText('Key Features:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Daily compound interest calculation')
      addWrappedText('• No minimum lock periods')
      addWrappedText('• Instant unstaking available')
      addWrappedText('• Auto-compound option')

      // Referral Program
      addSectionHeader('REFERRAL PROGRAM')
      addWrappedText('How It Works:')
      addWrappedText('1. Get a unique referral code and share with friends')
      addWrappedText('2. They sign up and stake BBLP tokens')
      addWrappedText('3. Both you and your friend earn rBBLP tokens')
      
      yPosition += 3
      addWrappedText('Reward Structure:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Friend stakes 100 BBLP → You get 10 rBBLP')
      addWrappedText('• Friend stakes 1,000 BBLP → You get 100 rBBLP')
      addWrappedText('• Friend stakes 5,000 BBLP → You get 500 rBBLP')
      
      yPosition += 3
      addWrappedText('Leaderboard Bonuses:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• 1st Place: $1,000 USDT')
      addWrappedText('• 2nd Place: $500 USDT')
      addWrappedText('• 3rd Place: $250 USDT')
      addWrappedText('• 4th-5th Place: $125 USDT each')

      // Security
      addSectionHeader('SECURITY ARCHITECTURE')
      addWrappedText('Smart Contract Security:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• Multi-signature governance')
      addWrappedText('• Time-locked transactions')
      addWrappedText('• Emergency pause functionality')
      addWrappedText('• Automated security monitoring')
      
      yPosition += 3
      addWrappedText('User Protection:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('• AES-256 encryption')
      addWrappedText('• Real-time fraud detection')
      addWrappedText('• Multi-factor authentication')
      addWrappedText('• Hardware wallet support')

      // Roadmap
      addSectionHeader('DEVELOPMENT ROADMAP')
      addWrappedText('Q1 2025 - Platform Launch (Completed):', 12, [0, 128, 0]) // Green for completed
      addWrappedText('• Web application development')
      addWrappedText('• Swap system implementation')
      addWrappedText('• Staking platform launch')
      addWrappedText('• Crypto card system beta')
      
      yPosition += 3
      addWrappedText('Q2 2025 - Presale & Expansion (Current):', 12, [204, 153, 0]) // Dark yellow for current
      addWrappedText('• Public presale campaign')
      addWrappedText('• DEX listings (PancakeSwap, Uniswap)')
      addWrappedText('• Community growth initiatives')
      addWrappedText('• Strategic partnerships')
      
      yPosition += 3
      addWrappedText('Q3 2025 - Mobile & CEX:', 12, [96, 96, 96]) // Gray for future
      addWrappedText('• iOS & Android app launch')
      addWrappedText('• Tier 2 CEX listings')
      addWrappedText('• Enhanced security features')
      addWrappedText('• Global marketing campaign')
      
      yPosition += 3
      addWrappedText('Q4 2025 - Global Expansion:', 12, [96, 96, 96]) // Gray for future
      addWrappedText('• Tier 1 CEX listings')
      addWrappedText('• Cross-chain bridge development')
      addWrappedText('• Institutional partnerships')
      addWrappedText('• Advanced DeFi features')

      // Team & Legal
      addSectionHeader('TEAM & COMPLIANCE')
      addWrappedText('BBLIP is built by a team of experienced blockchain developers, financial experts, and security specialists with 9+ years of combined experience in cryptocurrency and fintech. Our team has previously worked at leading companies including Binance, Coinbase, PayPal, and major investment banks.')
      
      yPosition += 5
      addWrappedText('Regulatory Approach:', 12, [204, 153, 0]) // Dark yellow
      addWrappedText('BBLIP operates in compliance with international cryptocurrency regulations while maintaining user privacy through our innovative KYC-free architecture. We work closely with legal experts to ensure our platform meets regulatory requirements without compromising user freedom.')
      
      yPosition += 5
      addWrappedText('Risk Disclosure:', 12, [153, 76, 0]) // Orange for warning
      addWrappedText('Cryptocurrency investments carry inherent risks. The value of BBLP tokens may fluctuate significantly. Users should conduct their own research and consult with financial advisors before participating. Past performance does not guarantee future results.')

      // Footer
      pdf.addPage()
      pdf.setFontSize(10)
      pdf.setTextColor(96, 96, 96) // Dark gray for footer
      pdf.text('This whitepaper is for informational purposes only and does not constitute investment advice.', pageWidth / 2, pageHeight - 30, { align: 'center' })
      pdf.text('© 2025 BBLIP. All rights reserved.', pageWidth / 2, pageHeight - 20, { align: 'center' })

      // Save the PDF
      pdf.save('BBLIP-Whitepaper.pdf')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('PDF generation failed. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      <Header />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-orange-500/10" />
        <Container size="lg" className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center py-12 md:py-20"
          >
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              Version 1.0 - January 2025
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              BBLIP
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {' '}Whitepaper
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto mb-8">
              The Future of Crypto Spending: A Comprehensive Guide to the BBLIP Ecosystem
            </p>

            <Button
              onClick={generatePDF}
              disabled={isGeneratingPDF}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold px-8 py-4 rounded-full hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
            >
              <FileDown className="w-5 h-5 mr-2" />
              {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </motion.div>
        </Container>
      </div>

      {/* Whitepaper Content */}
      <div id="whitepaper-content" className="bg-black text-white">
        <Container size="lg" className="py-16">
          
          {/* Executive Summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Executive Summary</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-zinc-300 mb-6">
                BBLIP represents a paradigm shift in cryptocurrency spending, offering the world&apos;s first truly decentralized, 
                KYC-free crypto card ecosystem. By combining cutting-edge blockchain technology with user-friendly interfaces, 
                BBLIP enables anyone to spend their cryptocurrency anywhere in the world without traditional banking restrictions.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <Coins className="w-10 h-10 text-yellow-400 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">100M Fixed Supply</h4>
                  <p className="text-zinc-400">Deflationary tokenomics with burn mechanisms</p>
                </div>
                
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <TrendingUp className="w-10 h-10 text-yellow-400 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">32% APR Staking</h4>
                  <p className="text-zinc-400">Industry-leading returns with flexible unstaking</p>
                </div>
                
                <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                  <Globe className="w-10 h-10 text-yellow-400 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">40M+ Merchants</h4>
                  <p className="text-zinc-400">Global acceptance across 180+ countries</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Problem Statement */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Problem Statement</h2>
            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-2xl font-semibold mb-4">Current Crypto Card Limitations</h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="text-red-400 mr-3">•</span>
                    <div>
                      <strong>Invasive KYC Requirements:</strong> Most crypto cards require extensive personal documentation, 
                      defeating the purpose of decentralized finance.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-3">•</span>
                    <div>
                      <strong>High Fees:</strong> Traditional crypto cards charge 2-3% conversion fees plus monthly maintenance fees.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-3">•</span>
                    <div>
                      <strong>Limited Acceptance:</strong> Many cards work only in specific regions or with limited merchant networks.
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-3">•</span>
                    <div>
                      <strong>Custodial Risk:</strong> Users must trust third parties with their funds, creating security vulnerabilities.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Solution */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">The BBLIP Solution</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-zinc-900 rounded-xl p-8 border border-yellow-400/20">
                <Shield className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">No KYC Required</h3>
                <p className="text-zinc-300">
                  True financial freedom with zero personal information required. Connect your wallet and start spending immediately.
                </p>
              </div>
              
              <div className="bg-zinc-900 rounded-xl p-8 border border-yellow-400/20">
                <Lock className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">Self-Custody</h3>
                <p className="text-zinc-300">
                  Your keys, your crypto. BBLIP never holds your funds - you maintain complete control at all times.
                </p>
              </div>
              
              <div className="bg-zinc-900 rounded-xl p-8 border border-yellow-400/20">
                <CreditCard className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">Three Card Tiers</h3>
                <p className="text-zinc-300">
                  Bronze, Silver, and Black cards with increasing benefits and cashback rates up to 2% in BBLP tokens.
                </p>
              </div>
              
              <div className="bg-zinc-900 rounded-xl p-8 border border-yellow-400/20">
                <Zap className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">Instant Activation</h3>
                <p className="text-zinc-300">
                  Virtual cards activate instantly upon wallet connection. Physical cards ship globally within days.
                </p>
              </div>
            </div>
          </motion.section>

          {/* Tokenomics */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Tokenomics</h2>
            
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 mb-8">
              <h3 className="text-2xl font-semibold mb-6">Token Distribution</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Staking Rewards</span>
                  <span className="text-yellow-400 font-semibold">30% (30M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">ICO & Presale</span>
                  <span className="text-yellow-400 font-semibold">25% (25M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Team & Development</span>
                  <span className="text-yellow-400 font-semibold">15% (15M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Private Sale</span>
                  <span className="text-yellow-400 font-semibold">10% (10M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Initial Staking</span>
                  <span className="text-yellow-400 font-semibold">5% (5M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Liquidity</span>
                  <span className="text-yellow-400 font-semibold">5% (5M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Business Partnerships</span>
                  <span className="text-yellow-400 font-semibold">5% (5M BBLP)</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-lg">
                  <span className="text-lg">Airdrop</span>
                  <span className="text-yellow-400 font-semibold">5% (5M BBLP)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-2xl font-semibold mb-4">Token Utility</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Governance voting rights</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Staking for card tier upgrades</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Cashback rewards in BBLP</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Revenue sharing from fees</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Referral program rewards</span>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-2xl font-semibold mb-4">Deflationary Mechanics</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>0.5% burn on transactions</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Quarterly buyback & burn</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Staking lock reduces circulation</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Card tier staking requirements</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                    <span>Maximum supply cap at 100M</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Card System */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Card System</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Bronze Card */}
              <div className="bg-gradient-to-br from-orange-900/20 to-zinc-900 rounded-xl p-8 border border-orange-500/30">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-semibold text-orange-400">Bronze Card</h3>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Entry Level</Badge>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Stake Required</span>
                    <span className="text-white font-semibold">1,000 BBLP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cashback Rate</span>
                    <span className="text-white font-semibold">1%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Daily Limit</span>
                    <span className="text-white font-semibold">$1,000</span>
                  </div>
                </div>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Virtual card only
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Perfect for subscriptions
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Instant activation
                  </li>
                </ul>
              </div>

              {/* Silver Card */}
              <div className="bg-gradient-to-br from-zinc-700/20 to-zinc-900 rounded-xl p-8 border border-zinc-500/30">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-semibold text-zinc-300">Silver Card</h3>
                  <Badge className="bg-zinc-500/20 text-zinc-300 border-zinc-500/30">Premium</Badge>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Stake Required</span>
                    <span className="text-white font-semibold">2,000 BBLP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cashback Rate</span>
                    <span className="text-white font-semibold">1.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Daily Limit</span>
                    <span className="text-white font-semibold">$5,000</span>
                  </div>
                </div>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Virtual + Physical card
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    E-commerce optimized
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Priority support
                  </li>
                </ul>
              </div>

              {/* Black Card */}
              <div className="bg-gradient-to-br from-yellow-500/20 to-zinc-900 rounded-xl p-8 border border-yellow-500/30">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-semibold text-yellow-400">Black Card</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Elite</Badge>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Stake Required</span>
                    <span className="text-white font-semibold">3,500 BBLP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cashback Rate</span>
                    <span className="text-white font-semibold">2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Daily Limit</span>
                    <span className="text-white font-semibold">$25,000</span>
                  </div>
                </div>
                
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    Premium metal card
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    NFC enabled
                  </li>
                  <li className="flex items-center text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    VIP support 24/7
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Staking System */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Staking System</h2>
            
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 mb-8">
              <h3 className="text-2xl font-semibold mb-6">Staking Tiers & Rewards</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-4 px-4">Tier</th>
                      <th className="text-left py-4 px-4">Min. Stake</th>
                      <th className="text-left py-4 px-4">APR</th>
                      <th className="text-left py-4 px-4">Lock Period</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-800">
                      <td className="py-4 px-4">Tier 1</td>
                      <td className="py-4 px-4">100 BBLP</td>
                      <td className="py-4 px-4 text-yellow-400">15%</td>
                      <td className="py-4 px-4">Flexible</td>
                    </tr>
                    <tr className="border-b border-zinc-800">
                      <td className="py-4 px-4">Tier 2</td>
                      <td className="py-4 px-4">1,000 BBLP</td>
                      <td className="py-4 px-4 text-yellow-400">22%</td>
                      <td className="py-4 px-4">Flexible</td>
                    </tr>
                    <tr className="border-b border-zinc-800">
                      <td className="py-4 px-4">Tier 3</td>
                      <td className="py-4 px-4">5,000 BBLP</td>
                      <td className="py-4 px-4 text-yellow-400">28%</td>
                      <td className="py-4 px-4">Flexible</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4">Tier 4</td>
                      <td className="py-4 px-4">10,000 BBLP</td>
                      <td className="py-4 px-4 text-yellow-400">32%</td>
                      <td className="py-4 px-4">Flexible</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-xl font-semibold mb-4">Key Features</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Daily compound interest calculation</span>
                  </li>
                  <li className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>No minimum lock periods</span>
                  </li>
                  <li className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Instant unstaking available</span>
                  </li>
                  <li className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Auto-compound option</span>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-xl font-semibold mb-4">Staking Benefits</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <Award className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Card tier qualification</span>
                  </li>
                  <li className="flex items-start">
                    <Award className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Governance voting power</span>
                  </li>
                  <li className="flex items-start">
                    <Award className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Priority feature access</span>
                  </li>
                  <li className="flex items-start">
                    <Award className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" />
                    <span>Revenue sharing eligibility</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Referral Program */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Referral Program</h2>
            
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 mb-8">
              <h3 className="text-2xl font-semibold mb-6">How It Works</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-400">1</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Share Your Code</h4>
                  <p className="text-zinc-400">Get a unique referral code and share with friends</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-400">2</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Friends Join</h4>
                  <p className="text-zinc-400">They sign up and stake BBLP tokens</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-yellow-400">3</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Earn Rewards</h4>
                  <p className="text-zinc-400">Both you and your friend earn USDT instantly</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-xl font-semibold mb-4">Reward Structure</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between">
                    <span>Friend stakes 100 BBLP</span>
                    <span className="text-yellow-400">$1 USDT</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Friend stakes 1,000 BBLP</span>
                    <span className="text-yellow-400">$10 USDT</span>  
                  </li>
                  <li className="flex justify-between">
                    <span>Friend stakes 2,500 BBLP</span>
                    <span className="text-yellow-400">$25 USDT</span>  
                  </li>
                  <li className="flex justify-between">
                    <span>Friend stakes 3,500 BBLP</span>
                    <span className="text-yellow-400">$35 USDT</span>   
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <h3 className="text-xl font-semibold mb-4">Leaderboard Bonuses</h3>
                <ul className="space-y-3">
                  <li className="flex justify-between">
                    <span>1st Place</span>
                    <span className="text-yellow-400">$1,000 USDT</span>
                  </li>
                  <li className="flex justify-between">
                    <span>2nd Place</span>
                    <span className="text-yellow-400">$500 USDT</span>
                  </li>
                  <li className="flex justify-between">
                    <span>3rd Place</span>
                    <span className="text-yellow-400">$250 USDT</span>
                  </li>
                  <li className="flex justify-between">
                    <span>4th-5th Place</span>
                    <span className="text-yellow-400">$150 - $100 USDT</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Security */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Security Architecture</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <Shield className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">Smart Contract Security</h3>
                <ul className="space-y-3 text-zinc-300">
                  <li>• Multi-signature governance</li>
                  <li>• Time-locked transactions</li>
                  <li>• Emergency pause functionality</li>
                  <li>• Automated security monitoring</li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
                <Lock className="w-12 h-12 text-yellow-400 mb-4" />
                <h3 className="text-2xl font-semibold mb-4">User Protection</h3>
                <ul className="space-y-3 text-zinc-300">
                  <li>• AES-256 encryption</li>
                  <li>• Real-time fraud detection</li>
                  <li>• Multi-factor authentication</li>
                  <li>• Hardware wallet support</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Roadmap */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Development Roadmap</h2>
            
            <div className="space-y-8">
              <div className="bg-zinc-900 rounded-xl p-8 border-l-4 border-green-400">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                  <h3 className="text-xl font-semibold">Q1 2025 - Web dApp development (Completed)</h3>
                </div>
                <ul className="space-y-2 text-zinc-300 ml-9">
                <li>• Idea Generation</li>
                  <li>• Web application development</li>
                  <li>• Card System Beta launch</li>
                  <li>• Community Scaling</li>
                
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border-l-4 border-yellow-400">
                <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
                <h3 className="text-xl font-semibold">Q2 2025 - Platform Public Launch  (Completed)</h3>
                </div>
                <ul className="space-y-2 text-zinc-300 ml-9">
                  <li>• Swap system implementation</li>
                  <li>• Staking platform launch</li>
                  <li>• Crypto card system beta</li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border-l-4 border-zinc-400">
                <div className="flex items-center mb-4">
                <Rocket className="w-6 h-6 text-yellow-400 mr-3" />
                <h3 className="text-xl font-semibold">Q3 2025 - Presale & Expansion (Current)</h3>
                </div>
                <ul className="space-y-2 text-zinc-300 ml-9">
                <li>• Public presale campaign</li>
                  <li>• DEX listings (PancakeSwap, Uniswap)</li>
                  <li>• Community growth initiatives</li>
                  <li>• Strategic partnerships</li>
                </ul>
              </div>

              <div className="bg-zinc-900 rounded-xl p-8 border-l-4 border-zinc-400">
                <div className="flex items-center mb-4">
                  <Globe className="w-6 h-6 text-zinc-400 mr-3" />
                  <h3 className="text-xl font-semibold">Q4 2025 - Global Expansion</h3>
                </div>
                <ul className="space-y-2 text-zinc-300 ml-9">
                <li>• iOS & Android app launch</li>
                  <li>• Tier 2 CEX listings</li>
                  <li>• Enhanced security features</li>
                  <li>• Global marketing campaign</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Team */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Core Team</h2>
            
            <p className="text-lg text-zinc-300 mb-8">
              BBLIP is built by a team of experienced blockchain developers, financial experts, and security specialists 
              with a combined 9+ years of experience in cryptocurrency and fintech. Our team has previously worked at 
              leading companies including Binance, Coinbase, PayPal, and major investment banks.
            </p>

            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
              <h3 className="text-xl font-semibold mb-4">Advisory Board</h3>
              <p className="text-zinc-300">
                Our advisory board includes former executives from major cryptocurrency exchanges, 
                blockchain security experts, and traditional finance veterans who guide our strategic direction 
                and ensure compliance with global regulations.
              </p>
            </div>
          </motion.section>

          {/* Legal & Compliance */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-yellow-400">Legal & Compliance</h2>
            
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
              <h3 className="text-xl font-semibold mb-4">Regulatory Approach</h3>
              <p className="text-zinc-300 mb-6">
                BBLIP operates in compliance with international cryptocurrency regulations while maintaining 
                user privacy through our innovative KYC-free architecture. We work closely with legal experts 
                to ensure our platform meets regulatory requirements without compromising user freedom.
              </p>

              <h3 className="text-xl font-semibold mb-4">Risk Disclosure</h3>
              <p className="text-zinc-300">
                Cryptocurrency investments carry inherent risks. The value of BBLP tokens may fluctuate significantly. 
                Users should conduct their own research and consult with financial advisors before participating. 
                Past performance does not guarantee future results.
              </p>
            </div>
          </motion.section>


        </Container>
      </div>

      <Footer />
    </div>
  )
} 