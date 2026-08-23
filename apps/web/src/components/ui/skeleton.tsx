'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('animate-pulse bg-slate-200 rounded-xl', className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, className, ...props }, ref) => {
    const widthClasses = ['w-full', 'w-4/5', 'w-3/5'];

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-4 animate-pulse bg-slate-200 rounded-xl',
              widthClasses[index % widthClasses.length]
            )}
          />
        ))}
      </div>
    );
  }
);
SkeletonText.displayName = 'SkeletonText';

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl bg-white p-4 shadow-soft border border-slate-100 space-y-3',
          className
        )}
        {...props}
      >
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
      </div>
    );
  }
);
SkeletonCard.displayName = 'SkeletonCard';

const skeletonAvatarVariants = cva('rounded-full shrink-0 animate-pulse bg-slate-200', {
  variants: {
    size: {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-14 w-14',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SkeletonAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonAvatarVariants> {}

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonAvatarVariants({ size }), className)}
        {...props}
      />
    );
  }
);
SkeletonAvatar.displayName = 'SkeletonAvatar';

export interface SkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ count = 3, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-4', className)} {...props}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }
);
SkeletonList.displayName = 'SkeletonList';

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonList,
  skeletonAvatarVariants,
};
