import { ProductCard, type Product } from "./ProductCard";

const products: Product[] = [
  { id: "1", name: "Terracotta Vase", price: 48, blurb: "Hand-thrown, glazed in warm clay tones." },
  { id: "2", name: "Linen Throw", price: 72, blurb: "Stonewashed, breathable, drapes softly." },
  { id: "3", name: "Brass Candle Holder", price: 34, blurb: "Solid brass with a brushed finish." },
  { id: "4", name: "Olive Wood Board", price: 56, blurb: "Each piece has a unique grain pattern." },
  { id: "5", name: "Ceramic Planter", price: 28, blurb: "Matte white, drainage hole included." },
  { id: "6", name: "Wool Cushion", price: 64, blurb: "Plush and structured, perfect for sofas." },
];

export function ProductGrid() {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Featured</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
