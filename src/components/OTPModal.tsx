import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Mail, Phone, Shield, MapPin } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import axios from "axios";

interface OTPModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OTPModal = ({ open, onClose, onSuccess }: OTPModalProps) => {
  const [step, setStep] = useState<"detecting" | "input" | "verify">("detecting");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpType, setOtpType] = useState<"email" | "sms" | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [isSouthIndia, setIsSouthIndia] = useState<boolean>(false);

  // Detect location when modal opens
  useEffect(() => {
    if (open) {
      detectLocation();
    }
  }, [open]);

  const detectLocation = async () => {
    try {
      setStep("detecting");
      const response = await axios.get("https://ip-api.com/json/");
      const { regionName, city, country } = response.data;

      setLocation({ city, state: regionName, country });

      // South Indian states
      const southIndianStates = [
        "Karnataka",
        "Kerala",
        "Tamil Nadu",
        "Andhra Pradesh",
        "Telangana",
        "Puducherry",
        "Pondicherry",
      ];

      const isSouth = southIndianStates.some(
        (s) => regionName && regionName.toLowerCase().includes(s.toLowerCase())
      );

      setIsSouthIndia(isSouth);
      setOtpType(isSouth ? "email" : "sms");
      setStep("input");

      console.log("Location detected:", { city, state: regionName, isSouthIndia: isSouth });
    } catch (error) {
      console.error("Location detection error:", error);
      toast.error("Failed to detect location. Defaulting to email OTP.");
      setIsSouthIndia(true);
      setOtpType("email");
      setStep("input");
    }
  };

  const handleGenerateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axiosInstance.post("/otp/generate", {
        email,
        phoneNumber,
        userName,
      });

      if (res.data.success) {
        setOtpType(res.data.otpType);
        setLocation(res.data.location);
        setStep("verify");
        toast.success(res.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axiosInstance.post("/otp/verify", {
        email,
        otp,
        userName,
        phoneNumber,
      });

      if (res.data.success && res.data.user) {
        // Save user data to localStorage
        localStorage.setItem("userProfile", JSON.stringify(res.data.user));

        toast.success("Login successful! Welcome " + res.data.user.name);

        // Reset form
        setStep("input");
        setEmail("");
        setPhoneNumber("");
        setUserName("");
        setOtp("");

        onClose();
        onSuccess();

        // Reload to update auth context
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.post("/otp/resend", {
        email,
        phoneNumber,
        userName,
      });

      if (res.data.success) {
        toast.success(res.data.message);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === "detecting" ? "Detecting Location..." : step === "input" ? "Login with OTP" : "Verify OTP"}
          </DialogTitle>
        </DialogHeader>

        {step === "detecting" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <MapPin className="w-12 h-12 animate-pulse text-blue-600" />
            <p className="text-sm text-gray-600">Detecting your location...</p>
          </div>
        ) : step === "input" ? (
          <form onSubmit={handleGenerateOTP} className="space-y-4">
            {/* Location Display */}
            {location && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-blue-600" />
                  <strong>Detected Location:</strong>
                </div>
                <p className="text-xs">
                  {location.city}, {location.state}
                </p>
                <p className="text-xs mt-1 text-blue-700 font-semibold">
                  {isSouthIndia
                    ? "✓ South India - OTP will be sent via Email"
                    : "✓ Other Region - OTP will be sent via SMS"}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            {/* Email field - Always show for South India, optional for others */}
            {isSouthIndia ? (
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail size={16} />
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-green-600 mt-1">
                  OTP will be sent to this email
                </p>
              </div>
            ) : (
              <>
                {/* Phone field - Required for non-South India */}
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Phone size={16} />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-green-600 mt-1">
                    OTP will be sent to this phone number via SMS
                  </p>
                </div>
                {/* Email optional for non-South India */}
                <div>
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Mail size={16} />
                    Email (Optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {location && (
              <div className="bg-green-50 p-3 rounded-lg text-sm">
                <p>
                  <strong>Location:</strong> {location.city}, {location.state}
                </p>
                <p className="text-xs mt-1">
                  OTP sent via {otpType === "email" ? "Email" : "SMS"}
                  {otpType === "email" && (
                    <>
                      {" "}
                      to <strong>{email}</strong>
                    </>
                  )}
                  {otpType === "sms" && (
                    <>
                      {" "}
                      to <strong>{phoneNumber}</strong>
                    </>
                  )}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Enter OTP</label>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-sm"
              >
                Resend OTP
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("input")}
              className="w-full"
            >
              Back
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OTPModal;
