import { useState, useEffect, useRef } from 'react';
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
import { Shield, Loader2 } from 'lucide-react';

const mfaSchema = z.object({
  code: z.string().length(6, '6桁のコードを入力してください'),
});

type MfaForm = z.infer<typeof mfaSchema>;

export function MfaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, clearMfaRequired, mfaEmail } = useAuthStore();

  const from = (location.state as { from?: string; email?: string })?.from || '/dashboard';
  const email = (location.state as { from?: string; email?: string })?.email || mfaEmail;

  const codeInputsRef = useRef<HTMLInputElement[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: '' },
  });

  const code = watch('code');

  useEffect(() => {
    if (!email) {
      navigate('/login');
      return;
    }
    authApi.sendMfa(email).catch(() => {
      toast({ title: 'コード送信に失敗しました', variant: 'destructive' });
    });
    startCooldown();
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((c) => c - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const startCooldown = () => setResendCooldown(60);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.sendMfa(email!);
      toast({ title: '認証コードを再送信しました' });
      startCooldown();
    } catch {
      toast({ title: '再送信に失敗しました', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: MfaForm) => {
    setIsLoading(true);
    try {
      const { user, tokens } = await authApi.verifyMfa(email!, data.code);
      setAuth(user, tokens);
      clearMfaRequired();
      toast({ title: 'ログインしました', variant: 'success' });
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '認証に失敗しました';
      toast({ title: 'エラー', description: message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !codeInputsRef.current[index]?.value && index > 0) {
      codeInputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>2要素認証</CardTitle>
          <CardDescription>
            {email} に6桁の認証コードを送信しました
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2 justify-center" role="group" aria-label="認証コード">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  className="w-12 h-12 text-center text-2xl"
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!/^\d*$/.test(value)) return;
                    if (value) {
                      setValue('code', code.slice(0, i) + value + code.slice(i + 1), { shouldValidate: true });
                      if (i < 5) codeInputsRef.current[i + 1]?.focus();
                    }
                  }}
                  ref={(el) => { codeInputsRef.current[i] = el!; }}
                  defaultValue={code?.[i] || ''}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {errors.code && (
              <p className="text-center text-sm text-destructive">{errors.code.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '認証する'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="ghost" className="w-full" onClick={handleResend} disabled={resendCooldown > 0}>
            {resendCooldown > 0 ? `再送信 (${resendCooldown}s)` : 'コードを再送信'}
          </Button>
          <Button variant="link" onClick={() => { clearMfaRequired(); navigate('/login'); }}>
            ログイン画面に戻る
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}