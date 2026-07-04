# LuxeMatch Database Schema

Live schema from Supabase project `xcvlswahgglygqfewolf`. Generated from `information_schema.columns`.

## Tables

### Manufacturer Layer
- [manufacturers](./manufacturers.md) — Manufacturer accounts
- [manufacturer_products](./manufacturer_products.md) — Global wholesale catalog
- [manufacturer_product_images](./manufacturer_product_images.md) — Catalog + try-on images
- [manufacturer_product_embeddings](./manufacturer_product_embeddings.md) — Qdrant indexing state

### Store / B2B Layer
- [stores](./stores.md) — Store login accounts linked to jeweller tenants
- [b2b_orders](./b2b_orders.md) — Store restock orders to manufacturer
- [b2b_order_items](./b2b_order_items.md) — B2B order line items
- [b2b_order_status_history](./b2b_order_status_history.md) — B2B order audit trail

### Guest / Kiosk Orders
- [guest_orders](./guest_orders.md) — Walk-in customer kiosk orders
- [guest_order_items](./guest_order_items.md) — Kiosk order line items
- [guest_order_status_history](./guest_order_status_history.md) — Kiosk order audit trail

### Store Inventory / Storefront
- [jewellers](./jewellers.md) — Store tenant identity (auto-created per store)
- [products](./products.md) — Store inventory (fulfilled from manufacturer catalog)
- [product_images](./product_images.md) — Store product photos
- [product_tryon_assets](./product_tryon_assets.md) — AR try-on PNG assets
- [product_embeddings](./product_embeddings.md) — Store Qdrant indexing state

### Customer (Legacy / Deprecated)
- [customers](./customers.md) — Per-jeweller customer accounts (deprecated for B2B kiosk)
- [customer_addresses](./customer_addresses.md) — Saved delivery addresses
- [customer_otps](./customer_otps.md) — Legacy phone OTP table
- [cart_items](./cart_items.md) — Customer cart (per jeweller)
- [orders](./orders.md) — Customer orders (legacy, pre-B2B)
- [order_items](./order_items.md) — Customer order line items
- [order_status_history](./order_status_history.md) — Customer order audit trail

### Catalog Taxonomy
- [categories](./categories.md) — Global product categories
- [collections](./collections.md) — Per-jeweller curated collections
- [branches](./branches.md) — Store pickup branches

### Intelligence / Analytics
- [analytics_events](./analytics_events.md) — Customer behaviour events
- [inventory_signals](./inventory_signals.md) — Rolled-up demand signals (7d windows)
- [pin_audit_events](./pin_audit_events.md) — PIN login audit trail

### Other
- [brands](./brands.md) — Brand lookup table
- [product_views](./product_views.md) — Product view counter
- [product_sales](./product_sales.md) — Product sale records
- [tryon_events](./tryon_events.md) — Try-on session events
