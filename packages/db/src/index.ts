export { getSupabaseServer } from './client';

export {
  getJewellerPublic,
  getJewellerInternal,
  updateJewellerInfo,
  updateJewellerPinHash,
  type JewellerRow,
  type JewellerPublic,
} from './jewellers';

export {
  listProducts,
  getProductBySlug,
  getProductById,
  getProductsByIds,
  fullTextSearchProducts,
  type ProductRow,
  type ProductImageRow,
  type ProductWithImages,
  type ProductListFilters,
} from './products';

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

export { listTryOnProducts, type TryOnProduct } from './tryon';

export const PACKAGE_NAME = '@luxematch/db';
