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
export { getShopAnalytics, type ShopAnalytics } from './analytics';

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

export { logSearchEvent, type SearchEventInput } from './events';

export {
  getDashboardSummary,
  getProductDemandSnapshots,
  type DashboardSummary,
} from './intelligence';

export { listTryOnProducts, type TryOnProduct } from './tryon';

export const PACKAGE_NAME = '@luxematch/db';
