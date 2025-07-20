"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Twitter, CheckCircle, XCircle, Activity, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifiedUsernamePage() {
  const { address, isConnected } = useAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const [xUsername, setXUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");
  const [xUser, setXUser] = useState<any>(null);

  // Check existing X connection
  const checkXStatus = async () => {
    if (!isConnected || !address) return;

    try {
      const response = await fetch("/api/x/verified-username/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await response.json();

      if (response.ok && data.connected) {
        setConnectionStatus("connected");
        setXUser(data.xUser);
        setXUsername(data.xUser.xUsername);
      } else {
        setConnectionStatus("disconnected");
      }
    } catch (error) {
      console.error("Error checking X status:", error);
      setConnectionStatus("disconnected");
    }
  };

  useEffect(() => {
    checkXStatus();
  }, [isConnected, address]);

  const verifyUsername = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!xUsername.trim()) {
      toast.error("Please enter your X username");
      return;
    }

    try {
      setIsConnecting(true);

      const response = await fetch("/api/x/verified-username/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          xUsername: xUsername.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowVerification(true);
        toast.success("Verification code sent! Please check your X account.");
      } else {
        toast.error(data.error || "Failed to send verification");
      }
    } catch (error) {
      console.error("Error verifying username:", error);
      toast.error("Failed to verify username");
    } finally {
      setIsConnecting(false);
    }
  };

  const confirmVerification = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    try {
      setIsConnecting(true);

      const response = await fetch("/api/x/verified-username/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: address,
          xUsername: xUsername.trim(),
          verificationCode: verificationCode.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConnectionStatus("connected");
        toast.success("X account verified and connected successfully! 🎉");
        setShowVerification(false);
        setVerificationCode("");
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Error confirming verification:", error);
      toast.error("Verification failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Verify X Account
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Prove you own your X account to connect it securely
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-green-400" />
                X Account Verification
              </CardTitle>
              <CardDescription>
                Verify ownership of your X account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connectionStatus === "connected" ? (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                    <p className="text-green-400 text-sm">
                      ✅ Verified: @{xUsername}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Your X account is verified and connected
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isConnected ? (
                    <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ Please connect your wallet first
                      </p>
                    </div>
                  ) : showVerification ? (
                    <div className="space-y-4">
                      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-400 text-sm">
                          📱 Check your X account @{xUsername}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          We sent a verification code to your X account
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="verificationCode">Verification Code</Label>
                        <Input
                          id="verificationCode"
                          type="text"
                          placeholder="Enter the code from X"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <Button 
                        onClick={confirmVerification}
                        disabled={isConnecting || !verificationCode.trim()}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {isConnecting ? "Verifying..." : "Confirm Verification"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setShowVerification(false)}
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Back
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                          <div>
                            <p className="text-orange-400 text-sm font-semibold">
                              Verification Required
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              You must prove you own this X account
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="xUsername">Your X Username</Label>
                        <Input
                          id="xUsername"
                          type="text"
                          placeholder="Enter your X username (without @)"
                          value={xUsername}
                          onChange={(e) => setXUsername(e.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <Button 
                        onClick={verifyUsername}
                        disabled={isConnecting || !xUsername.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Twitter className="w-4 h-4 mr-2" />
                        {isConnecting ? "Sending Verification..." : "Send Verification Code"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 