import { AdminSplashSkeleton } from "./admin-loading"

export function AdminSplash({ className }: { className?: string }) {
  return <AdminSplashSkeleton className={className} />
}
