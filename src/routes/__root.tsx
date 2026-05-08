import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "BezPitcha Admin Panel" },
      { name: "description", content: "Панель управления контент-парсером BezPitcha" },
      { property: "og:title", content: "BezPitcha Admin Panel" },
      { name: "twitter:title", content: "BezPitcha Admin Panel" },
      { property: "og:description", content: "Панель управления контент-парсером BezPitcha" },
      { name: "twitter:description", content: "Панель управления контент-парсером BezPitcha" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c85174f5-b43a-49bc-809e-7e421374ac08/id-preview-75771e8a--470b7a44-b28b-4999-8ce1-397d3aae486d.lovable.app-1778266353324.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c85174f5-b43a-49bc-809e-7e421374ac08/id-preview-75771e8a--470b7a44-b28b-4999-8ce1-397d3aae486d.lovable.app-1778266353324.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  );
}
