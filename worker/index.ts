import seedData from '../data/paakeezah.db.json';
import type { Coupon, Order, Product, Review } from '../src/types';

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  IMAGES?: R2Bucket;
  ADMIN_PASSWORD?: string;
  RAZORPAY_KEY_SECRET?: string;
}

let dbInitialized = false;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureDbReady(db: D1Database): Promise<void> {
  if (dbInitialized) return;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, phone TEXT NOT NULL, order_status TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, data TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, created_at TEXT NOT NULL)`),
  ]);

  const seeded = await db.prepare(`SELECT value FROM meta WHERE key = 'seeded'`).first<{ value: string }>();
  if (!seeded) {
    const stmts: D1PreparedStatement[] = [];
    for (const p of seedData.products as Product[]) {
      stmts.push(
        db
          .prepare(`INSERT OR IGNORE INTO products (id, slug, data, created_at) VALUES (?, ?, ?, ?)`)
          .bind(p.id, p.slug, JSON.stringify(p), p.createdAt || new Date().toISOString())
      );
    }
    for (const o of seedData.orders as Order[]) {
      stmts.push(
        db
          .prepare(`INSERT OR IGNORE INTO orders (id, phone, order_status, data, created_at) VALUES (?, ?, ?, ?, ?)`)
          .bind(o.id, o.phone, o.orderStatus, JSON.stringify(o), o.createdAt || new Date().toISOString())
      );
    }
    for (const c of seedData.coupons as Coupon[]) {
      stmts.push(
        db.prepare(`INSERT OR IGNORE INTO coupons (code, data) VALUES (?, ?)`).bind(c.code.toUpperCase(), JSON.stringify(c))
      );
    }
    for (const r of seedData.reviews as Review[]) {
      stmts.push(
        db
          .prepare(`INSERT OR IGNORE INTO reviews (id, product_id, data, created_at) VALUES (?, ?, ?, ?)`)
          .bind(r.id, r.productId, JSON.stringify(r), r.createdAt || new Date().toISOString())
      );
    }
    stmts.push(db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', '1')`));
    await db.batch(stmts);
  }

  dbInitialized = true;
}

async function getAllProducts(db: D1Database): Promise<Product[]> {
  const { results } = await db.prepare(`SELECT data FROM products ORDER BY created_at DESC`).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as Product);
}

async function getAllOrders(db: D1Database): Promise<Order[]> {
  const { results } = await db.prepare(`SELECT data FROM orders ORDER BY created_at DESC`).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as Order);
}

async function getAllCoupons(db: D1Database): Promise<Coupon[]> {
  const { results } = await db.prepare(`SELECT data FROM coupons`).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as Coupon);
}

async function getAllReviews(db: D1Database): Promise<Review[]> {
  const { results } = await db.prepare(`SELECT data FROM reviews ORDER BY created_at DESC`).all<{ data: string }>();
  return results.map((r) => JSON.parse(r.data) as Review);
}

async function verifyAdmin(request: Request, db: D1Database): Promise<string | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const row = await db.prepare(`SELECT token FROM admin_sessions WHERE token = ?`).bind(token).first<{ token: string }>();
  return row ? token : null;
}

async function generateOrderId(db: D1Database): Promise<string> {
  const { results } = await db.prepare(`SELECT id FROM orders`).all<{ id: string }>();
  let maxNum = 1000;
  for (const row of results) {
    const match = row.id.match(/^PKZ-(\d+)$/i);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return `PKZ-${maxNum + 1}`;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  await ensureDbReady(env.DB);
  const { pathname } = url;
  const method = request.method;
  const adminPassword = env.ADMIN_PASSWORD || 'paakeezah2026';
  const razorpaySecret = env.RAZORPAY_KEY_SECRET || 'paakeezah_demo_secret_key';

  // --- Public Storefront APIs ---
  if (method === 'GET' && pathname === '/api/health') {
    return json({
      status: 'ok',
      brand: 'Pakeeza Perfumez',
      runtime: 'cloudflare-d1',
      r2Connected: Boolean(env.IMAGES),
    });
  }

  if (method === 'GET' && pathname === '/api/products') {
    const [products, reviews] = await Promise.all([getAllProducts(env.DB), getAllReviews(env.DB)]);
    const search = (url.searchParams.get('q') || '').trim().toLowerCase();
    const family = (url.searchParams.get('family') || '').trim();
    const occasion = (url.searchParams.get('occasion') || '').trim();
    const gender = (url.searchParams.get('gender') || '').trim();

    let list = products;
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
    if (family && family !== 'All') list = list.filter((p) => p.scentFamily === family);
    if (occasion && occasion !== 'All') list = list.filter((p) => p.occasion === occasion);
    if (gender && gender !== 'All') list = list.filter((p) => p.gender === gender);

    return json({ products: list, reviews });
  }

  if (method === 'GET' && pathname.startsWith('/api/products/')) {
    const key = decodeURIComponent(pathname.slice('/api/products/'.length));
    const row = await env.DB
      .prepare(`SELECT data FROM products WHERE id = ? OR slug = ? LIMIT 1`)
      .bind(key, key)
      .first<{ data: string }>();
    if (!row) return json({ error: 'Fragrance not found' }, 404);
    const product = JSON.parse(row.data) as Product;
    const { results } = await env.DB
      .prepare(`SELECT data FROM reviews WHERE product_id = ? ORDER BY created_at DESC`)
      .bind(product.id)
      .all<{ data: string }>();
    return json({ product, reviews: results.map((r) => JSON.parse(r.data) as Review) });
  }

  if (method === 'POST' && pathname === '/api/reviews') {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.productId || !body.authorName || !body.comment) {
      return json({ error: 'Product, name, and review comment are required.' }, 400);
    }
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      productId: String(body.productId),
      authorName: String(body.authorName).trim(),
      city: String(body.city || 'India').trim(),
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      comment: String(body.comment).trim(),
      verified: true,
      createdAt: new Date().toISOString(),
    };
    await env.DB
      .prepare(`INSERT INTO reviews (id, product_id, data, created_at) VALUES (?, ?, ?, ?)`)
      .bind(newReview.id, newReview.productId, JSON.stringify(newReview), newReview.createdAt)
      .run();
    return json({ review: newReview }, 201);
  }

  if (method === 'POST' && pathname === '/api/coupons/validate') {
    const body = (await request.json()) as Record<string, unknown>;
    const code = String(body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal) || 0;
    if (!code) return json({ error: 'Please enter a promo code.' }, 400);

    const row = await env.DB.prepare(`SELECT data FROM coupons WHERE code = ?`).bind(code).first<{ data: string }>();
    const coupon = row ? (JSON.parse(row.data) as Coupon) : null;
    if (!coupon || !coupon.isActive) return json({ error: 'Invalid or expired promo code.' }, 404);
    if (subtotal < coupon.minOrder) {
      return json({ error: `Minimum order of ₹${coupon.minOrder} required for ${coupon.code}.` }, 400);
    }
    const discount =
      coupon.discountType === 'percent'
        ? Math.round((subtotal * coupon.value) / 100)
        : Math.min(subtotal, coupon.value);
    return json({ coupon, discount });
  }

  // --- Payment & Order Creation ---
  if (method === 'POST' && pathname === '/api/payments/create-intent') {
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount) || 0;
    if (amount <= 0) return json({ error: 'Invalid payment amount' }, 400);

    const gatewayOrderId = `order_rzp_${randomHex(6)}`;
    const paymentId = `pay_rzp_${randomHex(6)}`;
    const signature = await hmacSha256Hex(razorpaySecret, `${gatewayOrderId}|${paymentId}`);

    return json({
      gatewayOrderId,
      paymentId,
      signature,
      amountInPaise: Math.round(amount * 100),
      currency: 'INR',
    });
  }

  if (method === 'POST' && pathname === '/api/orders') {
    const body = (await request.json()) as Record<string, unknown>;
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
    } = body;

    if (!customerName || !phone || !address || !city || !pincode || !Array.isArray(items) || items.length === 0) {
      return json({ error: 'All shipping fields and at least one item are required.' }, 400);
    }
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return json({ error: 'Please enter a valid 10-digit mobile number.' }, 400);
    }
    if (!/^\d{6}$/.test(String(pincode).trim())) {
      return json({ error: 'Please enter a valid 6-digit Indian pincode.' }, 400);
    }

    const normalizedMethod =
      paymentMethod === 'partial_cod' ? 'partial_cod' : paymentMethod === 'cod' ? 'cod' : 'prepaid';

    if (normalizedMethod !== 'cod') {
      if (gatewayOrderId && paymentId && signature) {
        const expected = await hmacSha256Hex(razorpaySecret, `${gatewayOrderId}|${paymentId}`);
        if (expected !== signature) {
          return json({ error: 'Payment signature verification failed.' }, 400);
        }
      } else {
        return json({ error: 'Payment verification required before placing order.' }, 400);
      }
    }

    const products = await getAllProducts(env.DB);
    const updatedProducts = new Map<string, Product>();
    let subtotal = 0;

    for (const rawItem of items as Array<Record<string, unknown>>) {
      if (rawItem.kind === 'sample_kit') {
        subtotal += 499 * Math.max(1, Number(rawItem.quantity) || 1);
      } else {
        const product = products.find((p) => p.id === rawItem.productId);
        const variant = product?.variants.find((v) => v.id === rawItem.variantId);
        if (!product || !variant) {
          return json({ error: `Selected variant for ${String(rawItem.name)} is unavailable.` }, 400);
        }
        const qty = Math.max(1, Number(rawItem.quantity) || 1);
        if (product.isOutOfStock || variant.stock < qty) {
          return json({ error: `${product.name} (${variant.label}) is out of stock.` }, 400);
        }
        variant.stock -= qty;
        if (product.variants.every((v) => v.stock <= 0)) {
          product.isOutOfStock = true;
        }
        updatedProducts.set(product.id, product);
        subtotal += variant.price * qty;
      }
    }

    let couponDiscount = 0;
    let validCouponCode: string | undefined;
    if (couponCode) {
      const cRow = await env.DB
        .prepare(`SELECT data FROM coupons WHERE code = ?`)
        .bind(String(couponCode).trim().toUpperCase())
        .first<{ data: string }>();
      const coupon = cRow ? (JSON.parse(cRow.data) as Coupon) : null;
      if (coupon && coupon.isActive && subtotal >= coupon.minOrder) {
        validCouponCode = coupon.code;
        couponDiscount =
          coupon.discountType === 'percent'
            ? Math.round((subtotal * coupon.value) / 100)
            : Math.min(subtotal, coupon.value);
      }
    }

    const afterCoupon = Math.max(0, subtotal - couponDiscount);
    const prepaidDiscount = normalizedMethod === 'prepaid' ? Math.round(afterCoupon * 0.05) : 0;
    const discountedSubtotal = Math.max(0, afterCoupon - prepaidDiscount);
    const shippingFee = discountedSubtotal >= 999 ? 0 : 79;
    const total = discountedSubtotal + shippingFee;
    const advancePaid =
      normalizedMethod === 'prepaid' ? total : normalizedMethod === 'partial_cod' ? Math.min(total, 99) : 0;
    const balanceDue = Math.max(0, total - advancePaid);

    const now = new Date().toISOString();
    const order: Order = {
      id: await generateOrderId(env.DB),
      customerName: String(customerName).trim(),
      phone: String(phone).trim(),
      address: String(address).trim(),
      city: String(city).trim(),
      pincode: String(pincode).trim(),
      items: (items as Array<Record<string, unknown>>).map((item) => ({
        name: String(item.name),
        subtitle: String(item.subtitle || ''),
        price: item.kind === 'sample_kit' ? 499 : Number(item.price),
        quantity: Math.max(1, Number(item.quantity) || 1),
        image: String(item.image || ''),
        productId: item.productId ? String(item.productId) : undefined,
        variantId: item.variantId ? String(item.variantId) : undefined,
        kitItems: item.kitItems as Order['items'][number]['kitItems'],
      })),
      subtotal,
      couponCode: validCouponCode,
      couponDiscount,
      prepaidDiscount,
      shippingFee,
      total,
      paymentMethod: normalizedMethod,
      advancePaid,
      balanceDue,
      paymentStatus:
        normalizedMethod === 'prepaid' ? 'Paid' : normalizedMethod === 'partial_cod' ? 'Partial COD' : 'COD Pending',
      paymentRef: normalizedMethod === 'cod' ? undefined : String(paymentId),
      orderStatus: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    const stmts: D1PreparedStatement[] = [
      env.DB
        .prepare(`INSERT INTO orders (id, phone, order_status, data, created_at) VALUES (?, ?, ?, ?, ?)`)
        .bind(order.id, order.phone, order.orderStatus, JSON.stringify(order), order.createdAt),
    ];
    for (const prod of updatedProducts.values()) {
      stmts.push(env.DB.prepare(`UPDATE products SET data = ? WHERE id = ?`).bind(JSON.stringify(prod), prod.id));
    }
    await env.DB.batch(stmts);

    return json({ order }, 201);
  }

  if (method === 'GET' && pathname === '/api/orders/track') {
    const rawQuery = (url.searchParams.get('query') || '').trim();
    const query = rawQuery.toUpperCase();
    if (!query) return json({ error: 'Please enter an Order ID or 10-digit phone number.' }, 400);

    const cleanPhone = query.replace(/\s+/g, '');
    const { results } = await env.DB
      .prepare(`SELECT data FROM orders WHERE UPPER(id) = ? OR phone = ? ORDER BY created_at DESC`)
      .bind(query, cleanPhone)
      .all<{ data: string }>();

    if (results.length === 0) {
      return json({ error: `No order found matching "${rawQuery}".` }, 404);
    }
    return json({ orders: results.map((r) => JSON.parse(r.data) as Order) });
  }

  // --- Admin Authentication & Seller Dashboard APIs ---
  if (method === 'POST' && pathname === '/api/admin/login') {
    const body = (await request.json()) as Record<string, unknown>;
    if (String(body.password || '') !== adminPassword) {
      return json({ error: 'Invalid admin password.' }, 401);
    }
    const token = randomHex(24);
    await env.DB
      .prepare(`INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)`)
      .bind(token, new Date().toISOString())
      .run();
    return json({ token });
  }

  if (pathname.startsWith('/api/admin/')) {
    const token = await verifyAdmin(request, env.DB);
    if (!token) {
      return json({ error: 'Unauthorized admin session. Please sign in again.' }, 401);
    }

    if (method === 'POST' && pathname === '/api/admin/logout') {
      await env.DB.prepare(`DELETE FROM admin_sessions WHERE token = ?`).bind(token).run();
      return json({ ok: true });
    }

    if (method === 'GET' && pathname === '/api/admin/dashboard') {
      const [products, orders, coupons] = await Promise.all([
        getAllProducts(env.DB),
        getAllOrders(env.DB),
        getAllCoupons(env.DB),
      ]);
      const activeOrders = orders.filter((o) => o.orderStatus !== 'Cancelled');
      const totalRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
      const advanceCollected = activeOrders.reduce((sum, o) => sum + o.advancePaid, 0);
      const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Packed').length;
      const lowStockCount = products.filter(
        (p) => p.isOutOfStock || p.variants.some((v) => v.stock <= 5)
      ).length;

      return json({
        products,
        orders,
        coupons,
        kpis: {
          totalRevenue,
          advanceCollected,
          totalOrders: orders.length,
          pendingOrders,
          lowStockCount,
        },
      });
    }

    // --- Phase 2: Cloudflare R2 Product Image Upload ---
    if (method === 'POST' && pathname === '/api/admin/upload') {
      const body = (await request.json()) as Record<string, unknown>;
      const dataUrl = body.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return json({ error: 'Please select a valid image file.' }, 400);
      }

      const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
      if (!match) {
        return json({ error: 'Unsupported image format. Use JPG, PNG, or WebP.' }, 400);
      }

      if (!env.IMAGES) {
        return json({ error: 'R2 IMAGES bucket is not connected yet.' }, 500);
      }

      const contentType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
      const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
      const baseName = String(body.filename || 'perfume')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 30);
      const key = `${baseName || 'perfume'}-${Date.now()}.${ext}`;

      const binary = atob(match[3]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      await env.IMAGES.put(key, bytes, { httpMetadata: { contentType } });
      return json({ url: `/uploads/${key}` });
    }

    if (method === 'POST' && pathname === '/api/admin/products') {
      const body = (await request.json()) as Record<string, unknown>;
      const variants = body.variants as Array<Record<string, unknown>> | undefined;
      if (!body.name || !Array.isArray(variants) || variants.length === 0) {
        return json({ error: 'Product name and at least one ML variant are required.' }, 400);
      }
      const slug = String(body.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const notes = (body.notes as Record<string, unknown>) || {};
      const product: Product = {
        id: `prod-${Date.now()}`,
        name: String(body.name).trim(),
        slug: `${slug}-${Date.now().toString().slice(-4)}`,
        tagline: String(body.tagline || 'Small-batch artisanal fragrance').trim(),
        description: String(body.description || 'Crafted in pure oil concentration for enduring sillage.').trim(),
        type: body.type === 'Perfume' ? 'Perfume' : 'Attar',
        scentFamily: (body.scentFamily as Product['scentFamily']) || 'Oud',
        occasion: (body.occasion as Product['occasion']) || 'Party',
        gender: (body.gender as Product['gender']) || 'Unisex',
        images:
          Array.isArray(body.images) && body.images.length > 0
            ? (body.images as string[])
            : ['/src/assets/images/product_royal_oud_1795085479966.jpg'],
        variants: variants.map((v, idx) => ({
          id: `v-${Date.now()}-${idx}`,
          label: String(v.label || '6ml'),
          price: Number(v.price) || 499,
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
          stock: Number(v.stock) || 10,
          sku: String(v.sku || `PKZ-${Date.now().toString().slice(-4)}-${idx + 1}`),
        })),
        notes: {
          top: Array.isArray(notes.top) ? (notes.top as string[]) : ['Saffron', 'Bergamot'],
          heart: Array.isArray(notes.heart) ? (notes.heart as string[]) : ['Aged Oud', 'Rose'],
          base: Array.isArray(notes.base) ? (notes.base as string[]) : ['Amber', 'Musk'],
        },
        longevityHours: Number(body.longevityHours) || 12,
        projectionScore: Number(body.projectionScore) || 8,
        isBestseller: Boolean(body.isBestseller),
        isOutOfStock: Boolean(body.isOutOfStock),
        createdAt: new Date().toISOString(),
      };
      await env.DB
        .prepare(`INSERT INTO products (id, slug, data, created_at) VALUES (?, ?, ?, ?)`)
        .bind(product.id, product.slug, JSON.stringify(product), product.createdAt)
        .run();
      return json({ product }, 201);
    }

    if (pathname.startsWith('/api/admin/products/')) {
      const id = decodeURIComponent(pathname.slice('/api/admin/products/'.length));
      if (method === 'PUT') {
        const row = await env.DB.prepare(`SELECT data FROM products WHERE id = ?`).bind(id).first<{ data: string }>();
        if (!row) return json({ error: 'Product not found' }, 404);
        const existing = JSON.parse(row.data) as Product;
        const body = (await request.json()) as Partial<Product>;
        const updated: Product = { ...existing, ...body, id: existing.id, createdAt: existing.createdAt };
        await env.DB
          .prepare(`UPDATE products SET slug = ?, data = ? WHERE id = ?`)
          .bind(updated.slug, JSON.stringify(updated), id)
          .run();
        return json({ product: updated });
      }
      if (method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
        return json({ ok: true });
      }
    }

    if (method === 'PUT' && pathname.startsWith('/api/admin/orders/')) {
      const id = decodeURIComponent(pathname.slice('/api/admin/orders/'.length));
      const row = await env.DB.prepare(`SELECT data FROM orders WHERE id = ?`).bind(id).first<{ data: string }>();
      if (!row) return json({ error: 'Order not found' }, 404);
      const order = JSON.parse(row.data) as Order;
      const body = (await request.json()) as Partial<Order>;
      if (body.orderStatus) order.orderStatus = body.orderStatus;
      if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
      if (body.courierName !== undefined) order.courierName = body.courierName;
      if (body.trackingNumber !== undefined) order.trackingNumber = body.trackingNumber;
      if (body.trackingUrl !== undefined) order.trackingUrl = body.trackingUrl;
      order.updatedAt = new Date().toISOString();
      await env.DB
        .prepare(`UPDATE orders SET order_status = ?, data = ? WHERE id = ?`)
        .bind(order.orderStatus, JSON.stringify(order), id)
        .run();
      return json({ order });
    }

    if (method === 'POST' && pathname === '/api/admin/coupons') {
      const body = (await request.json()) as Record<string, unknown>;
      const code = String(body.code || '').trim().toUpperCase();
      if (!code) return json({ error: 'Coupon code is required.' }, 400);
      const coupon: Coupon = {
        code,
        discountType: body.discountType === 'flat' ? 'flat' : 'percent',
        value: Math.max(1, Number(body.value) || 10),
        minOrder: Math.max(0, Number(body.minOrder) || 0),
        isActive: body.isActive !== false,
        description: String(body.description || `${code} promotional discount`),
      };
      await env.DB
        .prepare(`INSERT OR REPLACE INTO coupons (code, data) VALUES (?, ?)`)
        .bind(code, JSON.stringify(coupon))
        .run();
      return json({ coupon }, 201);
    }

    if (pathname.startsWith('/api/admin/coupons/')) {
      const code = decodeURIComponent(pathname.slice('/api/admin/coupons/'.length)).toUpperCase();
      if (method === 'PUT') {
        const row = await env.DB.prepare(`SELECT data FROM coupons WHERE code = ?`).bind(code).first<{ data: string }>();
        if (!row) return json({ error: 'Coupon not found' }, 404);
        const coupon = JSON.parse(row.data) as Coupon;
        const body = (await request.json()) as { isActive?: boolean };
        if (typeof body.isActive === 'boolean') coupon.isActive = body.isActive;
        await env.DB.prepare(`UPDATE coupons SET data = ? WHERE code = ?`).bind(JSON.stringify(coupon), code).run();
        return json({ coupon });
      }
      if (method === 'DELETE') {
        await env.DB.prepare(`DELETE FROM coupons WHERE code = ?`).bind(code).run();
        return json({ ok: true });
      }
    }
  }

  return json({ error: 'API route not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url);
      }

      if (url.pathname.startsWith('/uploads/')) {
        if (!env.IMAGES) return new Response('Storage not configured', { status: 500 });
        const key = decodeURIComponent(url.pathname.slice('/uploads/'.length));
        const object = await env.IMAGES.get(key);
        if (!object) return new Response('Image not found', { status: 404 });
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      if (url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/admin.html') {
        return env.ASSETS.fetch(new URL('/admin.html', request.url));
      }

      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status === 404 && !url.pathname.includes('.')) {
        return env.ASSETS.fetch(new URL('/index.html', request.url));
      }
      return assetRes;
    } catch (err) {
      return json(
        { error: err instanceof Error ? err.message : 'Internal server error' },
        500
      );
    }
  },
};