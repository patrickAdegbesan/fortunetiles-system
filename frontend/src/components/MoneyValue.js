import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * MoneyValue component
 * Props:
 *  - amount: number | string
 *  - sensitive: boolean (default true) -> if true only 'owner' can see actual amount
 *  - mask: placeholder for non-owner when sensitive
 *  - showZeroForNonOwner: show 0 instead of mask when sensitive & not owner
 *  - currency / locale formatting options
 *
 * Guidelines:
 *  - Use sensitive={true} for aggregated / company-level metrics (total revenue, stock value, reports)
 *  - Use sensitive={false} for operational amounts staff need (unit price in sale, cart totals, returns line items)
 */
const MoneyValue = ({
  amount,
  currency = 'NGN',
  locale = 'en-NG',
  mask = '***',
  showZeroForNonOwner = false,
  className = '',
  sensitive = true,
  minimumFractionDigits = 2,
}) => {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  // If not sensitive, always show to all roles
  if (!sensitive) {
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || 0);
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
    }).format(numericAmount || 0);
    return <span className={`money-value ${className}`}>{formatted}</span>;
  }

  // Sensitive path: restrict to owner
  if (!isOwner) {
    return <span className={`money-value masked ${className}`}>{showZeroForNonOwner ? '0' : mask}</span>;
  }

  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || 0);
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
  }).format(numericAmount || 0);

  return <span className={`money-value ${className}`}>{formatted}</span>;
};

export default MoneyValue;
