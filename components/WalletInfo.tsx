interface WalletInfoProps {
  address: string;
  tokenBalance: string;
  stakedAmount: string;
  pendingRewards: string;
}

const formatLargeNumber = (value: string | number): string => {
  if (!value || value === '0' || value === '0.0') return '0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00';
  
  // For very large numbers, show in millions/billions
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Milyar';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Milyon';
  }
  
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatRewards = (value: string | number): string => {
  if (!value || value === '0' || value === '0.0') return '0,000000';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,000000';
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};

export default function WalletInfo({ address, tokenBalance, stakedAmount, pendingRewards }: WalletInfoProps) {
  console.log('WalletInfo props:', { address, tokenBalance, stakedAmount, pendingRewards });

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="mr-3 text-yellow-200">👛</span> Cüzdan Bilgileri
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-yellow-200/20 transition-all duration-300">
          <p className="text-gray-400 text-sm mb-2">Adres</p>
          <p className="text-white font-mono text-sm bg-black/20 py-1 px-2 rounded-md overflow-hidden text-ellipsis">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Bağlanmadı'}</p>
        </div>
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-yellow-200/20 transition-all duration-300">
          <p className="text-gray-400 text-sm mb-2">Token Bakiyesi</p>
          <div className="flex items-baseline">
            <p className="text-white font-bold text-xl" title={`${tokenBalance} TOKEN`}>
              {formatLargeNumber(tokenBalance)}
            </p>
            <span className="text-sm font-normal text-gray-400 ml-2">TOKEN</span>
          </div>
        </div>
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-yellow-200/20 transition-all duration-300">
          <p className="text-gray-400 text-sm mb-2">Stake Edilen</p>
          <div className="flex items-baseline">
            <p className="text-green-400 font-bold text-xl" title={`${stakedAmount} TOKEN`}>
              {formatLargeNumber(stakedAmount)}
            </p>
            <span className="text-sm font-normal text-gray-400 ml-2">TOKEN</span>
          </div>
        </div>
        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-5 border border-white/5 hover:border-yellow-200/20 transition-all duration-300">
          <p className="text-gray-400 text-sm mb-2">Bekleyen Ödüller</p>
          <div className="flex items-baseline">
            <p className="text-yellow-200 font-bold text-xl" title={`${pendingRewards} TOKEN`}>
              {formatRewards(pendingRewards)}
            </p>
            <span className="text-sm font-normal text-gray-400 ml-2">TOKEN</span>
          </div>
        </div>
      </div>
    </div>
  );
} 