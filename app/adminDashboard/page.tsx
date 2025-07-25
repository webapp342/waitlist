"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  // Daily Task Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskReward, setTaskReward] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);

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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskLoading(true);
    try {
      const res = await fetch("/api/admin/dailytasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, link: taskLink, reward: Number(taskReward) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Daily task created!");
        setTaskTitle("");
        setTaskLink("");
        setTaskReward("");
        setShowTaskModal(false);
      } else {
        toast.error(data.error || "Failed to create task");
      }
    } catch (err) {
      toast.error("Failed to create task");
    } finally {
      setTaskLoading(false);
    }
  };

  // Loading durumu
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
          <p className="text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Yetkisiz erişim
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-400">{adminWallet.slice(0, 8)}...{adminWallet.slice(-6)}</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            Çıkış
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{userStats.totalUsers}</div>
            <div className="text-sm text-gray-400">Toplam Kullanıcı</div>
          </div>
        </div>

        {/* Management Actions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <h3 className="font-semibold text-white mb-3">Yönetim</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTaskModal(true)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Task Oluştur
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                CSV Yükle
              </Button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Kullanıcılar</h3>
            <span className="text-sm text-gray-400">{allUsers.length} kullanıcı</span>
          </div>

          {loadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
              <p className="text-gray-400">Yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-2 text-gray-400">#</th>
                    <th className="text-left py-2 text-gray-400">Cüzdan</th>
                    <th className="text-left py-2 text-gray-400">Referral</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user, index) => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="py-2 text-white">{index + 1}</td>
                      <td className="py-2 font-mono text-white">
                        {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-6)}
                      </td>
                      <td className="py-2 text-white">{user.referralCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {sortedUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Kullanıcı bulunamadı</p>
                </div>
              )}

              {hasMore && sortedUsers.length > 0 && (
                <div className="text-center mt-4">
                  <Button
                    onClick={loadMoreUsers}
                    disabled={loadingMore}
                    size="sm"
                    className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600"
                  >
                    {loadingMore ? "Yükleniyor..." : "Daha Fazla"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* CSV Modal */}
      <Dialog open={showCsvModal} onOpenChange={setShowCsvModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">CSV Önizleme</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {csvData.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-600">
                    {csvHeaders.map((header, index) => (
                      <th key={index} className="text-left py-2 px-2 border-r border-gray-600 text-gray-300">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData
                    .slice((csvCurrentPage - 1) * csvPageSize, csvCurrentPage * csvPageSize)
                    .map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-700">
                      {csvHeaders.map((header, colIndex) => (
                        <td key={colIndex} className="py-1 px-2 border-r border-gray-700 text-xs max-w-xs truncate text-gray-300">
                          {row[header] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-600">
            <div className="text-sm text-gray-400">
              Sayfa {csvCurrentPage} / {Math.ceil(csvData.length / csvPageSize)} | {csvData.length} satır
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCsvCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={csvCurrentPage === 1}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Önceki
              </Button>
              <Button
                onClick={() => setCsvCurrentPage(prev => Math.min(Math.ceil(csvData.length / csvPageSize), prev + 1))}
                disabled={csvCurrentPage >= Math.ceil(csvData.length / csvPageSize)}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Sonraki
              </Button>
              <Button
                onClick={handleAddToDatabase}
                disabled={isLoading || csvData.length === 0}
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isLoading ? "Ekleniyor..." : "Veritabanına Ekle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Modal */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent className="max-w-md bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Task Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Başlık</label>
              <input
                type="text"
                className="w-full rounded border border-gray-600 bg-gray-700 text-white px-3 py-2"
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Link</label>
              <input
                type="text"
                className="w-full rounded border border-gray-600 bg-gray-700 text-white px-3 py-2"
                value={taskLink}
                onChange={e => setTaskLink(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Ödül</label>
              <input
                type="number"
                className="w-full rounded border border-gray-600 bg-gray-700 text-white px-3 py-2"
                value={taskReward}
                onChange={e => setTaskReward(e.target.value)}
                min={1}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowTaskModal(false)} 
                disabled={taskLoading}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                İptal
              </Button>
              <Button 
                type="submit" 
                disabled={taskLoading}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {taskLoading ? "Kaydediliyor..." : "Oluştur"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 