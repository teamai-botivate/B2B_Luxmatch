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
  getOrCreateCustomer, getCustomerById, getCustomerByEmail, updateCustomerName, updateCustomerAvatar,
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

export { listTryOnProducts, listManufacturerTryOnProducts, type TryOnProduct } from './tryon';

export {
  getManufacturerByEmail,
  getManufacturerById,
  verifyManufacturerPassword,
  addManufacturerTryOnAsset,
  removeManufacturerTryOnAsset,
  getManufacturerTryOnAsset,
  type ManufacturerRow,
  type ManufacturerPublic,
  type ManufacturerTryOnAssetInput,
} from './manufacturers';

export {
  getStoreByEmail,
  getStoreById,
  getStoreByJewellerId,
  verifyStorePassword,
  listStoresByManufacturer,
  createStore,
  updateStoreStatus,
  updateStore,
  updateStorePassword,
  deleteStore,
  selfRegisterStore,
  listPendingStores,
  approveStoreRegistration,
  rejectStoreRegistration,
  formatStoreFixedAddress,
  type StoreRow,
  type StorePublic,
  type RegistrationStatus,
  type CreateStoreInput,
  type UpdateStoreInput,
  type SelfRegisterStoreInput,
} from './stores';

export {
  listManufacturerProducts,
  getManufacturerProductById,
  getManufacturerProductByDesignNumberOrId,
  createManufacturerProduct,
  updateManufacturerProduct,
  deleteManufacturerProduct,
  addManufacturerProductImage,
  removeManufacturerProductImage,
  trackManufacturerProductEmbedding,
  isManufacturerProductEmbedded,
  placeB2BOrder,
  getB2BOrdersByStore,
  getB2BOrdersByManufacturer,
  getB2BOrderWithItems,
  updateB2BOrderStatus,
  fulfillB2BOrder,
  approveB2BOrder,
  rejectB2BOrder,
  getB2BOrdersPendingByStore,
  type ManufacturerProductRow,
  type ManufacturerProductImageRow,
  type ManufacturerProductWithImages,
  type ManufacturerProductFilters,
  type CreateManufacturerProductInput,
  type UpdateManufacturerProductInput,
  type ManufacturerProductStatus,
  type B2BOrderRow,
  type B2BOrderItemRow,
  type B2BOrderStatusHistoryRow,
  type B2BOrderWithItems,
  type B2BOrderStatus,
  type PlaceB2BOrderInput,
  type FulfillB2BOrderResult,
} from './b2b';

export {
  placeGuestOrder,
  updateGuestOrderStatus,
  getGuestOrdersByStore,
  getGuestOrdersByManufacturer,
  getGuestOrderWithItems,
  getGuestOrdersByStorePending,
  approveKioskOrder,
  rejectKioskOrder,
  getStoreBranding,
  updateStoreBranding,
  type GuestOrderRow,
  type GuestOrderItemRow,
  type GuestOrderStatusHistoryRow,
  type GuestOrderWithItems,
  type GuestOrderStatus,
  type GuestOrderSource,
  type PlaceGuestOrderInput,
  type PlaceGuestOrderItemInput,
  type StoreBranding,
  type StoreProfile,
} from './guest-orders';

export {
  getStoreManagerByEmail,
  getStoreManagerByEmailGlobal,
  getStoreManagerById,
  listStoreManagers,
  createStoreManager,
  updateStoreManager,
  deleteStoreManager,
  updateStoreManagerPassword,
  type StoreManagerRow,
  type StoreManagerPublic,
  type CreateStoreManagerInput,
  type UpdateStoreManagerInput,
} from './store-managers';

export {
  placeCustomDesignRequest,
  listCustomDesignRequests,
  getCustomDesignRequest,
  approveCustomDesignRequest,
  rejectCustomDesignRequest,
  forwardCustomDesignToManufacturer,
  listCustomDesignOrdersByManufacturer,
  listCustomDesignOrdersByStore,
  updateCustomDesignOrderStatus,
  type CustomDesignStatus,
  type CustomDesignOrderStatus,
  type CustomDesignRequestRow,
  type CustomDesignRequestWithOrder,
  type CustomDesignOrderRow,
  type PlaceCustomDesignRequestInput,
} from './custom-design';

export {
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  type PasswordResetRole,
  type PasswordResetTokenRow,
} from './password-reset';

export const PACKAGE_NAME = '@luxematch/db';
