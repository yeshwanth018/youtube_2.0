import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Crown,
  Video,
} from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const Sidebar = () => {
  const { user, login, handlegooglesignin } = useUser();
  const { isOpen, close } = useSidebar();
  const router = useRouter();

  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const [showSidebarPremiumModal, setShowSidebarPremiumModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrder, setMockOrder] = useState<any>(null);
  const [isProcessingMockPayment, setIsProcessingMockPayment] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) close();
  }, [router.pathname]);

  // Helper: close sidebar on mobile when a nav link is clicked
  const handleNavClick = (path: string) => {
    setActiveLink(path);
    if (isMobile) close();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && router.pathname) {
      setActiveLink(router.pathname);
    }
  }, [router.pathname, mounted]);

  const handleMockPaymentSuccess = async () => {
    if (!user || !mockOrder) return;
    setIsProcessingMockPayment(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const verifyRes = await axiosInstance.post("/payment/verify", {
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
        setShowMockPaymentModal(false);
      } else {
        toast.error("Payment verification failed.");
      }
    } catch (err) {
      console.error("Mock verification error:", err);
      toast.error("Error verifying mock payment.");
    } finally {
      setIsProcessingMockPayment(false);
    }
  };

  const handleUpgradeToPremium = async (tier: string = "bronze") => {
    if (!user) {
      toast.error("Please sign in to buy Premium.");
      return;
    }
    try {
      const res = await axiosInstance.post("/payment/create-order", {
        userId: user._id,
        tier,
      });
      const orderData = res.data;

      if (orderData.isMock) {
        setMockOrder({ ...orderData, tier });
        setShowMockPaymentModal(true);
        setShowSidebarPremiumModal(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummykey123",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your-Tube Subscription",
        description: `Upgrade to ${tier.toUpperCase()} Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
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
               setShowSidebarPremiumModal(false);
             } else {
              toast.error("Payment verification failed.");
            }
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
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
        toast.error("Razorpay checkout is still loading. Please wait a moment and try again.");
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (paymentErr) {
      console.error("Payment initialization failed:", paymentErr);
      toast.error("Could not initiate payment. Please try again.");
    }
  };

  const getButtonClass = (path: string) => {
    const isActive = activeLink === path;
    return isActive
      ? "w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors"
      : "w-full justify-start bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground transition-colors";
  };

  // Build responsive classNames
  const asideClasses = isMobile
    ? `sidebar-mobile bg-card text-card-foreground border-r border-border p-2 transition-colors duration-300 ${isOpen ? "open" : ""}`
    : "w-64 bg-card text-card-foreground border-r border-border min-h-screen p-2 transition-colors duration-300 hidden md:block";

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobile && (
        <div
          className={`sidebar-backdrop ${isOpen ? "open" : ""}`}
          onClick={close}
        />
      )}
      <aside className={asideClasses}>
        <nav className="space-y-1">
        <Link href="/">
          <Button
            variant="ghost"
            className={getButtonClass("/")}
            onClick={() => setActiveLink("/")}
          >
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button
            variant="ghost"
            className={getButtonClass("/explore")}
            onClick={() => setActiveLink("/explore")}
          >
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        {!mounted ? null : !user ? (
          <div className="px-2 py-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handlegooglesignin}
            >
              Sign In
            </Button>
          </div>
        ) : (
          <>
            <div className="my-2 border-t border-border" />
            <Link href="/subscriptions">
              <Button
                variant="ghost"
                className={getButtonClass("/subscriptions")}
                onClick={() => setActiveLink("/subscriptions")}
              >
                <PlaySquare className="w-5 h-5 mr-3" />
                Subscriptions
              </Button>
            </Link>
            <Link href="/history">
              <Button
                variant="ghost"
                className={getButtonClass("/history")}
                onClick={() => setActiveLink("/history")}
              >
                <History className="w-5 h-5 mr-3" />
                History
              </Button>
            </Link>
            <Link href="/liked">
              <Button
                variant="ghost"
                className={getButtonClass("/liked")}
                onClick={() => setActiveLink("/liked")}
              >
                <ThumbsUp className="w-5 h-5 mr-3" />
                Liked videos
              </Button>
            </Link>
            <Link href="/watch-later">
              <Button
                variant="ghost"
                className={getButtonClass("/watch-later")}
                onClick={() => setActiveLink("/watch-later")}
              >
                <Clock className="w-5 h-5 mr-3" />
                Watch later
              </Button>
            </Link>
            <Link href="/downloads">
              <Button
                variant="ghost"
                className={getButtonClass("/downloads")}
                onClick={() => setActiveLink("/downloads")}
              >
                <Download className="w-5 h-5 mr-3" />
                Downloads
              </Button>
            </Link>
            <Link href="/call">
              <Button
                variant="ghost"
                className={getButtonClass("/call")}
                onClick={() => setActiveLink("/call")}
              >
                <Video className="w-5 h-5 mr-3" />
                Video Call
              </Button>
            </Link>
            {user?.channelname ? (
              <Link href={`/channel/${user.id}`}>
                <Button
                  variant="ghost"
                  className={getButtonClass(`/channel/${user.id}`)}
                  onClick={() => setActiveLink(`/channel/${user.id}`)}
                >
                  <User className="w-5 h-5 mr-3" />
                  Your channel
                </Button>
              </Link>
            ) : (
              <div className="px-2 py-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setisdialogeopen(true)}
                >
                  Create Channel
                </Button>
              </div>
            )}
            {/* Premium upgrade or status */}
            {user.isPremium ? (
              <div className="px-2 py-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center text-amber-500 font-semibold text-sm">
                  <Crown className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" />
                  {(user.plan || "premium").charAt(0).toUpperCase() + (user.plan || "premium").slice(1)} Active
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 mt-2"
                onClick={() => setShowSidebarPremiumModal(true)}
              >
                <Crown className="w-5 h-5 mr-3 text-red-500" />
                Get Premium
              </Button>
            )}
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />

      {/* Premium Upgrade Modal from Sidebar — with Bronze/Silver/Gold tiers */}
      <Dialog open={showSidebarPremiumModal} onOpenChange={setShowSidebarPremiumModal}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-0">
          <div className="relative p-6 pt-10 flex flex-col items-center text-center">
            {/* Elegant premium background glow */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-red-600/30 to-transparent pointer-events-none" />
            
            {/* Premium Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 mb-6 z-10 animate-pulse">
              <Crown className="w-8 h-8 text-white fill-white" />
            </div>

            <DialogHeader className="z-10 w-full">
              <DialogTitle className="text-2xl font-black tracking-tight text-white mb-2 text-center bg-gradient-to-r from-white via-red-200 to-amber-200 bg-clip-text text-transparent">
                Choose Your Plan
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm leading-relaxed px-2 text-center">
                Upgrade your experience with more watch time and unlimited downloads.
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
                  onClick={() => handleUpgradeToPremium("bronze")}
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
                  onClick={() => handleUpgradeToPremium("silver")}
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
                  onClick={() => handleUpgradeToPremium("gold")}
                  className="mt-3 w-full bg-gradient-to-r from-amber-50 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold py-2 rounded-lg text-xs"
                  size="sm"
                >
                  Select
                </Button>
              </div>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setShowSidebarPremiumModal(false)}
              className="mt-4 w-full text-slate-400 hover:text-white hover:bg-slate-800 py-6 rounded-xl transition-all z-10"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mock Payment Gateway Modal */}
      <Dialog open={showMockPaymentModal} onOpenChange={setShowMockPaymentModal}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
              <Crown className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
            <DialogHeader className="w-full">
              <DialogTitle className="text-xl font-bold text-center text-white">
                Mock Payment Gateway
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm text-center">
                Since you are running in test mode with dummy keys, we have launched this secure mock simulator.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant</span>
                <span className="font-semibold text-slate-300">Your-Tube Premium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tier</span>
                <span className="font-semibold text-amber-400 capitalize">{mockOrder?.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-amber-400">₹{(mockOrder?.amount || 0) / 100}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID</span>
                <span className="font-mono text-xs text-slate-400">{mockOrder?.id}</span>
              </div>
            </div>

            <div className="mt-6 w-full space-y-3">
              <Button
                onClick={handleMockPaymentSuccess}
                disabled={isProcessingMockPayment}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-xl border-none shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isProcessingMockPayment ? (
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
                disabled={isProcessingMockPayment}
                onClick={() => {
                  setShowMockPaymentModal(false);
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
      </aside>
    </>
  );
};

export default Sidebar;
