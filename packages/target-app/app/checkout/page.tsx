import { Header } from "@/components/Header";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Footer } from "@/components/Footer";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
        <CheckoutForm />
      </main>
      <Footer />
    </div>
  );
}
