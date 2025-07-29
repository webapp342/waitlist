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
  const [whitelistStats, setWhitelistStats] = useState({ 
    totalUsers: 0,
    totalRegistrations: 0, 
    newUsersLastHour: 0,
    networkStats: { eth: 0, bnb: 0 },
    averageBalance: "0"
  });
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortedRegistrations, setSortedRegistrations] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvCurrentPage, setCsvCurrentPage] = useState(1);
  
  // Grok Task Winners states
  const [grokCsvData, setGrokCsvData] = useState<any[]>([]);
  const [grokCsvHeaders, setGrokCsvHeaders] = useState<string[]>([]);
  const [showGrokCsvModal, setShowGrokCsvModal] = useState(false);
  const [grokCsvCurrentPage, setGrokCsvCurrentPage] = useState(1);
  
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

  // Whitelist registrations'ları sayfalı olarak al
  const fetchRegistrations = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoadingRegistrations(true);
      } else {
        setLoadingMore(true);
      }
      
      // Sayfalı whitelist registrations'ları çek
      const response = await fetch(`/api/admin/whitelist-registrations?page=${page}&limit=${pageSize}`);
      
      if (!response.ok) {
        console.error("Error fetching registrations:", response.statusText);
        return;
      }
      
      const { data: registrations, total, hasMore: moreAvailable } = await response.json();
      
      if (append) {
        setAllRegistrations(prev => [...prev, ...(registrations || [])]);
      } else {
        setAllRegistrations(registrations || []);
      }
      
      // API'den gelen verileri direkt kullan (zaten sıralanmış)
      const newRegistrations = registrations || [];
      
      if (append) {
        setSortedRegistrations(prev => [...prev, ...newRegistrations]);
      } else {
        setSortedRegistrations(newRegistrations);
      }
      
      setHasMore(moreAvailable);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoadingRegistrations(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Whitelist istatistiklerini al
    const fetchWhitelistStats = async () => {
      try {
        const response = await fetch('/api/admin/whitelist-stats');
        if (response.ok) {
          const stats = await response.json();
          setWhitelistStats(stats);
        }
      } catch (error) {
        console.error("Error fetching whitelist stats:", error);
      }
    };

    if (isAuthenticated) {
      fetchWhitelistStats();
      fetchRegistrations(1, false);
    }
  }, [isAuthenticated]);

  const loadMoreRegistrations = () => {
    if (!loadingMore && hasMore) {
      fetchRegistrations(currentPage + 1, true);
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

  // Grok Task Winners CSV Upload Handler
  const handleGrokCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // x_username kolonunu bul ve temizle
      const processedData = data.filter(row => {
        const username = row['x_username'] || row['username'] || row['X Username'] || row['twitter_username'] || '';
        return username && username.trim() !== '';
      }).map(row => {
        const username = row['x_username'] || row['username'] || row['X Username'] || row['twitter_username'] || '';
        return {
          x_username: username.trim().toLowerCase()
        };
      });

      // Duplicate kontrolü yap
      const usernameMap = new Map();
      const uniqueData: any[] = [];
      let duplicateCount = 0;

      processedData.forEach(row => {
        const username = row.x_username;
        if (usernameMap.has(username)) {
          duplicateCount++;
        } else {
          usernameMap.set(username, true);
          uniqueData.push(row);
        }
      });

      // Duplicate bilgisi göster
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} duplicate kayıt tespit edildi ve otomatik olarak kaldırıldı.`);
      }

      console.log('Grok Task Winners:', uniqueData.slice(0, 5));
      console.log(`Total: ${processedData.length}, Unique: ${uniqueData.length}, Duplicates removed: ${duplicateCount}`);

      setGrokCsvHeaders(['x_username']);
      setGrokCsvData(uniqueData);
      setGrokCsvCurrentPage(1);
      setShowGrokCsvModal(true);
    };
    reader.readAsText(file);
  };

  // Add Grok Task Winners to Database
  const handleAddGrokWinnersToDatabase = async () => {
    if (grokCsvData.length === 0) {
      toast.error('Önce CSV dosyası yükleyin');
      return;
    }

    setIsLoading(true);

    try {
      const grokWinners = grokCsvData
        .filter(row => row.x_username && row.x_username.trim() !== '')
        .map(row => ({
          x_username: row.x_username.trim().toLowerCase()
        }));

      if (grokWinners.length === 0) {
        toast.error('Geçerli x_username verisi bulunamadı');
        return;
      }

      console.log(`Processing ${grokWinners.length} grok task winners...`);

      const response = await fetch('/api/admin/grok-task-winners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grokWinners }),
      });

      const result = await response.json();

      if (response.ok) {
        const { successCount, errorCount, newCount, updatedCount } = result;
        
        if (successCount > 0) {
          let message = '';
          if (newCount > 0 && updatedCount > 0) {
            message = `${newCount} yeni grok task winner eklendi, ${updatedCount} kayıt güncellendi!`;
          } else if (newCount > 0) {
            message = `${newCount} yeni grok task winner eklendi!`;
          } else if (updatedCount > 0) {
            message = `${updatedCount} grok task winner kaydı güncellendi!`;
          }
          toast.success(message);
          
          if (errorCount > 0) {
            toast.error(`${errorCount} kayıt işlenirken hata oluştu`);
          }
        } else {
          toast.error('Hiçbir kayıt işlenemedi');
        }
      } else {
        toast.error(result.error || 'Grok task winners eklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error in handleAddGrokWinnersToDatabase:', error);
      toast.error('Veritabanına ekleme sırasında hata oluştu');
    } finally {
      setIsLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{whitelistStats.totalUsers}</div>
              <div className="text-sm text-gray-400">Toplam Kullanıcı</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{whitelistStats.totalRegistrations}</div>
              <div className="text-sm text-gray-400">Toplam Kayıt</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{whitelistStats.newUsersLastHour}</div>
              <div className="text-sm text-gray-400">Son Saatte Yeni Kayıt</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{whitelistStats.networkStats.eth}</div>
              <div className="text-sm text-gray-400">ETH Tercih</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{whitelistStats.networkStats.bnb}</div>
              <div className="text-sm text-gray-400">BNB Tercih</div>
            </div>
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
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleGrokCsvUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Grok Task Winners
              </Button>
            </div>
          </div>
        </div>

        {/* Whitelist Registrations Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Whitelist Kayıtları</h3>
            <span className="text-sm text-gray-400">{allRegistrations.length} kayıt</span>
          </div>

          {loadingRegistrations ? (
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
                    <th className="text-left py-2 text-gray-400">Cüzdan Adresi</th>
                    <th className="text-left py-2 text-gray-400">Email</th>
                    <th className="text-left py-2 text-gray-400">Network</th>
                    <th className="text-left py-2 text-gray-400">Bakiye</th>
                    <th className="text-left py-2 text-gray-400">Durum</th>
                    <th className="text-left py-2 text-gray-400">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRegistrations.map((registration, index) => (
                    <tr key={registration.id} className="border-b border-gray-700">
                      <td className="py-2 text-white">{index + 1}</td>
                      <td className="py-2 font-mono text-white">
                        {registration.wallet_address.slice(0, 8)}...{registration.wallet_address.slice(-6)}
                      </td>
                      <td className="py-2 text-white">{registration.email}</td>
                      <td className="py-2 text-white">
                        <span className={`px-2 py-1 rounded text-xs ${
                          registration.network_preference === 'ETH' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {registration.network_preference}
                        </span>
                      </td>
                      <td className="py-2 text-white">{parseFloat(registration.wallet_balance).toFixed(2)}</td>
                      <td className="py-2 text-white">
                        <span className={`px-2 py-1 rounded text-xs ${
                          registration.status === 'active' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                        }`}>
                          {registration.status}
                        </span>
                      </td>
                      <td className="py-2 text-white">
                        {new Date(registration.registration_date).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {sortedRegistrations.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">Kayıt bulunamadı</p>
                </div>
              )}

              {hasMore && sortedRegistrations.length > 0 && (
                <div className="text-center mt-4">
                  <Button
                    onClick={loadMoreRegistrations}
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

      {/* Grok CSV Modal */}
      <Dialog open={showGrokCsvModal} onOpenChange={setShowGrokCsvModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Grok Task Winners CSV Önizleme</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {grokCsvData.length > 0 && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-600">
                    {grokCsvHeaders.map((header, index) => (
                      <th key={index} className="text-left py-2 px-2 border-r border-gray-600 text-gray-300">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grokCsvData
                    .slice((grokCsvCurrentPage - 1) * csvPageSize, grokCsvCurrentPage * csvPageSize)
                    .map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-gray-700">
                      {grokCsvHeaders.map((header, colIndex) => (
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
              Sayfa {grokCsvCurrentPage} / {Math.ceil(grokCsvData.length / csvPageSize)} | {grokCsvData.length} satır
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setGrokCsvCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={grokCsvCurrentPage === 1}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Önceki
              </Button>
              <Button
                onClick={() => setGrokCsvCurrentPage(prev => Math.min(Math.ceil(grokCsvData.length / csvPageSize), prev + 1))}
                disabled={grokCsvCurrentPage >= Math.ceil(grokCsvData.length / csvPageSize)}
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Sonraki
              </Button>
              <Button
                onClick={handleAddGrokWinnersToDatabase}
                disabled={isLoading || grokCsvData.length === 0}
                size="sm"
                className="bg-green-600 text-white hover:bg-green-700"
              >
                {isLoading ? "Ekleniyor..." : "Grok Winners Ekle"}
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