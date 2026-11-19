import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import {
  createAdminToken,
  generateOrderId,
  getDb,
  getUploadsDir,
  saveDb,
  verifyAdminToken,
} from './server/db.ts';
import type { Coupon, Order, Product, Review } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'paakeezah2026';
const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'paakeezah_demo_secret_key';

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(getUploadsDir()));

// --- Auth Middleware ---
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized admin session. Please sign in again.' });
    return;
  }
  next();
}

// --- Public Storefront APIs ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', brand: 'Pakeeza Perfumez' });
});

app.get('/api/products', (req, res) => {
  const db = getDb();
  const search = String(req.query.q || '').trim().toLowerCase();
  const family = String(req.query.family || '').trim();
  const occasion = String(req.query.occasion || '').trim();
  const gender = String(req.query.gender || '').trim();

  let list = [...db.products];
  if (search) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.tagline.toLowerCase().includes(search) ||
        p.scentFamily.toLowerCase().includes(search) ||
        p.notes.top.some((n) => n.toLowerCase().includes(search)) ||
        p.notes.heart.some((n) => n.toLowerCase().includes(search)) ||
        p.notes.base.some((n) => n.toLowerCase().includes(search))
    );
  }
  if (family && family !== 'All') {
    list = list.filter((p) => p.scentFamily === family);
  }
  if (occasion && occasion !== 'All') {
    list = list.filter((p) => p.occasion === occasion);
  }
  if (gender && gender !== 'All') {
    list = list.filter((p) => p.gender === gender);
  }

  res.json({ products: list, reviews: db.reviews });
});

app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Fragrance not found' });
    return;
  }
  const reviews = db.reviews.filter((r) => r.productId === product.id);
  res.json({ product, reviews });
});

app.post('/api/reviews', (req, res) => {
  const db = getDb();
  const { productId, authorName, city, rating, comment } = req.body;
  if (!productId || !authorName || !comment) {
    res.status(400).json({ error: 'Product, name, and review comment are required.' });
    return;
  }
  const newReview: Review = {
    id: `rev-${Date.now()}`,
    productId: String(productId),
    authorName: String(authorName).trim(),
    city: String(city || 'India').trim(),
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    comment: String(comment).trim(),
    verified: true,
    createdAt: new Date().toISOString(),
  };
  db.reviews.unshift(newReview);
  saveDb();
  res.status(201).json({ review: newReview });
});

app.post('/api/coupons/validate', (req, res) => {
  const db = getDb();
  const code = String(req.body.code || '').trim().toUpperCase();
  const subtotal = Number(req.body.subtotal) || 0;

  if (!code) {
    res.status(400).json({ error: 'Please enter a promo code.' });
    return;
  }

  const coupon = db.coupons.find((c) => c.code.toUpperCase() === code && c.isActive);
  if (!coupon) {
    res.status(404).json({ error: 'Invalid or expired promo code.' });
    return;
  }

  if (subtotal < coupon.minOrder) {
    res.status(400).json({
      error: `Minimum order of ₹${coupon.minOrder} required for ${coupon.code}.`,
    });
    return;
  }

  const discount =
    coupon.discountType === 'percent'
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(subtotal, coupon.value);

  res.json({ coupon, discount });
});

// --- Payment & Order Creation ---
app.post('/api/payments/create-intent', (req, res) => {
  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) {
    res.status(400).json({ error: 'Invalid payment amount' });
    return;
  }
  const gatewayOrderId = `order_rzp_${crypto.randomBytes(6).toString('hex')}`;
  const paymentId = `pay_rzp_${crypto.randomBytes(6).toString('hex')}`;
  const signature = crypto
    .createHmac('sha256', RAZORPAY_SECRET)
    .update(`${gatewayOrderId}|${paymentId}`)
    .digest('hex');

  res.json({
    gatewayOrderId,
    paymentId,
    signature,
    amountInPaise: Math.round(amount * 100),
    currency: 'INR',
  });
});

app.post('/api/orders', (req, res) => {
  const db = getDb();
  const {
    customerName,
    phone,
    address,
    city,
    pincode,
    items,
    couponCode,
    paymentMethod,
    gatewayOrderId,
    paymentId,
    signature,
  } = req.body;

  if (!customerName || !phone || !address || !city || !pincode || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'All shipping fields and at least one item are required.' });
    return;
  }

  if (!/^\d{10}$/.test(String(phone).trim())) {
    res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    return;
  }

  if (!/^\d{6}$/.test(String(pincode).trim())) {
    res.status(400).json({ error: 'Please enter a valid 6-digit Indian pincode.' });
    return;
  }

  const normalizedMethod =
    paymentMethod === 'partial_cod'
      ? 'partial_cod'
      : paymentMethod === 'cod'
      ? 'cod'
      : 'prepaid';

  // Verify payment signature on backend for prepaid and partial_cod orders
  if (normalizedMethod !== 'cod') {
    if (gatewayOrderId && paymentId && signature) {
      const expected = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${gatewayOrderId}|${paymentId}`)
        .digest('hex');
      if (expected !== signature) {
        res.status(400).json({ error: 'Payment signature verification failed.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Payment verification required before placing order.' });
      return;
    }
  }

  // Compute server-authoritative pricing & decrement variant stock
  let subtotal = 0;
  for (const item of items) {
    if (item.kind === 'sample_kit') {
      subtotal += 499 * (Number(item.quantity) || 1);
    } else {
      const product = db.products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (!product || !variant) {
        res.status(400).json({ error: `Selected variant for ${item.name} is unavailable.` });
        return;
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (product.isOutOfStock || variant.stock < qty) {
        res.status(400).json({ error: `${product.name} (${variant.label}) is out of stock.` });
        return;
      }
      variant.stock -= qty;
      if (product.variants.every((v) => v.stock <= 0)) {
        product.isOutOfStock = true;
      }
      subtotal += variant.price * qty;
    }
  }

  let couponDiscount = 0;
  let validCouponCode: string | undefined;
  if (couponCode) {
    const coupon = db.coupons.find(
      (c) => c.code.toUpperCase() === String(couponCode).trim().toUpperCase() && c.isActive
    );
    if (coupon && subtotal >= coupon.minOrder) {
      validCouponCode = coupon.code;
      couponDiscount =
        coupon.discountType === 'percent'
          ? Math.round((subtotal * coupon.value) / 100)
          : Math.min(subtotal, coupon.value);
    }
  }

  const afterCoupon = Math.max(0, subtotal - couponDiscount);
  const method = normalizedMethod;
  const prepaidDiscount = method === 'prepaid' ? Math.round(afterCoupon * 0.05) : 0;
  const discountedSubtotal = Math.max(0, afterCoupon - prepaidDiscount);
  const shippingFee = discountedSubtotal >= 999 ? 0 : 79;
  const total = discountedSubtotal + shippingFee;

  const advancePaid =
    method === 'prepaid' ? total : method === 'partial_cod' ? Math.min(total, 99) : 0;
  const balanceDue = Math.max(0, total - advancePaid);

  const now = new Date().toISOString();
  const order: Order = {
    id: generateOrderId(),
    customerName: String(customerName).trim(),
    phone: String(phone).trim(),
    address: String(address).trim(),
    city: String(city).trim(),
    pincode: String(pincode).trim(),
    items: items.map((item) => ({
      name: item.name,
      subtitle: item.subtitle,
      price: item.kind === 'sample_kit' ? 499 : item.price,
      quantity: Math.max(1, Number(item.quantity) || 1),
      image: item.image,
      productId: item.productId,
      variantId: item.variantId,
      kitItems: item.kitItems,
    })),
    subtotal,
    couponCode: validCouponCode,
    couponDiscount,
    prepaidDiscount,
    shippingFee,
    total,
    paymentMethod: method,
    advancePaid,
    balanceDue,
    paymentStatus:
      method === 'prepaid' ? 'Paid' : method === 'partial_cod' ? 'Partial COD' : 'COD Pending',
    paymentRef: method === 'cod' ? undefined : paymentId,
    orderStatus: 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  db.orders.unshift(order);
  saveDb();

  res.status(201).json({ order });
});

app.get('/api/orders/track', (req, res) => {
  const db = getDb();
  const query = String(req.query.query || '').trim().toUpperCase();
  if (!query) {
    res.status(400).json({ error: 'Please enter an Order ID or 10-digit phone number.' });
    return;
  }

  const matches = db.orders.filter(
    (o) => o.id.toUpperCase() === query || o.phone === query.replace(/\s+/g, '')
  );

  if (matches.length === 0) {
    res.status(404).json({ error: `No order found matching "${req.query.query}".` });
    return;
  }

  res.json({ orders: matches });
});

// --- Admin Authentication & Seller Dashboard APIs ---
app.post('/api/admin/login', (req, res) => {
  const password = String(req.body.password || '');
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid admin password.' });
    return;
  }
  const token = createAdminToken();
  res.json({ token });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const db = getDb();
  const token = req.headers.authorization?.slice(7);
  if (token) {
    delete db.adminSessions[token];
    saveDb();
  }
  res.json({ ok: true });
});

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const db = getDb();
  const totalRevenue = db.orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const advanceCollected = db.orders
    .filter((o) => o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + o.advancePaid, 0);
  const pendingOrders = db.orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Packed').length;
  const lowStockCount = db.products.filter(
    (p) => p.isOutOfStock || p.variants.some((v) => v.stock <= 5)
  ).length;

  res.json({
    products: db.products,
    orders: db.orders,
    coupons: db.coupons,
    kpis: {
      totalRevenue,
      advanceCollected,
      totalOrders: db.orders.length,
      pendingOrders,
      lowStockCount,
    },
  });
});

app.post('/api/admin/upload', requireAdmin, (req, res) => {
  const { dataUrl, filename } = req.body;
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'Please select a valid image file.' });
    return;
  }

  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) {
    res.status(400).json({ error: 'Unsupported image format. Use JPG, PNG, or WebP.' });
    return;
  }

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const baseName = String(filename || 'perfume')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 30);
  const savedName = `${baseName || 'perfume'}-${Date.now()}.${ext}`;
  const outPath = path.join(getUploadsDir(), savedName);
  fs.writeFileSync(outPath, Buffer.from(match[2], 'base64'));

  res.json({ url: `/uploads/${savedName}` });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const db = getDb();
  const body = req.body;
  if (!body.name || !Array.isArray(body.variants) || body.variants.length === 0) {
    res.status(400).json({ error: 'Product name and at least one ML variant are required.' });
    return;
  }

  const slug = String(body.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const product: Product = {
    id: `prod-${Date.now()}`,
    name: String(body.name).trim(),
    slug: `${slug}-${Date.now().toString().slice(-4)}`,
    tagline: String(body.tagline || 'Small-batch artisanal fragrance').trim(),
    description: String(body.description || 'Crafted in pure oil concentration for enduring sillage.').trim(),
    type: body.type === 'Perfume' ? 'Perfume' : 'Attar',
    scentFamily: body.scentFamily || 'Oud',
    occasion: body.occasion || 'Party',
    gender: body.gender || 'Unisex',
    images:
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : ['/src/assets/images/product_royal_oud_1795085479966.jpg'],
    variants: body.variants.map((v: { label: string; price: number; compareAtPrice?: number; stock: number; sku?: string }, idx: number) => ({
      id: `v-${Date.now()}-${idx}`,
      label: String(v.label || '6ml'),
      price: Number(v.price) || 499,
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
      stock: Number(v.stock) || 10,
      sku: String(v.sku || `PKZ-${Date.now().toString().slice(-4)}-${idx + 1}`),
    })),
    notes: {
      top: Array.isArray(body.notes?.top) ? body.notes.top : ['Saffron', 'Bergamot'],
      heart: Array.isArray(body.notes?.heart) ? body.notes.heart : ['Aged Oud', 'Rose'],
      base: Array.isArray(body.notes?.base) ? body.notes.base : ['Amber', 'Musk'],
    },
    longevityHours: Number(body.longevityHours) || 12,
    projectionScore: Number(body.projectionScore) || 8,
    isBestseller: Boolean(body.isBestseller),
    isOutOfStock: Boolean(body.isOutOfStock),
    createdAt: new Date().toISOString(),
  };

  db.products.unshift(product);
  saveDb();
  res.status(201).json({ product });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const existing = db.products[idx];
  const updated: Product = {
    ...existing,
    ...req.body,
    id: existing.id,
    createdAt: existing.createdAt,
  };
  db.products[idx] = updated;
  saveDb();
  res.json({ product: updated });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDb();
  res.json({ ok: true });
});

app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  if (req.body.orderStatus) order.orderStatus = req.body.orderStatus;
  if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
  if (req.body.courierName !== undefined) order.courierName = req.body.courierName;
  if (req.body.trackingNumber !== undefined) order.trackingNumber = req.body.trackingNumber;
  if (req.body.trackingUrl !== undefined) order.trackingUrl = req.body.trackingUrl;
  order.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ order });
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const db = getDb();
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'Coupon code is required.' });
    return;
  }
  const existingIdx = db.coupons.findIndex((c) => c.code === code);
  const coupon: Coupon = {
    code,
    discountType: req.body.discountType === 'flat' ? 'flat' : 'percent',
    value: Math.max(1, Number(req.body.value) || 10),
    minOrder: Math.max(0, Number(req.body.minOrder) || 0),
    isActive: req.body.isActive !== false,
    description: String(req.body.description || `${code} promotional discount`),
  };
  if (existingIdx >= 0) {
    db.coupons[existingIdx] = coupon;
  } else {
    db.coupons.unshift(coupon);
  }
  saveDb();
  res.status(201).json({ coupon });
});

app.put('/api/admin/coupons/:code', requireAdmin, (req, res) => {
  const db = getDb();
  const coupon = db.coupons.find((c) => c.code === req.params.code);
  if (!coupon) {
    res.status(404).json({ error: 'Coupon not found' });
    return;
  }
  if (typeof req.body.isActive === 'boolean') coupon.isActive = req.body.isActive;
  saveDb();
  res.json({ coupon });
});

app.delete('/api/admin/coupons/:code', requireAdmin, (req, res) => {
  const db = getDb();
  db.coupons = db.coupons.filter((c) => c.code !== req.params.code);
  saveDb();
  res.json({ ok: true });
});

// --- Vite Dev Middleware & Production Static Server ---
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    app.get(['/admin', '/admin/', '/admin.html'], async (req, res, next) => {
      try {
        const rawHtml = fs.readFileSync(path.resolve(process.cwd(), 'admin.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get(['/admin', '/admin/', '/admin.html'], (_req, res) => {
      res.sendFile(path.join(distDir, 'admin.html'));
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Pakeeza Perfumez server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
