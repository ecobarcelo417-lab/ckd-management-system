import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon | React.ElementType;
  accent?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  index?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  /** Percent change vs. a prior period, e.g. 12 -> "+12%", -8 -> "-8%" */
  trendValue?: number;
  /** Short context shown after the trend chip, e.g. "vs last week" */
  trendLabel?: string;
}

const accentStyles: Record<string, { bg: string; icon: string; ring: string; from: string; to: string }> = {
  blue: { bg: 'bg-skyglow-50', icon: 'text-skyglow-600', ring: 'ring-skyglow-100', from: '#c3c3c3', to: '#606060' },
  green: { bg: 'bg-leaf-50', icon: 'text-leaf-600', ring: 'ring-leaf-100', from: '#bdbdbd', to: '#616161' },
  yellow: { bg: 'bg-sunbeam-50', icon: 'text-sunbeam-600', ring: 'ring-sunbeam-100', from: '#d3d3d3', to: '#575757' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', ring: 'ring-purple-100', from: '#cbcbcb', to: '#4f4f4f' },
  red: { bg: 'bg-coral-50', icon: 'text-coral-600', ring: 'ring-coral-100', from: '#b5b5b5', to: '#393939' },
};

/** Animated count-up for numeric stat values, driven by a spring for a natural "settle" motion */
const CountUp: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 0 }) => {
  const spring = useSpring(0, { stiffness: 90, damping: 22, mass: 0.6 });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
    return unsubscribe;
  }, [spring, decimals]);

  return <>{display}</>;
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  accent = 'blue',
  index = 0,
  suffix = '',
  prefix = '',
  decimals = 0,
  trendValue,
  trendLabel,
}) => {
  const styles = accentStyles[accent] || accentStyles.blue;
  const isNumeric = typeof value === 'number' && !Number.isNaN(value);

  // Subtle pointer-driven 3D tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 8);
    rotateX.set(py * -8);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const trendDirection: 'up' | 'down' | 'flat' | null =
    trendValue === undefined ? null : trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'flat';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: springRotateX, rotateY: springRotateY, perspective: 800 }}
      className="card group relative p-5 flex items-start justify-between overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
        style={{ background: `linear-gradient(90deg, ${styles.from}, ${styles.to})` }}
      />

      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900 tracking-tight">
          {prefix}
          {isNumeric ? <CountUp value={value as number} decimals={decimals} /> : value}
          {suffix}
        </p>
        {trendDirection && (
          <span
            className={
              trendDirection === 'up' ? 'trend-up mt-2' : trendDirection === 'down' ? 'trend-down mt-2' : 'trend-flat mt-2'
            }
          >
            {trendDirection === 'up' && <TrendingUp className="h-3 w-3" />}
            {trendDirection === 'down' && <TrendingDown className="h-3 w-3" />}
            {trendDirection === 'flat' && <Minus className="h-3 w-3" />}
            {trendValue !== undefined && trendValue > 0 ? '+' : ''}
            {trendValue}% {trendLabel || ''}
          </span>
        )}
      </div>

      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className={`relative h-11 w-11 rounded-xl ${styles.bg} ring-1 ring-inset ${styles.ring} flex items-center justify-center shrink-0`}
      >
        <span
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
          style={{ boxShadow: `0 0 0 3px ${styles.to}` }}
        />
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </motion.div>
    </motion.div>
  );
};

export default StatCard;
