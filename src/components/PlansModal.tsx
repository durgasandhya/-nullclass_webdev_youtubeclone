import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, Check, Zap, Star, Trophy } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlansModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (planType: string) => void;
}

const plans = [
  {
    name: "Bronze",
    type: "bronze",
    price: 10,
    icon: Zap,
    color: "from-orange-400 to-yellow-600",
    borderColor: "border-orange-400",
    watchTime: "7 minutes",
    features: [
      "Watch videos for 7 minutes",
      "Basic video quality",
      "Standard support",
      "Ad-supported",
    ],
  },
  {
    name: "Silver",
    type: "silver",
    price: 50,
    icon: Star,
    color: "from-gray-300 to-gray-500",
    borderColor: "border-gray-400",
    watchTime: "10 minutes",
    popular: true,
    features: [
      "Watch videos for 10 minutes",
      "HD video quality",
      "Priority support",
      "Fewer ads",
    ],
  },
  {
    name: "Gold",
    type: "gold",
    price: 100,
    icon: Trophy,
    color: "from-yellow-400 to-yellow-600",
    borderColor: "border-yellow-500",
    watchTime: "Unlimited",
    features: [
      "Unlimited watch time",
      "4K video quality",
      "Premium support",
      "Ad-free experience",
      "Unlimited downloads",
    ],
  },
];

const PlansModal = ({ open, onClose, onSuccess }: PlansModalProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useUser();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (plan: typeof plans[0]) => {
    if (!user) {
      toast.error("Please sign in to purchase a plan");
      return;
    }

    setLoading(plan.type);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Razorpay SDK failed to load");
        setLoading(null);
        return;
      }

      const orderRes = await axiosInstance.post("/payment/create-order", {
        amount: plan.price,
        userId: user._id,
      });

      const { order, key_id } = orderRes.data;

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "YouTube Clone",
        description: `${plan.name} Plan - ${plan.watchTime}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              amount: plan.price,
              planType: plan.type,
            });

            if (verifyRes.data.success) {
              toast.success(`${plan.name} Plan activated! Check your email for invoice.`);
              onSuccess(plan.type);
              onClose();
            }
          } catch (error) {
            toast.error("Payment verification failed");
          } finally {
            setLoading(null);
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
            setLoading(null);
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment");
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center mb-4">
            Choose Your Plan
          </DialogTitle>
          <p className="text-sm text-gray-600 text-center">
            Select a plan to extend your watch time
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.type}
                className={`relative bg-gradient-to-br ${plan.color} p-6 rounded-lg border-2 ${plan.borderColor} ${
                  plan.popular ? "ring-4 ring-blue-500 scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold">
                    POPULAR
                  </div>
                )}

                <div className="text-center mb-4">
                  <Icon className="w-12 h-12 mx-auto mb-2 text-white" />
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-white">₹{plan.price}</span>
                  </div>
                  <p className="text-sm text-white opacity-90 mt-1">{plan.watchTime}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="text-white mt-1 flex-shrink-0" size={16} />
                      <span className="text-sm text-white">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handlePayment(plan)}
                  disabled={loading === plan.type}
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-6"
                >
                  {loading === plan.type ? "Processing..." : `Get ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p>Secure payment powered by Razorpay</p>
          <p className="mt-1">Invoice will be sent to your email</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlansModal;
