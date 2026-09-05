import { Screen } from '@/components/ui/Screen';
import { Skeleton } from '@/components/ui/States';

export default function Loading() {
  return (
    <Screen>
      <div className="space-y-5 pt-10">
        <div className="h-8 w-40 animate-pulse rounded bg-concrete-deep" />
        <Skeleton lines={4} />
      </div>
    </Screen>
  );
}
