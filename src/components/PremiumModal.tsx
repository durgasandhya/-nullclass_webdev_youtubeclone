import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, Check } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PremiumModal = ({ open, onClose, onSuccess }: PremiumModalProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (amount: number, planName: string) => {
    if (!user) {
      toast.error("Please sign in to purchase Premium");
      return;
    }

    setLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error("Razorpay SDK failed to load. Please check your connection.");
        setLoading(false);
        return;
      }

      // Create order
      const orderRes = await axiosInstance.post("/payment/create-order", {
        amount: amount,
        userId: user._id,
      });

      const { order, key_id } = orderRes.data;

      // Razorpay options
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "YouTube Clone Premium",
        description: `${planName} - Unlimited Downloads`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyRes = await axiosInstance.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              amount: amount,
            });

            if (verifyRes.data.success) {
              toast.success("Premium activated! You now have unlimited downloads!");
              onSuccess();
              onClose();
            } else {
              toast.error("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#FF0000",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="text-yellow-500" size={28} />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Premium Plan</h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-600">₹99</div>
                <div className="text-sm text-gray-600">Lifetime</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="text-green-600 mt-1" size={20} />
                <span className="text-sm">Unlimited video downloads</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-600 mt-1" size={20} />
                <span className="text-sm">No daily limits</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-600 mt-1" size={20} />
                <span className="text-sm">High-quality downloads</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-600 mt-1" size={20} />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="text-green-600 mt-1" size={20} />
                <span className="text-sm">Ad-free experience</span>
              </div>
            </div>

            <Button
              onClick={() => handlePayment(99, "Premium Plan")}
              disabled={loading}
              className="w-full mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-6 text-lg"
            >
              {loading ? "Processing..." : "Get Premium Now - ₹99"}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Secure payment powered by Razorpay</p>
            <p className="mt-1">Test Mode: Use test cards for payment</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumModal;
