import { Header } from "@/components/Header";
import { Nav } from "@/components/Nav";
import { ProductGrid } from "@/components/ProductGrid";
import { CartSummary } from "@/components/CartSummary";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Nav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <ProductGrid />
        <CartSummary />
      </main>
      <Footer />
    </div>
  );
}
