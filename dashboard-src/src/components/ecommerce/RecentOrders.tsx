import type { DashboardOrderRow } from "../../types/admin-dashboard";
import StatusBadge from "../ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

interface RecentOrdersProps {
  rows: DashboardOrderRow[];
  isLoading?: boolean;
}

export default function RecentOrders({
  rows,
  isLoading = false,
}: RecentOrdersProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Recent Orders
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Latest synced orders contributing to current month GMV
        </p>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Orders
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Customer
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Amount
              </TableCell>
              <TableCell
                isHeader
                className="py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && rows.length === 0
              ? Array.from({ length: 6 }, (_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 4 }, (_, cellIndex) => (
                      <TableCell key={cellIndex} className="py-3">
                        <div className="h-10 animate-pulse rounded-lg bg-brand-25 dark:bg-white/[0.02]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-[50px] w-[50px] items-center justify-center rounded-md bg-brand-50 text-sm font-semibold uppercase text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                          {order.customerName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            #{order.orderNumber}
                          </p>
                          <span className="text-gray-500 text-theme-xs dark:text-gray-400">
                            {order.repName} | {order.createdAt}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      {order.amount}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                      <StatusBadge
                        label={order.status}
                        tone={
                          order.status === "Delivered"
                            ? "green"
                            : order.status === "Pending"
                              ? "yellow"
                              : "red"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
