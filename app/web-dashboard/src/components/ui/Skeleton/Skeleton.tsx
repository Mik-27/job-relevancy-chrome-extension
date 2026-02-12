import React from 'react';

type SkeletonVariant = 'block' | 'line' | 'circle' | 'pill';

interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
}

const variantClasses: Record<SkeletonVariant, string> = {
  block: 'rounded-xl',
  line: 'rounded-full',
  circle: 'rounded-full',
  pill: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'block',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-white/10 ${variantClasses[variant]} ${className}`.trim()}
    />
  );
};
