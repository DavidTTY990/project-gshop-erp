import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { callApi, useSettings } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { clearSession, setAuth, setStaff, useSession, type Auth } from '@/lib/session';

/** 第 1 步輸入帳密，第 2 步選擇店員；兩步都完成後回到原本要去的頁面 */
export default function LoginPage() {
  const { auth, staff } = useSession();
  const location = useLocation();

  if (auth && staff) {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">遊戲店 ERP</CardTitle>
          <CardDescription>{auth ? '請選擇店員' : '請輸入帳號與密碼'}</CardDescription>
        </CardHeader>
        <CardContent>{auth ? <StaffStep /> : <CredentialStep />}</CardContent>
      </Card>
    </div>
  );
}

function CredentialStep() {
  const [user, setUser] = useState('');
  const [key, setKey] = useState('');
  const login = useMutation({
    mutationFn: (auth: Auth) => callApi('login', undefined, auth),
    onSuccess: (_, auth) => setAuth(auth),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ user: user.trim(), key });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="user">帳號</Label>
        <Input
          id="user"
          className="h-10"
          autoComplete="username"
          autoCapitalize="none"
          required
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="key">密碼</Label>
        <Input
          id="key"
          type="password"
          className="h-10"
          autoComplete="current-password"
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </div>
      <Button type="submit" size="lg" className="h-10" disabled={login.isPending}>
        {login.isPending && <Loader2Icon className="animate-spin" />}
        登入
      </Button>
    </form>
  );
}

function StaffStep() {
  const { data: settings, isPending, isError, refetch } = useSettings();
  const staffList = settings?.staff ?? [];

  const switchAccount = () => {
    clearSession();
    queryClient.clear();
  };

  let content;
  if (isPending) {
    content = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        載入店員名單…
      </p>
    );
  } else if (isError) {
    content = (
      <Button variant="outline" className="h-10" onClick={() => refetch()}>
        重新載入
      </Button>
    );
  } else if (staffList.length === 0) {
    content = <p className="text-sm text-destructive">請先在 DB Settings 新增店員資訊</p>;
  } else {
    content = (
      <div className="grid grid-cols-2 gap-2">
        {staffList.map((name) => (
          <Button key={name} variant="outline" className="h-14 text-base" onClick={() => setStaff(name)}>
            {name}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {content}
      <Button variant="link" className="self-start px-0" onClick={switchAccount}>
        使用其他帳號登入
      </Button>
    </div>
  );
}
