import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';

interface ProductRow {
  id: string;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  category: string | null;
  current_stock: number;
}

export default function InventoryScreen() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, external_product_id, internal_reference, quantity_on_hand, unit_of_measure')
        .order('product_name', { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      setProducts((data ?? []).map((product) => ({
        id: product.id,
        product_name: product.product_name ?? null,
        product_ref: product.internal_reference ?? product.external_product_id ?? null,
        product_code: product.internal_reference ?? product.external_product_id ?? null,
        category: product.unit_of_measure ?? null,
        current_stock: Number(product.quantity_on_hand ?? 0),
      })));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطأ في تحميل المنتجات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.product_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.product_ref?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="المخزون" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <div className="px-4 pt-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent shadow-card"
            />
          </div>
        </div>

        <div className="px-4 mt-4 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-app-text-secondary">لا توجد منتجات</p>
            </div>
          ) : (
            filtered.map((product) => (
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
                      <p className="text-xs text-app-text-secondary">{product.product_code ?? product.product_ref ?? '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <p className={`text-sm font-bold ${product.current_stock > 0 ? 'text-app-text' : 'text-app-error'}`}>
                        {product.current_stock}
                      </p>
                      <p className="text-xs text-app-text-secondary">المخزون</p>
                    </div>
                    <ChevronLeft size={16} className="text-gray-400" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

