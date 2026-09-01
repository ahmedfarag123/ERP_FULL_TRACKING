import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ChevronLeft, Filter, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';

interface ProductRow {
  id: string;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  unit: string | null;
  current_stock: number;
}

type StockFilter = 'all' | 'available' | 'low' | 'out';

const stockFilters: { key: StockFilter; label: string; color: string }[] = [
  { key: 'all', label: 'الكل', color: 'bg-gray-100 text-gray-600' },
  { key: 'available', label: 'متوفر', color: 'bg-success-50 text-success-600' },
  { key: 'low', label: 'منخفض', color: 'bg-warning-50 text-warning-600' },
  { key: 'out', label: 'نفد', color: 'bg-error-50 text-error-600' },
];

function getStockStatus(qty: number): 'available' | 'low' | 'out' {
  if (qty === 0) return 'out';
  if (qty <= 5) return 'low';
  return 'available';
}

export default function InventoryScreen() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, external_product_id, internal_reference, quantity_on_hand, unit_of_measure')
        .order('product_name', { ascending: true });
      if (error) throw new Error(error.message);
      setProducts((data ?? []).map((product) => ({
        id: product.id,
        product_name: product.product_name ?? null,
        product_ref: product.internal_reference ?? product.external_product_id ?? null,
        product_code: product.internal_reference ?? product.external_product_id ?? null,
        unit: product.unit_of_measure ?? null,
        current_stock: Number(product.quantity_on_hand ?? 0),
      })));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطأ في تحميل المنتجات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const units = useMemo(() => {
    const set = new Set(products.map((p) => p.unit).filter(Boolean) as string[]);
    return ['all', ...Array.from(set).sort()];
  }, [products]);

  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter((p) => p.current_stock > 5).length;
    const low = products.filter((p) => p.current_stock > 0 && p.current_stock <= 5).length;
    const out = products.filter((p) => p.current_stock === 0).length;
    return { total, available, low, out };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;

    if (stockFilter !== 'all') {
      list = list.filter((p) => getStockStatus(p.current_stock) === stockFilter);
    }

    if (unitFilter !== 'all') {
      list = list.filter((p) => p.unit === unitFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(q) ||
          p.product_code?.toLowerCase().includes(q) ||
          p.product_ref?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [products, searchQuery, stockFilter, unitFilter]);

  const hasActiveFilters = stockFilter !== 'all' || unitFilter !== 'all';

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="المخزون" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Stats */}
        <div className="px-4 pt-3 grid grid-cols-4 gap-2">
          {[
            { label: 'الإجمالي', value: stats.total, bg: 'bg-gray-50', text: 'text-gray-600' },
            { label: 'متوفر', value: stats.available, bg: 'bg-success-50', text: 'text-success-600' },
            { label: 'منخفض', value: stats.low, bg: 'bg-warning-50', text: 'text-warning-600' },
            { label: 'نفد', value: stats.out, bg: 'bg-error-50', text: 'text-error-600' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-xl p-2.5 text-center`}>
              <span className={`text-lg font-bold ${stat.text}`}>{stat.value}</span>
              <span className={`text-[10px] ${stat.text} block`}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 mt-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو المرجع..."
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent shadow-card"
            />
          </div>
        </div>

        {/* Filter toggle */}
        <div className="px-4 mt-2 flex items-center justify-between">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-brand-100 text-brand-700'
                : 'bg-white text-app-text-secondary shadow-card'
            }`}
          >
            <Filter size={14} />
            فلاتر متقدمة
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">
                {(stockFilter !== 'all' ? 1 : 0) + (unitFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => { setStockFilter('all'); setUnitFilter('all'); }}
              className="flex items-center gap-1 text-xs text-error-500 font-medium"
            >
              <X size={12} />
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Filter panels */}
        {showFilters && (
          <div className="px-4 mt-2 flex flex-col gap-2">
            {/* Stock status filter */}
            <div className="bg-white rounded-xl p-3 shadow-card">
              <p className="text-xs font-semibold text-app-text mb-2">حالة المخزون</p>
              <div className="flex gap-1.5 flex-wrap">
                {stockFilters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStockFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      stockFilter === f.key ? f.color : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit filter */}
            <div className="bg-white rounded-xl p-3 shadow-card">
              <p className="text-xs font-semibold text-app-text mb-2">الوحدة</p>
              <div className="flex gap-1.5 flex-wrap">
                {units.map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnitFilter(u)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      unitFilter === u
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {u === 'all' ? 'الكل' : u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="px-4 mt-3">
          <p className="text-xs text-app-text-secondary">
            {filtered.length} من {products.length} منتج
          </p>
        </div>

        {/* Products list */}
        <div className="px-4 mt-2 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-text-secondary">لا توجد منتجات</p>
            </div>
          ) : (
            filtered.map((product) => {
              const status = getStockStatus(product.current_stock);
              const statusColors = {
                available: 'text-app-success',
                low: 'text-warning-600',
                out: 'text-app-error',
              };
              return (
                <button
                  key={product.id}
                  onClick={() => navigate(`/inventory/${product.id}`)}
                  className="w-full bg-white rounded-xl p-4 shadow-card text-right active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-app-light flex items-center justify-center">
                        <Package size={18} className="text-app-dark" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-app-text">{product.product_name ?? product.product_ref ?? 'منتج'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-app-text-secondary">{product.product_code ?? product.product_ref ?? '-'}</p>
                          {product.unit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{product.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <p className={`text-sm font-bold ${statusColors[status]}`}>
                          {product.current_stock}
                        </p>
                        <p className="text-[10px] text-app-text-secondary">المخزون</p>
                      </div>
                      <ChevronLeft size={16} className="text-gray-400" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
