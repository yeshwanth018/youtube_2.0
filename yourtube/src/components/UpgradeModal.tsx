"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Download, Crown } from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { user, login } = useUser();
  const [showMockPayment, setShowMockPayment] = useState(false);
  const [mockOrder, setMockOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async (tier: string = "bronze") => {
    if (!user) return;
    try {
      const res = await axiosInstance.post("/api/payments/create-order", {
        userId: user._id,
        tier,
      });
      const orderData = res.data;

      if (orderData.isMock) {
        setMockOrder({ ...orderData, tier });
        setShowMockPayment(true);
        onOpenChange(false);
        return;
      }

      // Real Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummykey123",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your-Tube Subscription",
        description: `Upgrade to ${tier.toUpperCase()} Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/api/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              tier,
            });
            if (verifyRes.data.verified) {
              toast.success(`Upgraded to ${tier.toUpperCase()} Plan! ✨`, {
                description: <span style={{ color: "#4b5563" }}>Payment successful! Your plan is now active.</span>,
                style: {
                  backgroundColor: "#f0fdf4",
                  color: "#15803d",
                  border: "1px solid #bbf7d0",
                },
              });
              login(verifyRes.data.user);
              onOpenChange(false);
            } else {
              toast.error("Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error("Error verifying payment.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#EF4444",
        },
      };

      if (!(window as any).Razorpay) {
        toast.error("Razorpay checkout is loading. Please try again.");
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initialization failed:", err);
      toast.error("Could not initiate payment. Please try again.");
    }
  };

  const handleMockPaymentSuccess = async () => {
    if (!user || !mockOrder) return;
    setIsProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const verifyRes = await axiosInstance.post("/api/payments/verify", {
        razorpay_order_id: mockOrder.id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: "mock_signature",
        userId: user._id,
        tier: mockOrder.tier,
      });
      if (verifyRes.data.verified) {
        toast.success(`Upgraded to ${(mockOrder.tier || "premium").toUpperCase()} Plan! ✨`, {
          description: <span style={{ color: "#4b5563" }}>Payment successful! Your plan is now active.</span>,
          style: {
            backgroundColor: "#f0fdf4",
            color: "#15803d",
            border: "1px solid #bbf7d0",
          },
        });
        login(verifyRes.data.user);
        setShowMockPayment(false);
      } else {
        toast.error("Payment verification failed.");
      }
    } catch (err) {
      console.error("Mock verification error:", err);
      toast.error("Error verifying payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Tier Selection Modal */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-0">
          <div className="relative p-6 pt-10 flex flex-col items-center text-center">
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-red-600/30 to-transparent pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 mb-6 z-10 animate-pulse">
              <Download className="w-8 h-8 text-white" />
            </div>

            <DialogHeader className="z-10 w-full">
              <DialogTitle className="text-2xl font-black tracking-tight text-white mb-2 text-center bg-gradient-to-r from-white via-red-200 to-amber-200 bg-clip-text text-transparent">
                Upgrade Your Plan
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm leading-relaxed px-2 text-center">
                Free users can only download 1 video per day. Upgrade to unlock more downloads and watch time!
              </DialogDescription>
            </DialogHeader>

            {/* Tier Selection Grid */}
            <div className="mt-6 w-full z-10 grid grid-cols-3 gap-3">
              {/* Bronze */}
              <div className="bg-slate-800/60 border border-amber-800/40 rounded-xl p-4 flex flex-col items-center transition-all hover:border-amber-700/60 hover:bg-slate-800">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Bronze</span>
                <div className="text-2xl font-black mt-2 text-white">₹10</div>
                <div className="text-[10px] text-slate-400 mt-1">7 min watch</div>
                <Button
                  onClick={() => handleUpgrade("bronze")}
                  className="mt-3 w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-xs"
                  size="sm"
                >
                  Select
                </Button>
              </div>

              {/* Silver */}
              <div className="bg-slate-800/60 border border-slate-600/40 rounded-xl p-4 flex flex-col items-center relative overflow-hidden transition-all hover:border-slate-500/60 hover:bg-slate-800">
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-bl">BEST</div>
                <span className="text-[10px] font-bold text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Silver</span>
                <div className="text-2xl font-black mt-2 text-white">₹50</div>
                <div className="text-[10px] text-slate-400 mt-1">10 min watch</div>
                <Button
                  onClick={() => handleUpgrade("silver")}
                  className="mt-3 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs"
                  size="sm"
                >
                  Select
                </Button>
              </div>

              {/* Gold */}
              <div className="bg-slate-800/60 border border-amber-500/40 rounded-xl p-4 flex flex-col items-center transition-all hover:border-amber-400/60 hover:bg-slate-800">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Gold</span>
                <div className="text-2xl font-black mt-2 text-white">₹100</div>
                <div className="text-[10px] text-slate-400 mt-1">Unlimited</div>
                <Button
                  onClick={() => handleUpgrade("gold")}
                  className="mt-3 w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold py-2 rounded-lg text-xs"
                  size="sm"
                >
                  Select
                </Button>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="mt-4 w-full text-slate-400 hover:text-white hover:bg-slate-800 py-6 rounded-xl transition-all z-10"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mock Payment Gateway Modal */}
      <Dialog open={showMockPayment} onOpenChange={setShowMockPayment}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
              <Crown className="w-6 h-6 fill-amber-500" />
            </div>
            <DialogHeader className="w-full">
              <DialogTitle className="text-xl font-bold text-center text-white">
                Mock Payment Gateway
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm text-center">
                Since you are running in test mode with dummy keys, we have
                launched this secure mock simulator.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant</span>
                <span className="font-semibold text-slate-300">
                  Your-Tube Premium
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tier</span>
                <span className="font-semibold text-amber-400 capitalize">
                  {mockOrder?.tier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-amber-400">₹{(mockOrder?.amount || 0) / 100}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-xs text-slate-400">
                  {mockOrder?.id}
                </span>
              </div>
            </div>

            <div className="mt-6 w-full space-y-3">
              <Button
                onClick={handleMockPaymentSuccess}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-xl border-none shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing Securely...
                  </>
                ) : (
                  "Simulate Successful Payment"
                )}
              </Button>
              <Button
                variant="ghost"
                disabled={isProcessing}
                onClick={() => {
                  setShowMockPayment(false);
                  toast.error("Payment cancelled by user.");
                }}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800 py-6 rounded-xl"
              >
                Cancel Simulation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

