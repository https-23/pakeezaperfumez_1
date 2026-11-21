export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const WHATSAPP_NUMBER = '919876543210';

export function buildWhatsAppLink(message: string): string {
  return `https://api.whatsapp.com/send/?text=${encodeURIComponent(message)}`;
}

export const FREE_SHIPPING_THRESHOLD = 999;
export const STANDARD_SHIPPING_FEE = 79;
export const SAMPLE_KIT_PRICE = 499;
export const PARTIAL_COD_ADVANCE = 99;
