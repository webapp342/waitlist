"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { userService } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export default function AdministratorLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }

    // Sadece belirtilen wallet address'e izin ver
    const allowedWalletAddress = "0x7B76EEd8E62Ccc76d449240853E400c42AFC4e19";
    
    if (username !== allowedWalletAddress) {
      toast.error("Geçersiz kullanıcı adı");
      return;
    }

    setIsLoading(true);

    try {
      // Kullanıcının şifre hash'ini al
      const passwordHash = await userService.getUserPasswordHash(username);
      
      if (!passwordHash) {
        toast.error("Kullanıcı bulunamadı veya şifre ayarlanmamış");
        setIsLoading(false);
        return;
      }

      // Şifreyi doğrula
      const isValidPassword = await bcrypt.compare(password, passwordHash);
      
      if (isValidPassword) {
        // Admin session'ı başlat
        localStorage.setItem('admin_session', 'true');
        localStorage.setItem('admin_wallet', username);
        
        toast.success("Başarıyla giriş yapıldı!");
        router.push('/adminDashboard');
      } else {
        toast.error("Geçersiz şifre");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Giriş yapılırken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-black">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Bblip Yönetim Paneli</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-[#111111]/80 backdrop-blur-md rounded-[20px] border border-zinc-800/50 p-8 shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white font-medium">
                Wallet Address
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="0x7B76EEd8E62Ccc76d449240853E400c42AFC4e19"
                className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-yellow-200 focus:ring-yellow-200/20"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-yellow-200 focus:ring-yellow-200/20"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-200 text-black hover:bg-yellow-300 transition-all duration-200 rounded-xl py-3 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Giriş yapılıyor...
                </div>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>

          {/* Bilgi Kutusu */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Admin Erişimi</p>
                <p>Sadece yetkili kullanıcılar bu panele erişebilir. Wallet address ve şifre gereklidir.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Geri Dönüş Linki */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-6"
        >
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-yellow-200 transition-colors text-sm"
          >
            ← Ana Sayfaya Dön
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
} 