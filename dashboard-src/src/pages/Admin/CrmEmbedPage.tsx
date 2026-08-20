export default function CrmEmbedPage() {
  return (
    <div className="h-[calc(100dvh-10rem)] min-h-[600px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
      <iframe
        src="/crm/login"
        title="نظام الطلبات (التكويد)"
        className="h-full w-full border-0"
        allow="clipboard-write"
      />
    </div>
  );
}
