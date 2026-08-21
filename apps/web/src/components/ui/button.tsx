import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F5D45] disabled:pointer-events-none disabled:opacity-50', {
  variants: { variant: { default: 'bg-[#1F5D45] text-white hover:bg-[#174635]', outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50', ghost: 'text-slate-600 hover:bg-slate-100' }, size: { default: 'h-11 px-4', sm: 'h-9 px-3 text-xs', lg: 'h-12 px-6' } },
  defaultVariants: { variant: 'default', size: 'default' },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />);
Button.displayName = 'Button';
export { Button, buttonVariants };
