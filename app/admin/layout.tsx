// Admin pages reuse dashboard layout
// Navbar is rendered per-page since it needs profile data
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
