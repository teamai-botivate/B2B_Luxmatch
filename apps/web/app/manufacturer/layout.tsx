import ManufacturerLayout from '@/components/layout/ManufacturerLayout';

export default function ManufacturerRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManufacturerLayout>{children}</ManufacturerLayout>;
}
