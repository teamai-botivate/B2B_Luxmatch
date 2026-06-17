export { getSupabaseServer } from './client';

export {
  getJewellerPublic,
  getJewellerInternal,
  getJewellerSettings,
  updateJewellerInfo,
  updateJewellerPinHash,
  type JewellerRow,
  type JewellerPublic,
  type JewellerSettings,
} from './jewellers';

export {
  listProducts,
  getProductBySlug,
  getProductById,
  getProductsByIds,
  fullTextSearchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  recordProductSale,
  type ProductRow,
  type ProductImageRow,
  type ProductWithImages,
  type ProductListFilters,
  type CreateProductInput,
  type UpdateProductInput,
  type RecordSaleInput,
} from './products';

export { getShopMetrics, type ShopMetrics } from './metrics';
export { getShopAnalytics, getFunnelAnalytics, type ShopAnalytics, type FunnelAnalytics } from './analytics';

export {
  getCategories,
  getCollections,
  getCollectionBySlug,
  getCollectionProductIds,
  type CategoryRow,
  type CollectionRow,
} from './taxonomy';

export {
  addProductImage,
  removeProductImageByPublicId,
  setPrimaryProductImage,
  addTryOnAsset,
  updateTryOnAsset,
  removeTryOnAssetById,
  removeTryOnAssetByPublicId,
  type AddProductImageInput,
  type AddTryOnAssetInput,
  type TryOnAssetRow,
} from './media';

export {
  logSearchEvent,
  logAnalyticsEvent,
  logProductView,
  logTryonEvent,
  logPinAudit,
  countRecentPinFailures,
  type SearchEventInput,
  type AnalyticsEventInput,
  type ProductViewInput,
  type TryonEventInput,
  type PinAuditInput,
} from './events';

export {
  getBranches, getBranchById, type BranchRow,
} from './branches';

export {
  getOrCreateCustomer, getCustomerById, updateCustomerName,
  getCustomerAddresses, upsertCustomerAddress,
  createOtp, verifyOtp,
  type CustomerRow, type CustomerAddressRow,
} from './customers';

export {
  getCart, addToCart, updateCartItem, removeFromCart, clearCart, getCartCount,
  type CartItemWithProduct,
} from './cart';

export {
  placeOrder, getCustomerOrders, getOrderWithItems, getOrderByNumber,
  listJewellerOrders, updateOrderStatus,
  type OrderRow, type OrderItemRow, type OrderStatusHistoryRow,
  type OrderWithItems, type PlaceOrderInput, type OrderStatus,
  type JewellerOrderListItem,
} from './ecommerce';

export {
  getDashboardSummary,
  getProductDemandSnapshots,
  type DashboardSummary,
} from './intelligence';

export { listTryOnProducts, type TryOnProduct } from './tryon';

export const PACKAGE_NAME = '@luxematch/db';
