"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { Settings as SettingsIcon, Crown, User as UserIcon, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, login } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <UserIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sign in to view settings</h2>
        <p className="text-gray-600 mb-6">Please sign in to access your profile settings and billing.</p>
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your Premium subscription? You will lose unlimited downloads immediately.")) {
      return;
    }
    
    setIsCancelling(true);
    try {
      const res = await axiosInstance.post("/payment/cancel", {
        userId: user._id,
      });
      if (res.data.cancelled) {
        toast.info("Subscription Cancelled", {
          description: <span style={{ color: "#4b5563" }}>Your Premium subscription has been cancelled.</span>,
          style: {
            backgroundColor: "#fef2f2", // soft red/pink background
            color: "#b91c1c",          // crimson text for title
            border: "1px solid #fecaca",
          },
        });
        // Update user context globally so UI responds to the downgrade
        login(res.data.user);
      }
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-red-600" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar (Optional Navigation) */}
        <div className="col-span-1 space-y-2">
          <Button variant="secondary" className="w-full justify-start font-medium bg-red-50 text-red-700 hover:bg-red-100">
            Billing & Plans
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-black">
            Account Preferences
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-600 hover:text-black">
            Privacy
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          
          {/* Subscription Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
            
            {user.isPremium ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-lg">Premium Member</h3>
                    <p className="text-amber-700 text-sm">You have unlimited video downloads unlocked.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Plan Benefits</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Unlimited daily downloads
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> High-speed servers
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Your plan is active.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="w-12 h-12 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Free Tier</h3>
                    <p className="text-gray-600 text-sm">You are currently on the basic free plan.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Plan Limits</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-gray-400" /> 1 video download per day
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">
                    Want unlimited downloads? Upgrade to Premium today!
                  </p>
                  <Button 
                    onClick={() => router.push("/")}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Browse Videos & Upgrade
                  </Button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
