import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';

interface ProductDetail {
  id: string;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  category: string | null;
  current_stock: number;
  unit: string | null;
}

export default function ProductDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const showToast = useUIStore((s) => s.showToast);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadProduct(id);
  }, [id]);

  const loadProduct = async (productId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, external_product_id, internal_reference, quantity_on_hand, unit_of_measure')
        .eq('id', productId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      setProduct(data ? {
        id: data.id,
        product_name: data.product_name ?? null,
        product_ref: data.internal_reference ?? data.external_product_id ?? null,
        product_code: data.internal_reference ?? data.external_product_id ?? null,
        category: null,
        current_stock: Number(data.quantity_on_hand ?? 0),
        unit: data.unit_of_measure ?? null,
      } : null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'خطأ', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل المنتج" />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-app-accent" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="تفاصيل المنتج" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-text-secondary">المنتج غير موجود</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="تفاصيل المنتج" />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-app-light flex items-center justify-center">
              <Package size={28} className="text-app-dark" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-app-text">{product.product_name ?? 'منتج'}</h2>
              <p className="text-sm text-app-text-secondary">{product.product_code ?? product.product_ref ?? '-'}</p>
            </div>
          </div>
        </div>

        <div className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-app-text">المعلومات</h3>
          </div>
          {[
            { label: 'التصنيف', value: product.category ?? '-' },
            { label: 'الوحدة', value: product.unit ?? '-' },
            { label: 'الكود', value: product.product_code ?? '-' },
            { label: 'المرجع', value: product.product_ref ?? '-' },
          ].map((row, i, arr) => (
            <div key={row.label} className={`px-4 py-3 flex items-center justify-between ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className="text-sm text-app-text-secondary">{row.label}</span>
              <span className="text-sm font-medium text-app-text">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-app-text-secondary">المخزون الحالي</span>
            <span className={`text-2xl font-bold ${product.current_stock > 0 ? 'text-app-success' : 'text-app-error'}`}>
              {product.current_stock}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

