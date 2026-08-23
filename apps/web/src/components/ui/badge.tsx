'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Package,
  Bike,
  PackageCheck,
  XCircle,
  AlertTriangle,
  FileText,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        error: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        brand: 'bg-emerald-50 text-[#06C755] border-emerald-200',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        default: '',
        lg: 'text-xs px-3 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'orange'
  | 'brand';

export type BadgeSize = 'sm' | 'default' | 'lg';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
        {children}
      </span>
    );
  }
);
Badge.displayName = 'Badge';

export interface StatusConfigItem {
  label: string;
  variant: BadgeVariant;
  iconName: string;
  icon: LucideIcon;
  spin?: boolean;
}

export const ORDER_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  PENDING_PAYMENT: {
    label: 'รอชำระเงิน',
    variant: 'warning',
    iconName: 'Clock',
    icon: Clock,
  },
  PAYMENT_VERIFYING: {
    label: 'กำลังตรวจสลิป',
    variant: 'info',
    iconName: 'Clock',
    icon: Clock,
    spin: true,
  },
  PAID: {
    label: 'ชำระเงินแล้ว',
    variant: 'success',
    iconName: 'CheckCircle2',
    icon: CheckCircle2,
  },
  CONFIRMED: {
    label: 'รับออเดอร์แล้ว',
    variant: 'success',
    iconName: 'CheckCircle2',
    icon: CheckCircle2,
  },
  PREPARING: {
    label: 'กำลังปรุงอาหาร',
    variant: 'orange',
    iconName: 'ChefHat',
    icon: ChefHat,
  },
  READY: {
    label: 'พร้อมจัดส่ง',
    variant: 'success',
    iconName: 'Package',
    icon: Package,
  },
  OUT_FOR_DELIVERY: {
    label: 'กำลังจัดส่ง 🛵',
    variant: 'brand',
    iconName: 'Bike',
    icon: Bike,
  },
  DELIVERED: {
    label: 'จัดส่งแล้ว',
    variant: 'default',
    iconName: 'PackageCheck',
    icon: PackageCheck,
  },
  COMPLETED: {
    label: 'สำเร็จ',
    variant: 'default',
    iconName: 'CheckCircle2',
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: 'ยกเลิก',
    variant: 'error',
    iconName: 'XCircle',
    icon: XCircle,
  },
  EXPIRED: {
    label: 'หมดอายุ',
    variant: 'default',
    iconName: 'Clock',
    icon: Clock,
  },
  PAYMENT_FAILED: {
    label: 'ชำระเงินล้มเหลว',
    variant: 'error',
    iconName: 'XCircle',
    icon: XCircle,
  },
  MANUAL_REVIEW: {
    label: 'รอตรวจสอบ',
    variant: 'orange',
    iconName: 'AlertTriangle',
    icon: AlertTriangle,
  },
  DELIVERY_FAILED: {
    label: 'จัดส่งล้มเหลว',
    variant: 'error',
    iconName: 'XCircle',
    icon: XCircle,
  },
  DRAFT: {
    label: 'ร่าง',
    variant: 'default',
    iconName: 'FileText',
    icon: FileText,
  },
};

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  PENDING: {
    label: 'รอชำระเงิน',
    variant: 'warning',
    iconName: 'Clock',
    icon: Clock,
  },
  VERIFYING: {
    label: 'กำลังตรวจสลิป',
    variant: 'info',
    iconName: 'Clock',
    icon: Clock,
    spin: true,
  },
  VERIFIED: {
    label: 'ชำระเงินแล้ว',
    variant: 'success',
    iconName: 'CheckCircle2',
    icon: CheckCircle2,
  },
  FAILED: {
    label: 'ชำระเงินล้มเหลว',
    variant: 'error',
    iconName: 'XCircle',
    icon: XCircle,
  },
  MANUAL_REVIEW: {
    label: 'รอตรวจสอบ',
    variant: 'orange',
    iconName: 'AlertTriangle',
    icon: AlertTriangle,
  },
  REFUNDED: {
    label: 'คืนเงินแล้ว',
    variant: 'default',
    iconName: 'RotateCcw',
    icon: RotateCcw,
  },
};

export interface OrderStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  status: string;
  showIcon?: boolean;
}

export const OrderStatusBadge = React.forwardRef<HTMLSpanElement, OrderStatusBadgeProps>(
  ({ status, showIcon = true, className, size, ...props }, ref) => {
    const config = ORDER_STATUS_CONFIG[status] || {
      label: status,
      variant: 'default' as const,
      iconName: 'Clock',
      icon: Clock,
    };
    const IconComponent = config.icon;

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        icon={
          showIcon && IconComponent ? (
            <IconComponent className={cn('w-3 h-3', config.spin && 'animate-spin')} />
          ) : undefined
        }
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);
OrderStatusBadge.displayName = 'OrderStatusBadge';

export interface PaymentStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'icon'> {
  status: string;
  showIcon?: boolean;
}

export const PaymentStatusBadge = React.forwardRef<HTMLSpanElement, PaymentStatusBadgeProps>(
  ({ status, showIcon = true, className, size, ...props }, ref) => {
    const config = PAYMENT_STATUS_CONFIG[status] || {
      label: status,
      variant: 'default' as const,
      iconName: 'Clock',
      icon: Clock,
    };
    const IconComponent = config.icon;

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        icon={
          showIcon && IconComponent ? (
            <IconComponent className={cn('w-3 h-3', config.spin && 'animate-spin')} />
          ) : undefined
        }
        className={className}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);
PaymentStatusBadge.displayName = 'PaymentStatusBadge';

export { Badge, badgeVariants };
