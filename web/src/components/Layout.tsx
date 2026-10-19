import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useIsFetching } from '@tanstack/react-query';
import { ChevronDownIcon, LogOutIcon, MenuIcon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSettings } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { clearSession, setStaff, useSession } from '@/lib/session';

const NAV_ITEMS = [
  { to: '/', label: '首頁' },
  { to: '/orders/new', label: '新增訂單' },
  { to: '/repairs/new', label: '新增維修' },
  { to: '/customers/new', label: '新增客人' },
];

function logout() {
  clearSession();
  queryClient.clear();
}

/** 已登入頁面的共用版面：頁首（手機為漢堡選單）＋內容 */
export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="開啟選單">
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>遊戲店 ERP</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_ITEMS.map((item) => (
                  <NavItem key={item.to} {...item} className="h-11 text-base" onClick={() => setMenuOpen(false)} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="text-lg font-semibold whitespace-nowrap">
            遊戲店 ERP
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <RefreshButton />
            <StaffMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, label, className, onClick }: { to: string; label: string; className?: string; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex h-9 items-center rounded-md px-3 text-sm hover:bg-accent',
          isActive && 'bg-accent font-medium',
          className,
        )
      }
    >
      {label}
    </NavLink>
  );
}

/** 重新讀取目前畫面的資料（含下拉選項）；其他快取標為過期，下次進入時再讀 */
function RefreshButton() {
  const fetching = useIsFetching() > 0;

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="重新整理"
      title="重新整理"
      disabled={fetching}
      onClick={() => queryClient.invalidateQueries()}
    >
      <RefreshCwIcon className={cn('size-5', fetching && 'animate-spin')} />
    </Button>
  );
}

/** 目前店員：可直接切換，或登出 */
function StaffMenu() {
  const { staff } = useSession();
  const { data: settings } = useSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 max-w-40">
          <span className="truncate">{staff}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>切換店員</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={staff ?? ''} onValueChange={setStaff}>
          {settings?.staff?.map((name) => (
            <DropdownMenuRadioItem key={name} value={name} className="h-9">
              {name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="h-9">
          <LogOutIcon />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
