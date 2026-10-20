import { Link, useLocation } from 'react-router';
import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readBackState } from '@/lib/navigation';

/** 回到來源頁（router state 的 BackState），並帶回來源頁自己的 BackState；沒有來源時回到 fallback */
export default function BackButton({ fallback, fallbackLabel }: { fallback: string; fallbackLabel: string }) {
  const location = useLocation();
  const back = readBackState(location.state);

  return (
    <Button asChild variant="ghost" className="h-9 self-start px-2">
      <Link to={back?.from ?? fallback} state={back?.state}>
        <ChevronLeftIcon />
        {back?.label ?? fallbackLabel}
      </Link>
    </Button>
  );
}
