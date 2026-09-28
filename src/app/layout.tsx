import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenWrt MAC Access Manager',
  description: 'Production-ready MAC-address internet access control and configuration publisher for OpenWrt',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
