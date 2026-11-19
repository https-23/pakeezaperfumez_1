export type ScentFamily = 'Oud' | 'Floral' | 'Woody' | 'Musk' | 'Fresh';
export type Occasion = 'Office' | 'Party' | 'Daily' | 'Festive';
export type Gender = 'Unisex' | 'Men' | 'Women';
export type FragranceType = 'Attar' | 'Perfume';
export type OrderStatus = 'Pending' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentMethod = 'prepaid' | 'partial_cod' | 'cod';
export type PaymentStatus = 'Paid' | 'Partial COD' | 'COD Pending' | 'Pending';

export interface ProductVariant {
  id: string;
  label: string; // e.g., "3ml", "6ml", "12ml", "30ml", "50ml"
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku: string;
}

export interface FragranceNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  type: FragranceType;
  scentFamily: ScentFamily;
  occasion: Occasion;
  gender: Gender;
  images: string[];
  variants: ProductVariant[];
  notes: FragranceNotes;
  longevityHours: number; // e.g., 14
  projectionScore: number; // 1 to 10
  isBestseller: boolean;
  isOutOfStock: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  authorName: string;
  city: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

export interface CartItem {
  key: string; // unique key: productId:variantId OR samplekit:hash
  kind: 'product' | 'sample_kit';
  productId?: string;
  variantId?: string;
  name: string;
  subtitle: string;
  image: string;
  price: number;
  quantity: number;
  kitItems?: { productId: string; name: string; scentFamily: ScentFamily }[];
}

export interface Coupon {
  code: string;
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  isActive: boolean;
  description: string;
}

export interface OrderItem {
  name: string;
  subtitle: string;
  price: number;
  quantity: number;
  image: string;
  productId?: string;
  variantId?: string;
  kitItems?: { productId: string; name: string; scentFamily: ScentFamily }[];
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  items: OrderItem[];
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  prepaidDiscount: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  paymentRef?: string;
  orderStatus: OrderStatus;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}
