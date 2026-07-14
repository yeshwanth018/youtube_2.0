"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { User, Phone, KeyRound, Mail } from "lucide-react";

export default function AuthDialog() {
  const { isAuthModalOpen, setIsAuthModalOpen, login } = useUser();
  const [step, setStep] = useState<"email" | "phone" | "otp">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Meta info from initiate-login
  const [channel, setChannel] = useState("");
  const [destination, setDestination] = useState("");
  const [region, setRegion] = useState("");
  const [isSouthIndia, setIsSouthIndia] = useState(false);

  const resetState = () => {
    setStep("email");
    setEmail("");
    setPhone("");
    setOtp("");
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsAuthModalOpen(open);
    if (!open) {
      resetState();
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const username = email.split("@")[0];
      const displayName = username.charAt(0).toUpperCase() + username.slice(1) + " User";
      const payload = {
        email: email.trim(),
        name: displayName,
        image: "https://github.com/shadcn.png",
      };

      const res = await axiosInstance.post("/user/initiate-login", payload);
      
      if (res.data.requirePhone) {
        setRegion(res.data.region || "");
        setIsSouthIndia(res.data.isSouthIndia || false);
        setStep("phone");
      } else {
        setChannel(res.data.channel || "email");
        setDestination(res.data.destination || email);
        setRegion(res.data.region || "");
        setIsSouthIndia(res.data.isSouthIndia || false);
        setStep("otp");
        toast.success(`OTP sent to your ${res.data.channel}!`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const username = email.split("@")[0];
      const displayName = username.charAt(0).toUpperCase() + username.slice(1) + " User";
      const payload = {
        email: email.trim(),
        name: displayName,
        image: "https://github.com/shadcn.png",
        phone: phone.trim(),
      };

      const res = await axiosInstance.post("/user/initiate-login", payload);
      setChannel(res.data.channel || "sms");
      setDestination(res.data.destination || phone);
      setRegion(res.data.region || "");
      setIsSouthIndia(res.data.isSouthIndia || false);
      setStep("otp");
      toast.success(`OTP sent to your ${res.data.channel}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send OTP to mobile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        email: email.trim(),
        otp: otp.trim(),
      });

      if (res.data.result) {
        login(res.data.result, res.data.isSouthIndia);
        toast.success("Welcome back! Sign in successful! ✨");
        setIsAuthModalOpen(false);
        resetState();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Invalid OTP. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-slate-950 text-white border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3 text-red-500">
            {step === "email" && <Mail className="w-6 h-6" />}
            {step === "phone" && <Phone className="w-6 h-6" />}
            {step === "otp" && <KeyRound className="w-6 h-6" />}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            {step === "email" && "Sign In / Register"}
            {step === "phone" && "Mobile Verification"}
            {step === "otp" && "Enter OTP Verification Code"}
          </DialogTitle>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleSendEmailOtp} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-400 text-xs font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 rounded-xl py-6 pl-10 focus:border-red-500 focus:ring-red-500"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-red-600/15"
            >
              {loading ? "Sending Code..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "phone" && (
          <form onSubmit={handleSendPhoneOtp} className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed mb-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                A mobile number is required to receive OTP authentication for your region (Region: <span className="font-semibold text-white">{region || "Unknown"}</span>).
              </p>
              <Label htmlFor="phone" className="text-slate-400 text-xs font-semibold">
                Mobile Number
              </Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 rounded-xl py-6 pl-10 focus:border-red-500 focus:ring-red-500"
                  required
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("email")}
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-900 py-6 rounded-xl"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !phone}
                className="flex-[2] bg-red-600 hover:bg-red-500 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-red-600/15"
              >
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                Enter the 6-digit OTP code sent via <span className="font-bold text-red-400 uppercase">{channel}</span> to <span className="font-semibold text-white">{destination}</span> (Region: <span className="text-slate-300 font-semibold">{region || "Unknown"}</span>).
              </p>
              <Label htmlFor="otp" className="text-slate-400 text-xs font-semibold">
                Verification Code
              </Label>
              <div className="relative">
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 rounded-xl py-6 pl-10 focus:border-red-500 focus:ring-red-500 text-center tracking-[0.2em] font-mono text-lg font-bold"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("email")}
                className="flex-1 text-slate-400 hover:text-white hover:bg-slate-900 py-6 rounded-xl"
              >
                Restart
              </Button>
              <Button
                type="submit"
                disabled={loading || otp.length < 6}
                className="flex-[2] bg-red-600 hover:bg-red-500 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-red-600/15"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
