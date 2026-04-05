'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReviewList from '@/components/reviews/ReviewList';
import { useCartStore } from '@/lib/cart-store';
import {
  ShoppingCart,
  Star,
  Share2,
  ChevronLeft,
  ChevronRight,
  Package,
  CheckCircle,
  Check,
  Shield,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Zap,
  Tag,
  BadgeCheck,
  Minus,
  Plus,
  Copy,
  Search,
  X,
  Truck,
  Heart,
  MapPin,
  ShoppingBag,
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

const RELATED_PAGE_SIZE = 8;

const PAGE_CSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }

  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
    background-size: 1200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .toast-enter { animation: toastIn 0.28s cubic-bezier(0.22,1,0.36,1) forwards; }

  .thumb-btn { transition: transform 0.15s ease, opacity 0.15s ease; }
  .thumb-btn:hover { transform: scale(1.05); }
  .thumb-btn:active { transform: scale(0.96); }

  .cta-main {
    transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  }
  .cta-main:hover { box-shadow: 0 16px 40px rgba(99,102,241,0.35); transform: translateY(-1px); }
  .cta-main:active { transform: scale(0.98); }

  .related-card {
    transition: transform 0.3s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.3s ease;
  }
  .related-card:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(0,0,0,0.1); }
  .related-card:active { transform: scale(0.97); }
  .related-card:hover .rc-img { transform: scale(1.06); }
  .rc-img { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }

  .product-img-main { transition: transform 0.5s cubic-bezier(0.22,1,0.36,1); }
  .img-wrap:hover .product-img-main { transform: scale(1.04); }

  .qty-btn {
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }
  .qty-btn:hover { background: #6366f1; color: white; }
  .qty-btn:active { transform: scale(0.93); }

  .section-accent::after {
    content: '';
    display: block;
    height: 3px;
    width: 36px;
    background: #6366f1;
    border-radius: 2px;
    margin-top: 4px;
  }

  @keyframes spinIt {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .spin { animation: spinIt 0.8s linear infinite; }

  .search-bar {
    transition: box-shadow 0.2s ease;
  }
  .search-bar:focus-within {
    box-shadow: 0 0 0 3px rgba(99,102,241,0.2);
  }

  .batamart-header {
    background: linear-gradient(135deg, #4c1d95 0%, #6366f1 60%, #4c1d95 100%);
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  @keyframes pulseDot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .pulse-dot { animation: pulseDot 1.5s ease-in-out infinite; }
`;

function parseTags(description: string): string[] {
  if (!description) return [];
  if (description.includes(' | ')) return description.split(' | ').map(t => t.trim()).filter(Boolean);
  return [];
}

// ─────────────────────────────────────────────
// Mini Related Product Card (vertical scroll grid)
// ─────────────────────────────────────────────
function RelatedCard({ product, currentProductName }: { product: any; currentProductName: string }) {
  const fmt = (p: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(p);

  // Highlight shared words between names
  const sharedWords = currentProductName
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && product.name.toLowerCase().includes(w));

  return (
    <Link href={`/product/${product.id}`} className="related-card block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={product.images?.[0] || '/placeholder.png'}
          alt={product.name}
          className="rc-img w-full h-full object-cover"
        />
        {product.quantity === 0 && (
          <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
            <span className="text-xs font-black text-red-500 bg-red-50 px-2.5 py-1 rounded-lg ring-1 ring-red-200">
              Out of stock
            </span>
          </div>
        )}
        {product.quantity > 0 && product.quantity <= 5 && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
              {product.quantity} left
            </span>
          </div>
        )}
        {product.isNew && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-[9px] font-black rounded-md">
              <Sparkles className="w-2 h-2" /> NEW
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-[10px] font-bold text-BATAMART-primary uppercase tracking-wider mb-0.5">{product.category}</p>
        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5 group-hover:text-BATAMART-primary transition-colors">
          {product.name}
        </p>

        {/* Shared-trait chips */}
        {sharedWords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {sharedWords.slice(0, 2).map(w => (
              <span key={w} className="text-[9px] font-bold px-1.5 py-0.5 bg-BATAMART-primary/8 text-BATAMART-primary rounded-full capitalize">
                {w}
              </span>
            ))}
          </div>
        )}

        {product.avgRating > 0 && (
          <div className="flex items-center gap-0.5 mb-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.round(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
            ))}
            <span className="text-[10px] text-gray-500 font-semibold ml-0.5">{product.avgRating.toFixed(1)}</span>
          </div>
        )}

        <p className="text-sm font-black text-BATAMART-primary">{fmt(product.price)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{product.seller?.name || 'Seller'}</p>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────
// Skeleton cards
// ─────────────────────────────────────────────
function RelatedSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="aspect-square shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 shimmer rounded-full w-1/2" />
        <div className="h-3.5 shimmer rounded-full w-full" />
        <div className="h-3.5 shimmer rounded-full w-3/4" />
        <div className="h-4 shimmer rounded-full w-1/3 mt-2" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sticky Amazon-style header with search
// ─────────────────────────────────────────────
function ProductHeader({ productName, onBack }: { productName: string; onBack: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleSearch = () => {
    const q = search.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="batamart-header sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 py-3">

          {/* Back + Logo */}
          <button
            onClick={onBack}
            className="flex-shrink-0 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-black text-base tracking-tight">BATAMART</span>
            </div>
          </button>

          {/* Search bar */}
          <div className="flex-1 min-w-0">
            <div className="search-bar flex items-center gap-2 bg-white rounded-xl shadow-md px-3 ring-2 ring-transparent">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search products, sellers…"
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 py-3 min-w-0"
                autoComplete="off"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleSearch}
                className="flex-shrink-0 px-3 py-1.5 bg-BATAMART-primary hover:bg-BATAMART-dark text-white rounded-lg font-black text-xs transition-colors"
              >
                <span className="hidden sm:inline">Search</span>
                <Search className="w-3.5 h-3.5 sm:hidden" />
              </button>
            </div>
          </div>

          {/* Cart link */}
          <Link
            href="/cart"
            className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
          </Link>
        </div>

        {/* Breadcrumb strip */}
        <div className="pb-2 flex items-center gap-1 text-[11px] text-white/50 overflow-hidden">
          <Link href="/marketplace" className="hover:text-white/80 transition-colors flex-shrink-0">Marketplace</Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-white/80 truncate font-semibold">{productName}</span>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function ProductPage() {
  const params = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  // Related products — infinite scroll
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedPage, setRelatedPage] = useState(0);
  const [relatedHasMore, setRelatedHasMore] = useState(true);
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false);
  const relatedSentinelRef = useRef<HTMLDivElement>(null);

  const addItem = useCartStore((state) => state.addItem);

  // Inject CSS
  useEffect(() => {
    if (document.getElementById('product-page-css')) return;
    const s = document.createElement('style');
    s.id = 'product-page-css';
    s.textContent = PAGE_CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => { if (params.id) fetchProduct(); }, [params.id]);

  useEffect(() => {
    if (product?.sellerId) fetchSellerReviews();
    if (product?.id) fetchProductReviews();
    if (product?.name && product?.id) {
      setRelatedProducts([]);
      setRelatedPage(0);
      setRelatedHasMore(true);
      loadRelated(0, product.name, product.id);
    }
  }, [product?.sellerId, product?.id, product?.name]);

  // Infinite scroll for related products
  useEffect(() => {
    if (!relatedSentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && relatedHasMore && !relatedLoadingMore && product) {
          loadMoreRelated();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(relatedSentinelRef.current);
    return () => obs.disconnect();
  }, [relatedHasMore, relatedLoadingMore, product, relatedPage]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?userId=${product.sellerId}&type=SELLER`);
      if (response.ok) {
        const data = await response.json();
        setSellerReviews(data.reviews || []);
      }
    } catch { }
  };

  const fetchProductReviews = async () => {
    try {
      const response = await fetch(`/api/reviews/product?productId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProductReviews(data.reviews || []);
      }
    } catch { }
    finally { setReviewsLoading(false); }
  };

  // Load related by product NAME similarity (not just category)
  const loadRelated = async (page: number, name: string, excludeId: string) => {
    if (page === 0) setRelatedLoading(true);
    else setRelatedLoadingMore(true);

    try {
      // Try name-based search first, fallback to category
      const q = name.split(' ').slice(0, 3).join(' ');
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(q)}&limit=${RELATED_PAGE_SIZE}&offset=${page * RELATED_PAGE_SIZE}`
      );
      let items: any[] = [];
      if (res.ok) {
        const data = await res.json();
        items = (data.products || []).filter((p: any) => p.id !== excludeId);
      }

      // If not enough, supplement with category results
      if (items.length < 4 && product?.category) {
        const catRes = await fetch(
          `/api/products?category=${encodeURIComponent(product.category)}&limit=${RELATED_PAGE_SIZE}&offset=${page * RELATED_PAGE_SIZE}`
        );
        if (catRes.ok) {
          const catData = await catRes.json();
          const catItems = (catData.products || []).filter(
            (p: any) => p.id !== excludeId && !items.find(x => x.id === p.id)
          );
          items = [...items, ...catItems].slice(0, RELATED_PAGE_SIZE);
        }
      }

      if (page === 0) {
        setRelatedProducts(items);
      } else {
        setRelatedProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          return [...prev, ...items.filter(p => !ids.has(p.id))];
        });
      }
      setRelatedHasMore(items.length === RELATED_PAGE_SIZE);
      setRelatedPage(page + 1);
    } catch { setRelatedHasMore(false); }
    finally { setRelatedLoading(false); setRelatedLoadingMore(false); }
  };

  const loadMoreRelated = () => {
    if (!product) return;
    loadRelated(relatedPage, product.name, product.id);
  };

  const addToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      maxQuantity: product.quantity,
      image: product.images?.[0] || '/placeholder.png',
      sellerId: product.sellerId,
      sellerName: product.seller?.name || 'Seller',
    });
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 3000);
    setQuantity(1);
  };

  const handleShare = async () => {
    const productLink = `${window.location.origin}/product/${product?.id}`;
    try {
      await navigator.clipboard.writeText(productLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = productLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setShowLinkCopied(true);
    setTimeout(() => setShowLinkCopied(false), 3000);
  };

  const handlePreviousImage = () =>
    setCurrentImageIndex(prev => prev === 0 ? (product.images?.length || 1) - 1 : prev - 1);
  const handleNextImage = () =>
    setCurrentImageIndex(prev => prev === (product.images?.length || 1) - 1 ? 0 : prev + 1);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(price);

  const stockStatus = product
    ? product.quantity > 10
      ? { label: 'In Stock', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500' }
      : product.quantity > 0
        ? { label: `Only ${product.quantity} left`, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', dot: 'bg-amber-500' }
        : { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', dot: 'bg-red-500' }
    : null;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="h-14 batamart-header" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid lg:grid-cols-[1fr_420px] gap-8">
            <div className="space-y-4">
              <div className="aspect-square shimmer rounded-2xl" />
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 shimmer rounded-xl flex-shrink-0" />)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-8 shimmer rounded-xl w-3/4" />
              <div className="h-6 shimmer rounded-xl w-1/2" />
              <div className="h-16 shimmer rounded-2xl" />
              <div className="h-32 shimmer rounded-2xl" />
              <div className="h-14 shimmer rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4">
        <div className="text-center bg-white rounded-2xl p-12 shadow-sm border border-gray-100 max-w-md">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-gray-200">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-500 mb-6">This product doesn&apos;t exist or has been removed.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-BATAMART-primary hover:bg-BATAMART-dark text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md"
          >
            <ChevronLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const descriptionTags = parseTags(product.description);
  const isTagDescription = descriptionTags.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-24">

      {/* ── Toast notifications ── */}
      {showAddedToCart && (
        <div className="toast-enter fixed top-20 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-sm">Added to cart!</span>
        </div>
      )}
      {showLinkCopied && (
        <div className="toast-enter fixed top-20 right-4 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Copy className="w-3 h-3" />
          </div>
          <span className="font-semibold text-sm">Link copied!</span>
        </div>
      )}

      {/* ── Amazon-style sticky header ── */}
      <ProductHeader productName={product.name} onBack={() => router.back()} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">

        {/* ══ MAIN PRODUCT SECTION ══ */}
        <div className="grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-10 items-start">

          {/* ── LEFT: Images ── */}
          <div className="space-y-3 fade-up">

            {/* Main image — Amazon-style white bg with zoom */}
            <div className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group img-wrap aspect-square">
              <img
                src={product.images?.[currentImageIndex] || '/placeholder.png'}
                alt={product.name}
                className="product-img-main w-full h-full object-contain p-6 sm:p-10"
              />

              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-gray-900/60 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1}/{product.images.length}
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {product.images.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`rounded-full transition-all duration-200 ${i === currentImageIndex ? 'w-5 h-1.5 bg-BATAMART-primary' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Wishlist button */}
              <button
                onClick={() => setWishlisted(w => !w)}
                className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              >
                <Heart className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {product.images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`thumb-btn flex-shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      currentImageIndex === index
                        ? 'border-BATAMART-primary shadow-md shadow-BATAMART-primary/20'
                        : 'border-gray-200 hover:border-gray-300 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Amazon-style trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Shield className="w-4 h-4 text-BATAMART-primary" />, label: 'Verified Seller', sub: 'Trust Guaranteed' },
                { icon: <Zap className="w-4 h-4 text-amber-500" />, label: 'Fast Delivery', sub: 'Campus-wide' },
                { icon: <BadgeCheck className="w-4 h-4 text-emerald-500" />, label: 'Campus Safe', sub: 'UNIZIK Only' },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1 bg-white rounded-xl p-3 border border-gray-100 text-center">
                  {icon}
                  <span className="text-[11px] font-black text-gray-700">{label}</span>
                  <span className="text-[9px] text-gray-400 font-medium">{sub}</span>
                </div>
              ))}
            </div>

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 hover:border-BATAMART-primary hover:bg-BATAMART-primary/5 rounded-xl text-sm font-bold text-gray-500 hover:text-BATAMART-primary transition-all"
            >
              <Share2 className="w-4 h-4" /> Share this product
            </button>
          </div>

          {/* ── RIGHT: Product info (Amazon buy-box style) ── */}
          <div className="space-y-4 fade-up" style={{ animationDelay: '80ms' }}>

            {/* Category + stock */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/marketplace?category=${encodeURIComponent(product.category)}`}
                className="text-[11px] font-bold text-BATAMART-primary uppercase tracking-widest bg-BATAMART-primary/8 hover:bg-BATAMART-primary/15 px-3 py-1 rounded-full transition-colors"
              >
                {product.category}
              </Link>
              {stockStatus && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ring-1 ${stockStatus.bg} ${stockStatus.color} ${stockStatus.ring}`}>
                  <span className={`w-1.5 h-1.5 rounded-full pulse-dot ${stockStatus.dot}`} />
                  {stockStatus.label}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            {product.avgRating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-black text-gray-700">{product.avgRating?.toFixed(1)}</span>
                <span className="text-sm text-BATAMART-primary font-semibold hover:underline cursor-pointer">
                  {product.totalReviews || 0} ratings
                </span>
              </div>
            )}

            <div className="h-px bg-gray-100" />

            {/* ── PRICE BOX (Amazon buy-box) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

              {/* Price */}
              <div>
                <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                  {formatPrice(product.price)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">Per unit · inclusive of all fees</p>
              </div>

              {/* Delivery info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">
                    <span className="font-bold text-gray-900">FREE</span> campus delivery for orders over ₦30,000
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600">Delivers within <span className="font-bold text-gray-900">UNIZIK campus</span></span>
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* Stock */}
              {stockStatus && (
                <p className={`text-base font-black ${stockStatus.color}`}>{stockStatus.label}</p>
              )}

              {/* Quantity selector */}
              {product.quantity > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</p>
                  <div className="inline-flex items-center border-2 border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="qty-btn w-11 h-11 flex items-center justify-center text-gray-600 rounded-none"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-black text-lg text-gray-900 select-none">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                      className="qty-btn w-11 h-11 flex items-center justify-center text-gray-600 rounded-none"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="ml-3 text-sm text-gray-400 font-medium">
                    <span className="font-black text-gray-900">{product.quantity}</span> available
                  </span>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  onClick={addToCart}
                  disabled={product.quantity === 0}
                  className="cta-main w-full flex items-center justify-center gap-2.5 bg-BATAMART-primary disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-base shadow-lg shadow-BATAMART-primary/25 transition-all"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart · {formatPrice(product.price * quantity)}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push('/cart')}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-BATAMART-primary hover:bg-BATAMART-primary/5 text-gray-700 hover:text-BATAMART-primary font-bold text-sm transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" /> View Cart
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"
                  >
                    Keep Shopping
                  </button>
                </div>
              </div>
            </div>

            {/* Description / Tags */}
            {product.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About this product</p>
                {isTagDescription ? (
                  <div className="flex flex-wrap gap-2">
                    {descriptionTags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-BATAMART-primary/8 text-BATAMART-primary text-sm font-semibold rounded-full ring-1 ring-BATAMART-primary/15"
                      >
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
                )}
              </div>
            )}

            {/* ── Seller card (Amazon-style) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {product.seller?.profilePhoto ? (
                    <img
                      src={product.seller.profilePhoto}
                      alt={product.seller.name}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-BATAMART-primary/10 flex items-center justify-center ring-2 ring-BATAMART-primary/20">
                      <span className="text-BATAMART-primary font-black text-xl">
                        {(product.seller?.name || 'S')[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Sold by</p>
                  <Link
                    href={`/seller/${product.sellerId}`}
                    className="text-lg font-black text-gray-900 hover:text-BATAMART-primary transition-colors truncate block"
                  >
                    {product.seller?.name || 'Seller'}
                  </Link>
                  <div className="flex items-center gap-1 mt-0.5">
                    {product.seller?.trustLevel === 'GOLD' && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">⭐ Gold Seller</span>}
                    {product.seller?.trustLevel === 'SILVER' && <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full ring-1 ring-slate-200">🥈 Silver Seller</span>}
                    {product.seller?.trustLevel === 'BRONZE' && <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full ring-1 ring-orange-200">🥉 Bronze Seller</span>}
                  </div>
                </div>
                <Link
                  href={`/seller/${product.sellerId}`}
                  className="flex-shrink-0 text-xs font-bold text-BATAMART-primary hover:underline flex items-center gap-0.5"
                >
                  Visit store <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Seller stats */}
              <div className="grid grid-cols-3 border-t border-gray-50">
                {[
                  { icon: <TrendingUp className="w-4 h-4 text-BATAMART-primary" />, value: product.seller?.completedOrders || 0, label: 'Orders' },
                  { icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />, value: product.seller?.avgRating?.toFixed(1) || '0.0', label: 'Rating' },
                  { icon: <Shield className="w-4 h-4 text-purple-500" />, value: product.seller?.trustLevel || 'Bronze', label: 'Level' },
                ].map(({ icon, value, label }, i) => (
                  <div key={label} className={`flex flex-col items-center justify-center py-4 gap-1 ${i < 2 ? 'border-r border-gray-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      {icon}
                      <span className="font-black text-sm text-gray-900">{value}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">{label}</span>
                  </div>
                ))}
              </div>

              {sellerReviews.length > 0 && (
                <div className="border-t border-gray-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Seller Reviews</p>
                    <span className="text-xs text-gray-400">{sellerReviews.length} total</span>
                  </div>
                  <ReviewList reviews={sellerReviews.slice(0, 2)} />
                  <button
                    onClick={() => router.push(`/seller/${product.sellerId}`)}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-BATAMART-primary hover:text-BATAMART-dark transition-colors py-2 hover:bg-BATAMART-primary/5 rounded-xl"
                  >
                    View All Reviews <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Product details grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-BATAMART-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-BATAMART-primary" />
                </div>
                <h3 className="font-black text-gray-900">Product Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</p>
                  <p className="font-black text-gray-900 text-sm">{product.category}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery</p>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="font-bold text-gray-900 text-xs">On Campus</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Condition</p>
                  <p className="font-black text-gray-900 text-sm">
                    {descriptionTags.find(t => ['New', 'Used', 'Refurbished'].includes(t)) || 'Available'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stock</p>
                  <p className="font-black text-gray-900 text-sm">{product.quantity} units</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ PRODUCT REVIEWS ══ */}
        {!reviewsLoading && (
          <div className="mt-10 sm:mt-14 fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between mb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center ring-1 ring-purple-100">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 section-accent">Customer Reviews</h2>
                  {product.avgRating > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-black text-gray-700">{product.avgRating?.toFixed(1)} out of 5</span>
                    </div>
                  )}
                </div>
              </div>
              {product.totalReviews > 0 && (
                <Link
                  href={`/product/${params.id}/reviews`}
                  className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-BATAMART-primary hover:underline transition-colors"
                >
                  See all {product.totalReviews} reviews <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {productReviews.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {productReviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-5 sm:p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {review.reviewer?.profilePhoto ? (
                          <img src={review.reviewer.profilePhoto} alt={review.reviewer.name} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-BATAMART-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-BATAMART-primary font-black text-sm">{(review.reviewer?.name || 'A')[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{review.reviewer?.name || 'Anonymous'}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
                              <BadgeCheck className="w-3 h-3" /> Verified
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-100">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-black text-gray-800 mb-1">No Reviews Yet</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Be the first to review this product after purchasing.</p>
                </div>
              )}

              {productReviews.length > 5 && (
                <div className="border-t border-gray-50 p-5 text-center">
                  <Link
                    href={`/product/${params.id}/reviews`}
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
                  >
                    See all reviews ({productReviews.length - 5} more) <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ DEALS ON RELATED PRODUCTS — infinite vertical scroll ══ */}
        <div className="mt-10 sm:mt-14">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 section-accent">
                Deals on related products
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Similar to &ldquo;{product.name.split(' ').slice(0, 4).join(' ')}&rdquo;
              </p>
            </div>
            <Link
              href={`/marketplace?category=${encodeURIComponent(product.category)}`}
              className="flex items-center gap-1.5 text-sm font-bold text-BATAMART-primary hover:underline flex-shrink-0"
            >
              See all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid — vertical, infinite */}
          {relatedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <RelatedSkeleton key={i} />)}
            </div>
          ) : relatedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold text-sm">No related products found yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {relatedProducts.map((item) => (
                  <RelatedCard
                    key={item.id}
                    product={item}
                    currentProductName={product.name}
                  />
                ))}
                {/* Skeleton placeholders while loading more */}
                {relatedLoadingMore && Array.from({ length: 4 }).map((_, i) => <RelatedSkeleton key={`skel-${i}`} />)}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={relatedSentinelRef} className="flex justify-center items-center py-10 mt-2">
                {relatedLoadingMore ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Loader2 className="w-4 h-4 spin" />
                    Loading more deals…
                  </div>
                ) : relatedHasMore ? (
                  <div className="w-full h-4" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-300">
                    <CheckCircle className="w-5 h-5" />
                    <p className="text-xs font-semibold">You&apos;ve seen all related products</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}