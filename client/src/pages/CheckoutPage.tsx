import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ packageDetails }: { packageDetails: any }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/plans?payment=success`,
      },
    });

    if (error) {
      setIsProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase! Credits have been added to your account.",
      });
      navigate('/plans?payment=success');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Purchase Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium">Package:</span>
            <span>{packageDetails?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Credits:</span>
            <span>{packageDetails?.credits}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${packageDetails?.price}</span>
          </div>
        </CardContent>
      </Card>

      <PaymentElement />
      
      <Button 
        type="submit" 
        className="w-full bg-orange-600 hover:bg-orange-700" 
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? 'Processing Payment...' : `Purchase ${packageDetails?.credits} Credits`}
      </Button>
    </form>
  );
};

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get package details from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const packageId = urlParams.get('package');
    
    if (!packageId) {
      toast({
        title: "Invalid Request",
        description: "No package selected for checkout",
        variant: "destructive",
      });
      navigate('/plans');
      return;
    }

    // Create PaymentIntent for credit purchase
    const createPaymentIntent = async () => {
      try {
        const response = await apiRequest({
          url: '/api/credits/purchase',
          method: 'POST',
          data: { packageId: parseInt(packageId) }
        });

        setClientSecret(response.clientSecret);
        setPackageDetails(response.packageDetails);
      } catch (error: any) {
        toast({
          title: "Payment Setup Failed",
          description: error.message || "Unable to initialize payment",
          variant: "destructive",
        });
        navigate('/plans');
      }
    };

    createPaymentIntent();
  }, [navigate, toast]);

  if (!clientSecret || !packageDetails) {
    return (
      <div className="container mx-auto py-8 max-w-md">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/plans">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Secure Checkout</h1>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm packageDetails={packageDetails} />
        </Elements>
      </div>
    </div>
  );
}