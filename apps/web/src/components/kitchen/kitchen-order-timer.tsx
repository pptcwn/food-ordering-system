'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KitchenOrderTimerProps {
  createdAt: string | Date;
}

export function KitchenOrderTimer({ createdAt }: KitchenOrderTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(createdAt).getTime();
    
    const updateElapsed = () => {
      const now = new Date().getTime();
      setElapsed(Math.max(0, Math.floor((now - startTime) / 1000)));
    };

    updateElapsed(); // Initial call
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isWarning = minutes >= 10 && minutes < 15;
  const isDanger = minutes >= 15;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-mono font-bold',
        {
          'text-emerald-400': !isWarning && !isDanger,
          'text-amber-400': isWarning,
          'text-rose-400 animate-pulse': isDanger,
        }
      )}
    >
      <Clock className="w-3 h-3" />
      <span>{timeString}</span>
    </div>
  );
}
