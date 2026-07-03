"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { getFileUrl } from "../lib/axiosinstance";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { toast } from "sonner";
import { Crown, Clock, Lock, Play, Pause, Rewind, FastForward, SkipForward, MessageCircle, X } from "lucide-react";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  onPlayNext?: () => void;
}

export default function VideoPlayer({ video, onPlayNext }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, login } = useUser();

  const [cumulativeTime, setCumulativeTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);

  const [showMockPayment, setShowMockPayment] = useState<boolean>(false);
  const [mockOrder, setMockOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Gesture recognition refs
  const clickCountRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickZoneRef = useRef<string>("");

  // Gesture feedback state
  const [gestureFeedback, setGestureFeedback] = useState<{
    type: string;
    text: string;
    position: string;
  } | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userPlan = user?.plan || "free";

  const limits: Record<string, number> = {
    free: 300,       // 5 mins
    bronze: 420,     // 7 mins
    silver: 600,     // 10 mins
    gold: Infinity,  // Unlimited
  };

  const limit = limits[userPlan] || 300;

  const [hasLoadedTime, setHasLoadedTime] = useState<boolean>(false);

  // Load cumulative time from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTime = localStorage.getItem("yourtube_watch_time");
      if (savedTime) {
        setCumulativeTime(parseInt(savedTime, 10));
      }
      setHasLoadedTime(true);
    }
  }, []);

  // Update localStorage when cumulativeTime changes, only after initial load has finished
  useEffect(() => {
    if (hasLoadedTime && typeof window !== "undefined") {
      localStorage.setItem("yourtube_watch_time", cumulativeTime.toString());
    }
  }, [cumulativeTime, hasLoadedTime]);

  // Dynamically load Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Monitor playback and increment cumulative watch time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && cumulativeTime < limit) {
      interval = setInterval(() => {
        setCumulativeTime((prev) => {
          const next = prev + 1;
          if (next >= limit) {
            if (videoRef.current) {
              videoRef.current.pause();
            }
            setIsPlaying(false);
            setShowLimitModal(true);
            return limit;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, limit, cumulativeTime]);

  // Handle plan updates and check limits reactively
  useEffect(() => {
    if (cumulativeTime < limit) {
      setShowLimitModal(false);
    } else {
      setShowLimitModal(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [cumulativeTime, limit]);

  const handlePlay = () => {
    if (cumulativeTime >= limit) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setShowLimitModal(true);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleUpgrade = async (tier: string) => {
    if (!user) {
      toast.error("Please log in to upgrade your plan.");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await axiosInstance.post("/api/payments/create-order", {
        userId: user._id,
        tier,
      });
      const orderData = res.data;

      if (orderData.isMock) {
        setMockOrder({ ...orderData, tier });
        setShowMockPayment(true);
        setIsProcessing(false);
        return;
      }

      // Real Razorpay Checkout
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
              toast.success(`Upgraded to ${tier.toUpperCase()} Plan successfully! ✨`);
              login(verifyRes.data.user);
              setShowLimitModal(false);
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

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment initialization failed:", err);
      toast.error("Could not initiate payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockPaymentSuccess = async () => {
    if (!user || !mockOrder) return;
    setIsProcessing(true);
    try {
      const verifyRes = await axiosInstance.post("/api/payments/verify", {
        razorpay_order_id: mockOrder.id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: "mock_signature",
        userId: user._id,
        tier: mockOrder.tier,
      });
      if (verifyRes.data.verified) {
        toast.success(`Upgraded to ${mockOrder.tier.toUpperCase()} Plan successfully! ✨`, {
          style: {
            backgroundColor: "#f0fdf4",
            color: "#15803d",
            border: "1px solid #bbf7d0",
          },
        });
        login(verifyRes.data.user);
        setShowMockPayment(false);
        setShowLimitModal(false);
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

  // Cleanup gesture timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Execute gesture action based on zone + tap count
  const executeGestureAction = useCallback(
    (zone: string, taps: number) => {
      const vid = videoRef.current;
      if (!vid) return;

      let type: string | null = null;
      let text = "";

      if (zone === "center" && taps === 1) {
        // Single tap center → play / pause
        if (vid.paused) {
          vid.play();
          type = "play";
        } else {
          vid.pause();
          type = "pause";
        }
      } else if (zone === "center" && taps === 2) {
        // Double tap center → toggle fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          vid.requestFullscreen?.();
        }
        type = "fullscreen";
        text = document.fullscreenElement ? "Exit" : "Fullscreen";
      } else if (zone === "center" && taps === 3) {
        // Triple tap center → play next video
        if (onPlayNext) {
          vid.pause();
          type = "nextVideo";
          text = "Next Video";
          // Delay navigation slightly so feedback is visible
          setTimeout(() => onPlayNext(), 500);
        } else {
          type = "nextVideo";
          text = "No next video";
        }
      } else if (zone === "left" && taps === 2) {
        // Double tap left → rewind 10s
        vid.currentTime = Math.max(0, vid.currentTime - 10);
        type = "rewind";
        text = "-10s";
      } else if (zone === "left" && taps === 3) {
        // Triple tap left → scroll to comment section
        const commentSection = document.getElementById("comments-section");
        if (commentSection) {
          commentSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        type = "comments";
        text = "Comments";
      } else if (zone === "right" && taps === 2) {
        // Double tap right → forward 10s
        vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 10);
        type = "forward";
        text = "+10s";
      } else if (zone === "right" && taps === 3) {
        // Triple tap right → close tab
        type = "closeTab";
        text = "Closing...";
        setTimeout(() => {
          window.close();
          // Fallback if window.close() is blocked by the browser
          window.location.href = "/";
        }, 600);
      }

      // Show visual feedback
      if (type) {
        setGestureFeedback({ type, text, position: zone });
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          setGestureFeedback(null);
        }, 700);
      }
    },
    []
  );

  // Gesture overlay click handler with multi-tap debouncer
  const handleGestureClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickXPercentage =
        ((event.clientX - rect.left) / rect.width) * 100;

      // Categorize click zone
      let zone: string;
      if (clickXPercentage <= 30) {
        zone = "left";
      } else if (clickXPercentage >= 70) {
        zone = "right";
      } else {
        zone = "center";
      }

      // Multi-tap debouncer: accumulate taps within 300ms window
      clickCountRef.current += 1;
      clickZoneRef.current = zone;

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        const finalCount = clickCountRef.current;
        const finalZone = clickZoneRef.current;

        // Dispatch gesture action
        executeGestureAction(finalZone, finalCount);

        // Reset tracking state
        clickCountRef.current = 0;
        clickZoneRef.current = "";
        clickTimeoutRef.current = null;
      }, 400);
    },
    []
  );

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden h-48 lg:h-[360px] lg:max-w-3xl">
      {/* Video wrapper with gesture overlay */}
      <div className="relative w-full h-full">
        {/* Professional visual gesture overlay with distinct hover zones */}
        <div
          className="absolute top-0 left-0 w-full z-10 flex select-none"
          style={{ height: "85%" }}
          onClick={handleGestureClick}
        >
          {/* Left Zone - Double-tap to Rewind */}
          <div className="w-[30%] h-full flex items-center justify-center group/left hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-300 relative border-r border-white/[0.01]">
            <div className="opacity-0 group-hover/left:opacity-40 transition-opacity duration-300 pointer-events-none bg-black/50 backdrop-blur-sm rounded-full p-2.5 flex flex-col items-center gap-0.5 shadow-lg border border-white/5">
              <Rewind className="w-4 h-4 text-white" />
              <span className="text-[8px] text-white/90 font-bold uppercase tracking-wider">Rewind</span>
            </div>
          </div>

          {/* Center Zone - Tap to Play/Pause, Double-tap for Fullscreen */}
          <div className="w-[40%] h-full flex items-center justify-center group/center hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-300 relative">
            <div className="opacity-0 group-hover/center:opacity-40 transition-opacity duration-300 pointer-events-none bg-black/50 backdrop-blur-sm rounded-full p-2.5 flex flex-col items-center gap-0.5 shadow-lg border border-white/5">
              <Play className="w-4 h-4 text-white fill-white" />
              <span className="text-[8px] text-white/90 font-bold uppercase tracking-wider">Play/Pause</span>
            </div>
          </div>

          {/* Right Zone - Double-tap to Forward */}
          <div className="w-[30%] h-full flex items-center justify-center group/right hover:bg-white/[0.02] active:bg-white/[0.04] transition-all duration-300 relative border-l border-white/[0.01]">
            <div className="opacity-0 group-hover/right:opacity-40 transition-opacity duration-300 pointer-events-none bg-black/50 backdrop-blur-sm rounded-full p-2.5 flex flex-col items-center gap-0.5 shadow-lg border border-white/5">
              <FastForward className="w-4 h-4 text-white" />
              <span className="text-[8px] text-white/90 font-bold uppercase tracking-wider">Forward</span>
            </div>
          </div>
        </div>

        {/* Gesture visual feedback overlay */}
        {gestureFeedback && (
          <div
            className={`absolute top-0 flex items-center justify-center pointer-events-none z-20 ${
              gestureFeedback.position === "left"
                ? "left-0 w-[30%]"
                : gestureFeedback.position === "right"
                ? "right-0 w-[30%]"
                : "left-[30%] w-[40%]"
            }`}
            style={{ height: "85%" }}
          >
            <div className="bg-black/75 backdrop-blur-md rounded-full p-5 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200 border border-white/10 shadow-2xl">
              {gestureFeedback.type === "play" && (
                <Play className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "pause" && (
                <Pause className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "rewind" && (
                <Rewind className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "forward" && (
                <FastForward className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "nextVideo" && (
                <SkipForward className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "comments" && (
                <MessageCircle className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.type === "closeTab" && (
                <X className="w-8 h-8 text-white" />
              )}
              {gestureFeedback.type === "fullscreen" && (
                <Play className="w-8 h-8 text-white fill-white" />
              )}
              {gestureFeedback.text && (
                <span className="text-white text-xs font-bold tracking-wider">
                  {gestureFeedback.text}
                </span>
              )}
            </div>
          </div>
        )}
        <video
          key={video?.filepath}
          ref={videoRef}
          className="w-full h-full object-cover"
          controls
          playsInline
          controlsList="nodownload noremoteplayback"
          poster={video?.thumbnail || `/placeholder.svg?height=480&width=854`}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
        >
          <source
            src={getFileUrl(video?.filepath)}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Un-dismissible Limit Modal Overlay */}
      {showLimitModal && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40 text-center text-white overflow-y-auto">
          {showMockPayment ? (
            /* Mock Payment Simulator Box */
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-250">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-500">
                <Crown className="w-6 h-6 fill-amber-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">Mock Payment Gateway</h3>
              <p className="text-xs text-slate-400 mb-4">
                Simulating secure payment verification.
              </p>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 w-full text-left space-y-2 text-xs mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tier Selected</span>
                  <span className="font-semibold text-slate-300 capitalize">{mockOrder?.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-amber-400">₹{(mockOrder?.amount || 0) / 100}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order ID</span>
                  <span className="font-mono text-slate-400 truncate max-w-[180px]">{mockOrder?.id}</span>
                </div>
              </div>
              <button
                onClick={handleMockPaymentSuccess}
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all text-sm mb-2 disabled:opacity-50"
              >
                {isProcessing ? "Processing..." : "Simulate Payment Success"}
              </button>
              <button
                onClick={() => setShowMockPayment(false)}
                disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 px-4 rounded-xl text-sm font-semibold transition-all"
              >
                Cancel Simulation
              </button>
            </div>
          ) : (
            /* Pricing Grid Screen */
            <div className="max-w-2xl w-full flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3 text-red-500">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg md:text-2xl font-black bg-gradient-to-r from-white via-red-200 to-amber-200 bg-clip-text text-transparent mb-1">
                Time Limit Reached for Your Plan
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mb-6">
                You have watched {Math.floor(cumulativeTime / 60)}m {cumulativeTime % 60}s. Upgrade to a tier to continue watching!
              </p>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3 w-full mb-6 max-w-lg">
                {/* Bronze */}
                <div className="bg-slate-900/60 border border-amber-800/40 rounded-xl p-3 flex flex-col justify-between items-center transition-all hover:border-amber-700/60 hover:bg-slate-900">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Bronze</span>
                    <div className="text-xl md:text-2xl font-black mt-2 text-white">₹10</div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> 7 Mins Limit
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade("bronze")}
                    disabled={isProcessing}
                    className="mt-4 w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all disabled:opacity-50"
                  >
                    Upgrade
                  </button>
                </div>

                {/* Silver */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3 flex flex-col justify-between items-center relative overflow-hidden transition-all hover:border-slate-600/60 hover:bg-slate-900">
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded-bl">BEST</div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Silver</span>
                    <div className="text-xl md:text-2xl font-black mt-2 text-white">₹50</div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> 10 Mins Limit
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade("silver")}
                    disabled={isProcessing}
                    className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all disabled:opacity-50"
                  >
                    Upgrade
                  </button>
                </div>

                {/* Gold */}
                <div className="bg-slate-900/60 border border-amber-500/40 rounded-xl p-3 flex flex-col justify-between items-center transition-all hover:border-amber-400/60 hover:bg-slate-900">
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Gold</span>
                    <div className="text-xl md:text-2xl font-black mt-2 text-white">₹100</div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400 fill-amber-400/20" /> Unlimited
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpgrade("gold")}
                    disabled={isProcessing}
                    className="mt-4 w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold py-1.5 px-3 rounded-lg text-[10px] transition-all disabled:opacity-50"
                  >
                    Upgrade
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-500">
                Logged in as <span className="text-slate-400 font-semibold">{user?.email || "Guest"}</span>. Plan: <span className="text-red-400 font-semibold capitalize">{userPlan}</span>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
