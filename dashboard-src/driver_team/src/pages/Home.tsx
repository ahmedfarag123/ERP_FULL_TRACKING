import '../App.css'

export default function Home() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-6 py-10 text-right text-slate-950">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">هوريكا سمارت</p>
        <h1 className="mt-2 text-2xl font-bold">تطبيق السائقين</h1>
        <p className="mt-3 text-sm text-slate-600">
          افتح مسار السائق من خلال رابط التطبيق الرئيسي للمتابعة إلى لوحة التسليم.
        </p>
      </div>
    </main>
  )
}
