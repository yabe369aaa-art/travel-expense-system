import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Building2, Mail, Lock, Github } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('メールアドレスを正しく入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, setMfaRequired } = useAuthStore();

  const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'applicant1@travel-expense.local',
      password: 'password123',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { user, tokens, mfaRequired } = await authApi.login(data.email, data.password);

      if (mfaRequired) {
        setMfaRequired(data.email);
        toast({ title: '認証コードを送信しました', description: 'メールを確認してください' });
        navigate('/mfa', { state: { from, email: data.email } });
      } else {
        setAuth(user, tokens);
        toast({ title: 'ログインしました', variant: 'success' });
        navigate(from, { replace: true });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました';
      toast({ title: 'エラー', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntraLogin = () => {
    authApi.entraLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>交通費申請システム</CardTitle>
          <CardDescription>メールアドレスとパスワードでログイン</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  className="pl-10"
                  {...register('email')}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('password')}
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">または</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleEntraLogin} disabled={isLoading}>
            <Github className="mr-2 h-4 w-4" />
            Microsoft Entra ID でログイン
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            テストアカウント:
            <br />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">applicant1@travel-expense.local / password123</code>
            <br />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">coordinator@travel-expense.local / password123</code>
            <br />
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">admin@travel-expense.local / password123</code>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}