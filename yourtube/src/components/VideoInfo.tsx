import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Crown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance, { getFileUrl } from "@/lib/axiosinstance";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";


const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, login } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showMockPaymentModal, setShowMockPaymentModal] = useState(false);
  const [mockOrder, setMockOrder] = useState<any>(null);
  const [isProcessingMockPayment, setIsProcessingMockPayment] = useState(false);

  const handleDownload = async () => {
    console.log("[Download] Button clicked. User:", user, "Video:", video);
    if (!user) {
      alert("Please sign in to download videos.");
      toast.error("Please sign in to download videos.");
      return;
    }
    setIsDownloading(true);
    try {
      console.log(`[Download] Sending authorization request for video: ${video._id}`);
      const res = await axiosInstance.get(`/api/videos/${video._id}/download?userId=${user?._id}`);
      console.log("[Download] Authorization response:", res.data);

      if (res.data.download) {
        toast.info("Starting download in browser...", { id: "download-progress" });
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const downloadUrl = `${backendUrl}/api/videos/${video._id}/download-file?userId=${user?._id}`;
        console.log("[Download] Triggering file stream from:", downloadUrl);
        
        // Fetch the file as blob with progress monitoring
        const fileRes = await axiosInstance.get(downloadUrl, {
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              toast.info(`Downloading "${video.videotitle || 'video'}": ${percentCompleted}%`, { id: "download-progress" });
            } else {
              toast.info(`Downloaded ${(progressEvent.loaded / (1024 * 1024)).toFixed(1)} MB`, { id: "download-progress" });
            }
          }
        });

        // Trigger save dialog
        const blobUrl = window.URL.createObjectURL(new Blob([fileRes.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", video.filename || "video.mp4");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast.success("Download completed!", { id: "download-progress" });
      }
    } catch (error: any) {
      console.error("[Download] Request failed:", error);
      const errMsg = error.response?.data?.message || "Failed to download video.";
      
      if (error.response?.status === 403 && error.response?.data?.limitReached) {
        alert("Daily download limit reached! Upgrade to Premium for unlimited downloads.");
        toast.warning("Daily download limit reached!", {
          description: <span style={{ color: "#4b5563" }}>Upgrade to Premium for unlimited downloads.</span>,
          style: {
            backgroundColor: "#fffbeb",
            color: "#b45309",
            border: "1px solid #fde68a",
          },
          action: {
            label: "Upgrade",
            onClick: () => setShowPremiumModal(true),
          },
        });
      } else {
        alert(`Download Error: ${errMsg}`);
        toast.error(errMsg);
      }
    } finally {
      setIsDownloading(false);
    }
  };

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
      });
      if (verifyRes.data.verified) {
        toast.success("Welcome to Premium! ✨", {
          description: <span style={{ color: "#4b5563" }}>Payment successful! You are now a Premium member.</span>,
          style: {
            backgroundColor: "#f0fdf4", // soft green background
            color: "#15803d",          // dark emerald for title
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

  const handleUpgradeToPremium = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post("/payment/create-order", {
        userId: user._id,
      });
      const orderData = res.data;

      if (orderData.isMock) {
        setMockOrder(orderData);
        setShowMockPaymentModal(true);
        setShowPremiumModal(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_dummykey123",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Your-Tube Premium",
        description: "Upgrade to premium for unlimited downloads",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
            });
             if (verifyRes.data.verified) {
               toast.success("Welcome to Premium! ✨", {
                 description: <span style={{ color: "#4b5563" }}>Payment successful! You are now a Premium member.</span>,
                 style: {
                   backgroundColor: "#f0fdf4", // soft green background
                   color: "#15803d",          // dark emerald for title
                   border: "1px solid #bbf7d0",
                 },
               });
               login(verifyRes.data.user);
               setShowPremiumModal(false);
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
  const channelParts = (video.videochanel || "").split(" ");
  const channelLine1 = channelParts[0] || "";
  const channelLine2 = channelParts.slice(1).join(" ") || "";

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium leading-5">
              <span className="block">{channelLine1}</span>
              {channelLine2 && <span className="block">{channelLine2}</span>}
            </h3>
            <div className="text-sm text-muted-foreground">
              <div className="leading-4">{(video.subscribers && video.subscribers.toLocaleString()) || "1.2M"}</div>
              <div className="text-xs text-muted-foreground/80">subscribers</div>
            </div>
          </div>
          <Button className="ml-4 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-full font-semibold transition-colors">Subscribe</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center bg-secondary text-secondary-foreground rounded-full overflow-hidden transition-colors">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full hover:bg-secondary-foreground/10"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-foreground text-foreground" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full hover:bg-secondary-foreground/10"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-foreground text-foreground" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-3 py-2 transition-colors ${
              isWatchLater ? "text-red-500 font-semibold" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className={`w-5 h-5 mr-2 ${isDownloading ? "animate-bounce" : ""}`} />
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-secondary/40 text-secondary-foreground border border-border/30 rounded-lg p-4 transition-colors">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"} text-muted-foreground`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium text-foreground hover:bg-transparent hover:underline"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>

      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-0">
          <div className="relative p-6 pt-10 flex flex-col items-center text-center">
            {/* Elegant premium background glow */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-red-600/30 to-transparent pointer-events-none" />
            
            {/* Premium Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 mb-6 z-10 animate-pulse">
              <Download className="w-8 h-8 text-white" />
            </div>

            <DialogHeader className="z-10 w-full">
              <DialogTitle className="text-2xl font-black tracking-tight text-white mb-2 text-center bg-gradient-to-r from-white via-red-200 to-amber-200 bg-clip-text text-transparent">
                Go Premium
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm leading-relaxed px-2 text-center">
                Free users can only download 1 video per day. Upgrade to the Premium Plan for just <span className="text-amber-400 font-semibold">₹499</span> to unlock unlimited high-speed downloads!
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 w-full z-10 space-y-3">
              <Button 
                onClick={handleUpgradeToPremium}
                className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold py-6 rounded-xl border-none shadow-lg shadow-red-600/30 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Upgrade Now — ₹499
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowPremiumModal(false)}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800 py-6 rounded-xl transition-all"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mock Payment Gateway Modal */}
      <Dialog open={showMockPaymentModal} onOpenChange={setShowMockPaymentModal}>
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
                Since you are running in test mode with dummy keys, we have launched this secure mock simulator.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 w-full bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Merchant</span>
                <span className="font-semibold text-slate-300">Your-Tube Premium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-amber-400">₹499.00</span>
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
    </div>
  );
};

export default VideoInfo;
