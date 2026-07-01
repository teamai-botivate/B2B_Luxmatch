import { redirect } from 'next/navigation';

export default function NewManufacturerCatalogProductPage() {
  redirect('/manufacturer/catalog?new=1');
}
