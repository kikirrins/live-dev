export interface Product {
  id: string;
  name: string;
  price: number;
  blurb: string;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-5 flex flex-col gap-3">
      <div className="h-32 rounded-md bg-neutral-100" aria-hidden />
      <h3 className="text-base font-semibold">{product.name}</h3>
      <p className="text-sm text-neutral-600 flex-1">{product.blurb}</p>
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
        <button
          type="button"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
