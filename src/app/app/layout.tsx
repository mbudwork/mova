import { BottomNav } from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Bottom padding clears the fixed nav so nothing is ever hidden behind it. */}
      <main className="pb-[92px]">{children}</main>
      <BottomNav />
    </>
  );
}
