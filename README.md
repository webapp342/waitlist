# Next.js + Notion — Waitlist Template with BSC Testnet Integration

A modern and beautiful waitlist template built with **Next.js**, featuring wallet connectivity specifically for **BSC Testnet (Chain ID: 97)**, user management with **Supabase**, and automatic card generation for registered users.

## ✨ **Features**

- 🌟 **Modern UI/UX** with smooth animations and particles
- 🔗 **BSC Testnet Integration** with automatic network switching
- 💳 **Automatic Card Generation** (Bronze, Silver, Gold cards for each user)
- 🗄️ **Supabase Database** for user and card management
- 🔄 **Real-time Network Validation** and switching prompts
- 📱 **Responsive Design** optimized for all devices
- ⚡ **Performance Optimized** with reduced particles and smooth animations

## 🚀 **Tech Stack**

- **Framework**: Next.js 15 with App Router
- **Blockchain**: BSC Testnet (Chain ID: 97)
- **Wallet Integration**: Wagmi v2 + WalletConnect
- **Database**: Supabase with Row Level Security
- **Styling**: Tailwind CSS + Framer Motion
- **UI Components**: Radix UI + shadcn/ui
- **TypeScript**: Full type safety

## 🎯 **Network Requirements**

This application **ONLY** works with **BSC Testnet**:
- **Chain ID**: 97
- **Network Name**: BSC Testnet
- **Currency**: tBNB (Test BNB)
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545/
- **Block Explorer**: https://testnet.bscscan.com/

The app will automatically:
- ✅ Detect your current network
- ⚠️ Show warnings if you're on the wrong network
- 🔄 Prompt automatic network switching
- 🚫 Block features until you're on BSC Testnet

## 📋 **Prerequisites**

Before you begin, ensure you have:
- Node.js 18+ installed
- A wallet with BSC Testnet configured (MetaMask recommended)
- Test BNB tokens for BSC Testnet (get from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart))
- Supabase account and project

## 🛠️ **Installation**

### 1. Clone and Install

```bash
git clone https://github.com/your-username/nextjs-notion-waitlist-template
cd nextjs-notion-waitlist-template
npm install
# or
bun install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL editor in your Supabase dashboard
3. Copy and paste the contents of `database-migration.sql` file
4. Run the SQL to create the users and cards tables with all triggers
5. Get your project URL and anon key from Settings > API

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WalletConnect Project ID (optional - has default)
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id
```

### 4. Start Development Server

```bash
npm run dev
# or
bun dev
```

Visit `http://localhost:3000` and connect your wallet with BSC Testnet!

## 🗄️ **Database Schema**

### Users Table
```sql
- id (BIGSERIAL PRIMARY KEY)
- wallet_address (VARCHAR(42) UNIQUE)
- created_at (TIMESTAMP)
```

### Cards Table
```sql
- id (BIGSERIAL PRIMARY KEY)
- user_id (BIGINT, Foreign Key)
- card_number (VARCHAR(16), 16-digit number)
- cvv (VARCHAR(3), 3-digit code)
- expiration_date (DATE, calculated from user creation)
- card_type (VARCHAR(10): 'bronze', 'silver', 'gold')
- created_at (TIMESTAMP)
```

## 🎮 **How It Works**

1. **Connect Wallet**: User connects their wallet (MetaMask, WalletConnect, etc.)
2. **Network Check**: App checks if user is on BSC Testnet (Chain ID: 97)
3. **Auto Switch**: If on wrong network, prompts automatic switching
4. **User Creation**: Saves wallet address to Supabase database
5. **Card Generation**: Database trigger creates 3 cards automatically:
   - 🥉 **Bronze Card**: Expires in 2 years
   - 🥈 **Silver Card**: Expires in 3 years  
   - 🥇 **Gold Card**: Expires in 4 years
6. **Dashboard Access**: User can view cards and interact with the platform

## 🔧 **Customization**

### Change Target Network

To change from BSC Testnet to another network:

1. Update `lib/wagmi.ts`:
```typescript
export const TARGET_CHAIN_ID = 97; // Change this
export const TARGET_CHAIN_CONFIG = {
  chainId: '0x61', // Update hex value
  chainName: 'Your Network',
  // ... other config
};
```

2. Update all references in `components/dashboard-cta.tsx`

### Modify Card Generation

Edit the database trigger in `database-migration.sql`:
```sql
-- Modify expiration dates, card types, or generation logic
CREATE OR REPLACE FUNCTION create_user_cards(p_user_id BIGINT)
-- ... customize as needed
```

## 📱 **Responsive Features**

- **Desktop**: Full feature set with enhanced animations
- **Mobile**: Optimized particle count and simplified interactions
- **Touch**: Optimized for mobile wallet apps and touch interactions

## 🚀 **Deployment**

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fnextjs-notion-waitlist-template&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_WC_PROJECT_ID)

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Set environment variables in your hosting platform
3. Deploy the `.next` folder

## 🔍 **Debugging**

The app includes a debug component that shows:
- Current chain ID
- Network name
- Connection status
- BSC Testnet validation

Enable it in development by keeping the `<DebugChain />` component.

## 🛡️ **Security Features**

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Wallet address validation
- ✅ Network validation before any operations
- ✅ SQL injection protection via Supabase
- ✅ Environment variable validation

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

If you encounter issues:

1. **Network Issues**: Ensure you're on BSC Testnet (Chain ID: 97)
2. **Database Issues**: Check your Supabase configuration and run the migration script
3. **Wallet Issues**: Try refreshing the page and reconnecting your wallet

For further support, please create an issue in the repository.

---

**Made with ❤️ for the BSC Testnet ecosystem**
