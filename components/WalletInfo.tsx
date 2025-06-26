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
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <span className="mr-3">👛</span> Cüzdan Bilgileri
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Adres</p>
          <p className="text-white font-mono text-sm">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Bağlanmadı'}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Token Bakiyesi</p>
          <p className="text-white font-bold text-lg" title={`${tokenBalance} TOKEN`}>
            {formatLargeNumber(tokenBalance)} <span className="text-sm font-normal">TOKEN</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Stake Edilen</p>
          <p className="text-green-400 font-bold text-lg" title={`${stakedAmount} TOKEN`}>
            {formatLargeNumber(stakedAmount)} <span className="text-sm font-normal">TOKEN</span>
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Bekleyen Ödüller</p>
          <p className="text-yellow-400 font-bold text-lg" title={`${pendingRewards} TOKEN`}>
            {formatRewards(pendingRewards)} <span className="text-sm font-normal">TOKEN</span>
          </p>
        </div>
      </div>
    </div>
  );
} 