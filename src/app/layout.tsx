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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('openwrt-theme');
                  var theme = saved;
                  if (!theme) {
                    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  document.documentElement.style.backgroundColor = theme === 'dark' ? '#050505' : '#fafafa';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
