"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { userService, referralService, airdropService } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminWallet, setAdminWallet] = useState("");
  const [userStats, setUserStats] = useState({ totalUsers: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortedUsers, setSortedUsers] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvCurrentPage, setCsvCurrentPage] = useState(1);
  const csvPageSize = 100;
  const pageSize = 20;
  const router = useRouter();

  useEffect(() => {
    // Admin session kontrolü
    const checkAdminSession = () => {
      const adminSession = localStorage.getItem('admin_session');
      const adminWalletAddress = localStorage.getItem('admin_wallet');
      
      if (adminSession === 'true' && adminWalletAddress) {
        setAdminWallet(adminWalletAddress);
        setIsAuthenticated(true);
      } else {
        // Session yoksa login sayfasına yönlendir
        router.replace('/administratorLogin');
        return;
      }
      
      setIsLoading(false);
    };

    checkAdminSession();
  }, [router]);

  // Kullanıcıları sayfalı olarak al
  const fetchUsers = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoadingUsers(true);
      } else {
        setLoadingMore(true);
      }
      
      // Sayfalı kullanıcıları çek
      const response = await fetch(`/api/admin/users?page=${page}&limit=${pageSize}`);
      
      if (!response.ok) {
        console.error("Error fetching users:", response.statusText);
        return;
      }
      
      const { data: users, total, hasMore: moreAvailable } = await response.json();
      
      if (append) {
        setAllUsers(prev => [...prev, ...(users || [])]);
      } else {
        setAllUsers(users || []);
      }
      
      // API'den gelen verileri direkt kullan (zaten sıralanmış)
      const newUsers = users || [];
      const usersWithReferrals = newUsers.map((user: any) => ({
        ...user,
        referralCount: user.referral_count || 0
      }));
      
      if (append) {
        setSortedUsers(prev => [...prev, ...usersWithReferrals]);
      } else {
        setSortedUsers(usersWithReferrals);
      }
      
      setHasMore(moreAvailable);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Kullanıcı istatistiklerini al
    const fetchUserStats = async () => {
      try {
        const stats = await userService.getUserStats();
        setUserStats(stats);
      } catch (error) {
        console.error("Error fetching user stats:", error);
      }
    };

    if (isAuthenticated) {
      fetchUserStats();
      fetchUsers(1, false);
    }
  }, [isAuthenticated]);

  const loadMoreUsers = () => {
    if (!loadingMore && hasMore) {
      fetchUsers(currentPage + 1, true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_wallet');
    toast.success("Başarıyla çıkış yapıldı");
    router.push('/administratorLogin');
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // Status kolonunda sadece "success" olanları filtrele
      const filteredData = data.filter(row => {
        const status = row.status || row.Status || row.STATUS || '';
        return status.toLowerCase().includes('success');
      });

      // Ethereum address veya email'e göre grupla ve XP'leri topla
      const groupedData = new Map();

      filteredData.forEach(row => {
        // Ethereum address kolonunu bul (farklı isimler olabilir)
        const ethAddress = row['ethereum address'] || row['Ethereum Adresi(ler)'] || row['ethereum_address'] || row['Ethereum Address'] || row['wallet_address'] || '';
        const email = row['email'] || row['Email(ler)'] || row['Email'] || '';
        const xp = parseFloat(row['xp'] || row['Toplam XP'] || row['total_xp'] || row['XP'] || row['xp_total'] || row['total_xp'] || '0') || 0;

        let key = '';
        let keyType = '';

        if (ethAddress && ethAddress.trim() !== '' && ethAddress.trim() !== 'YOK') {
          // Ethereum address varsa onu kullan
          key = ethAddress.trim().toLowerCase();
          keyType = 'ethereum';
        } else if (email && email.trim() !== '') {
          // Ethereum address yoksa email kullan
          key = email.trim().toLowerCase();
          keyType = 'email';
        } else {
          // Her ikisi de yoksa satırı atla
          return;
        }

        if (groupedData.has(key)) {
          // Mevcut kaydı güncelle
          const existing = groupedData.get(key);
          existing.totalXp += xp;
          existing.count += 1;
          existing.rows.push(row);
        } else {
          // Yeni kayıt oluştur
          groupedData.set(key, {
            key: key,
            keyType: keyType,
            totalXp: xp,
            count: 1,
            rows: [row],
            originalRow: row // İlk satırı referans olarak sakla
          });
        }
      });

      // Gruplandırılmış veriyi düzleştir
      const processedData = Array.from(groupedData.values())
        .filter(group => group.keyType === 'ethereum') // Sadece ethereum address'i olanları filtrele
        .map(group => {
          const firstRow = group.originalRow;
          return {
            ...firstRow,
            'ethereum address': group.key,
            'email': firstRow['email'] || '',
            'xp': group.totalXp.toString(),
            'Kayıt Sayısı': group.count.toString(),
            'Gruplama Tipi': 'Ethereum Address'
          };
        });

      // XP'ye göre sırala (en yüksekten en düşüğe)
      processedData.sort((a, b) => {
        const xpA = parseFloat(a['xp']) || 0;
        const xpB = parseFloat(b['xp']) || 0;
        console.log('Sıralama:', xpA, xpB, xpB - xpA); // Debug için
        return xpB - xpA;
      });

      console.log('Sıralanmış veri (ilk 5):', processedData.slice(0, 5).map(item => ({ 
        address: item['ethereum address'], 
        xp: item['xp'] 
      })));

      setCsvHeaders([...headers, 'Kayıt Sayısı', 'Gruplama Tipi']);
      setCsvData(processedData);
      setCsvCurrentPage(1);
      setShowCsvModal(true);
    };
    reader.readAsText(file);
  };

  // Add to Database function (PERFORMANCE OPTIMIZED)
  const handleAddToDatabase = async () => {
    if (csvData.length === 0) {
      toast.error('Önce CSV dosyası yükleyin');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for batch processing
      const airdropData = csvData
        .filter(row => {
          const ethereumAddress = row['ethereum address'];
          const xpAmount = parseFloat(row['xp']) || 0;
          return ethereumAddress && xpAmount > 0;
        })
        .map(row => ({
          ethereumAddress: row['ethereum address'],
          xpAmount: parseFloat(row['xp']) || 0
        }));

      if (airdropData.length === 0) {
        toast.error('Geçerli airdrop verisi bulunamadı');
        return;
      }

      console.log(`Processing ${airdropData.length} airdrop records...`);

      // Use optimized batch processing - add new and update existing
      const { successCount, errorCount, updatedCount, newCount } = await airdropService.batchAddOrUpdateAirdrops(airdropData);

      if (successCount > 0) {
        let message = '';
        if (newCount > 0 && updatedCount > 0) {
          message = `${newCount} yeni kayıt eklendi, ${updatedCount} kayıt güncellendi!`;
        } else if (newCount > 0) {
          message = `${newCount} yeni airdrop kaydı eklendi!`;
        } else if (updatedCount > 0) {
          message = `${updatedCount} mevcut kayıt güncellendi!`;
        }
        toast.success(message);
        
        if (errorCount > 0) {
          toast.error(`${errorCount} kayıt işlenirken hata oluştu`);
        }
      } else {
        toast.error('Hiçbir kayıt işlenemedi');
      }
    } catch (error) {
      console.error('Error in handleAddToDatabase:', error);
      toast.error('Veritabanına ekleme sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading durumu
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-200 mx-auto mb-4"></div>
          <p className="text-zinc-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Yetkisiz erişim
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111111]/80 backdrop-blur-md border-b border-zinc-800/50 p-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Bblip Admin Panel</h1>
              <p className="text-sm text-zinc-400">Yönetim Paneli</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-zinc-400">Admin Wallet</p>
              <p className="text-xs text-yellow-200 font-mono">
                {adminWallet.slice(0, 8)}...{adminWallet.slice(-6)}
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="bg-red-900/20 border-red-800/50 text-red-400 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-300"
            >
              Çıkış Yap
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">Hoş Geldiniz!</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Bblip platform yönetim paneline hoş geldiniz. Buradan platform istatistiklerini görüntüleyebilir ve yönetim işlemlerini gerçekleştirebilirsiniz.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-400">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{userStats.totalUsers}</p>
                  <p className="text-sm text-zinc-400">Toplam Kullanıcı</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-400">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-zinc-400">Aktif Stake</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-400">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-4.7 6.27c-.41.55-.63 1.24-.63 1.93V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-zinc-400">Toplam Referral</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-400">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">0</p>
                  <p className="text-sm text-zinc-400">Toplam Ödül</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-8"
          >
            <h3 className="text-xl font-bold text-white mb-6">Hızlı İşlemler</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="bg-blue-900/20 border-blue-800/50 text-blue-400 hover:bg-blue-900/30 hover:border-blue-500/50 hover:text-blue-300 h-16"
                onClick={() => toast.info("Bu özellik yakında eklenecek")}
              >
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mx-auto mb-2">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <p className="text-sm">Kullanıcı Yönetimi</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="bg-green-900/20 border-green-800/50 text-green-400 hover:bg-green-900/30 hover:border-green-500/50 hover:text-green-300 h-16"
                onClick={() => toast.info("Bu özellik yakında eklenecek")}
              >
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mx-auto mb-2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <p className="text-sm">Stake Yönetimi</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="bg-purple-900/20 border-purple-800/50 text-purple-400 hover:bg-purple-900/30 hover:border-purple-500/50 hover:text-purple-300 h-16"
                onClick={() => toast.info("Bu özellik yakında eklenecek")}
              >
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mx-auto mb-2">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H17c-.8 0-1.54.37-2.01 1l-4.7 6.27c-.41.55-.63 1.24-.63 1.93V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2z"/>
                  </svg>
                  <p className="text-sm">Referral Yönetimi</p>
                </div>
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  variant="outline"
                  className="bg-yellow-900/20 border-yellow-800/50 text-yellow-400 hover:bg-yellow-900/30 hover:border-yellow-500/50 hover:text-yellow-300 h-16 w-full"
                >
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mx-auto mb-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1v5h5v10H6V3h7z"/>
                    </svg>
                    <p className="text-sm">CSV Yükle</p>
                  </div>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Users Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Kullanıcı Listesi</h3>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">
                  {allUsers.length} kullanıcı gösteriliyor
                </span>
                {loadingUsers && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-200"></div>
                )}
              </div>
            </div>

            {loadingUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-200 mx-auto mb-4"></div>
                <p className="text-zinc-400">Kullanıcılar yükleniyor...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">#</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Cüzdan Adresi</th>
                      <th className="text-left py-3 px-4 text-zinc-400 font-medium">Davet Edilen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user, index) => {
                      const maskedAddress = `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}`;
                      const referralCount = user.referralCount || 0;
                      
                      return (
                        <tr key={user.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 px-4 text-white font-mono">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                                <span className="text-black font-bold text-xs">
                                  {user.wallet_address.slice(2, 3).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-white font-mono text-sm">{maskedAddress}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{referralCount}</span>
                              <span className="text-xs text-zinc-400">kişi</span>
                              {referralCount > 0 && (
                                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                  #{index + 1}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {sortedUsers.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-zinc-400">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <p className="text-zinc-400">Henüz kullanıcı bulunmuyor</p>
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && sortedUsers.length > 0 && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={loadMoreUsers}
                      disabled={loadingMore}
                      className="bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl px-6 py-2 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          Yükleniyor...
                        </div>
                      ) : (
                        "Daha Fazla Yükle"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* System Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-8"
          >
            <h3 className="text-xl font-bold text-white mb-6">Sistem Bilgileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Platform:</span>
                  <span className="text-white font-mono">Bblip Protocol</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Versiyon:</span>
                  <span className="text-white font-mono">1.5.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Admin Wallet:</span>
                  <span className="text-yellow-200 font-mono text-sm">
                    {adminWallet.slice(0, 8)}...{adminWallet.slice(-6)}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Son Güncelleme:</span>
                  <span className="text-white font-mono">{new Date().toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Durum:</span>
                  <span className="text-green-400 font-medium">Aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Güvenlik:</span>
                  <span className="text-green-400 font-medium">Yüksek</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* CSV Preview Modal */}
      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden bg-[#111111]/95 backdrop-blur-xl border border-zinc-800/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">CSV Dosya Önizleme</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {csvData.length > 0 && (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-zinc-900/80 backdrop-blur-sm">
                  <tr className="border-b border-zinc-700">
                    {csvHeaders.map((header, index) => (
                      <th key={index} className="text-left py-3 px-4 text-zinc-300 font-medium text-sm border-r border-zinc-700 last:border-r-0">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData
                    .slice((csvCurrentPage - 1) * csvPageSize, csvCurrentPage * csvPageSize)
                    .map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      {csvHeaders.map((header, colIndex) => (
                        <td key={colIndex} className="py-2 px-4 text-white text-sm border-r border-zinc-800/30 last:border-r-0 max-w-xs truncate">
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-zinc-800/50">
            <div className="text-sm text-zinc-400">
              Sayfa {csvCurrentPage} / {Math.ceil(csvData.length / csvPageSize)} | 
              Toplam {csvData.length} satır, {csvHeaders.length} kolon
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCsvCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={csvCurrentPage === 1}
                className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
                size="sm"
              >
                Önceki
              </Button>
              <Button
                onClick={() => setCsvCurrentPage(prev => Math.min(Math.ceil(csvData.length / csvPageSize), prev + 1))}
                disabled={csvCurrentPage >= Math.ceil(csvData.length / csvPageSize)}
                className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
                size="sm"
              >
                Sonraki
              </Button>
              <Button
                onClick={handleAddToDatabase}
                disabled={isLoading || csvData.length === 0}
                className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                size="sm"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Ekleniyor...
                  </div>
                ) : (
                  "Veritabanına Ekle"
                )}
              </Button>
              <Button
                onClick={() => setShowCsvModal(false)}
                className="bg-zinc-800 text-white hover:bg-zinc-700"
              >
                Kapat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 