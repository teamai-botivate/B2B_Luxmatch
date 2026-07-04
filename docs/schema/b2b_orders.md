# b2b_orders

Store restock orders placed by a store owner from the manufacturer catalog.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `store_id` | uuid | NO | — | FK → stores.id |
| `jeweller_id` | uuid | NO | — | FK → jewellers.id (denormalized) |
| `manufacturer_id` | uuid | NO | — | FK → manufacturers.id |
| `order_number` | text | NO | — | Human-readable e.g. B2B-20240601-0001 |
| `status` | text | YES | 'pending' | pending/confirmed/packed/shipped/delivered/cancelled |
| `delivery_address` | text | NO | — | |
| `notes` | text | YES | — | |
| `tracking_number` | text | YES | — | Added when shipped |
| `total_items` | integer | YES | 0 | |
| `total_amount` | numeric | YES | 0 | |
| `fulfilled_at` | timestamptz | YES | — | Set when status=delivered |
| `fulfilled_product_ids` | uuid[] | YES | '{}' | Store product IDs created on fulfillment |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

## Status Flow
```
pending → confirmed → packed → shipped → delivered
                                       ↘ cancelled
```

## Notes
- Mark Delivered triggers `fulfillB2BOrder()` — creates store products, copies images + try-on assets, indexes into Qdrant
