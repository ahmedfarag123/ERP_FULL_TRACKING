import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import type { ShipmentStatus } from '@/types';
import ShipmentListItem from '@/components/ShipmentListItem';
import AppHeader from '@/components/AppHeader';
import { driverAsset } from '@/lib/appAssets';

const filters: { key: ShipmentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'معلق' },
  { key: 'in_transit', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'failed', label: 'فشل' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DeliveriesListScreen() {
  const navigate = useNavigate();
  const {
    shipments,
    statusFilter,
    searchQuery,
    setStatusFilter,
    setSearchQuery,
    selectShipment,
    loadShipments,
    getFilteredShipments,
  } = useDeliveryStore();
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  useEffect(() => {
    loadShipments();
    setActiveTab('deliveries');
  }, []);

  const filtered = getFilteredShipments();

  const getFilterCount = (key: ShipmentStatus | 'all') => {
    if (key === 'all') return shipments.length;
    return shipments.filter((s) => s.status === key).length;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="التسليمات" />

      {/* Search Bar */}
      <div className="bg-white px-4 py-3 shadow-card">
        <div className="relative">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالعميل أو العنوان..."
            className="w-full h-12 bg-gray-100 rounded-xl pr-11 pl-10 text-base text-app-text placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-app-accent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <X size={18} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === filter.key
                  ? 'bg-app-dark text-white'
                  : 'bg-gray-100 text-app-text-secondary'
              }`}
            >
              {filter.label} ({getFilterCount(filter.key)})
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 pb-20"
      >
        {filtered.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filtered.map((shipment) => (
              <motion.div key={shipment.id} variants={itemVariants}>
                <ShipmentListItem
                  shipment={shipment}
                  onClick={() => {
                    selectShipment(shipment.id);
                    navigate(`/deliveries/${shipment.id}`);
                  }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <img
              src={driverAsset('images/empty-deliveries.png')}
              alt="لا توجد تسليمات"
              className="w-32 h-auto opacity-60"
            />
            <h3 className="text-lg font-semibold text-app-text-secondary mt-4">
              لا توجد تسليمات
            </h3>
            <p className="text-sm text-gray-400 mt-1">جرّب تعديل الفلاتر</p>
          </motion.div>
        )}

        {/* List Stats */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between py-3 text-xs text-app-text-secondary">
            <span>
              عرض {filtered.length} من {shipments.length} التسليمات
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
