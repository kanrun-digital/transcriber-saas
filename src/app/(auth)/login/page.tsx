"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Mail, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";

type AuthMode = "email" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isSigningIn, signInError, isReady, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("email");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

  // Redirect to dashboard when auth is fully ready (after provision)
  useEffect(() => {
    if (isReady && !isLoading) {
      router.push(ROUTES.DASHBOARD);
    }
  }, [isReady, isLoading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn({ email, password });
      setJustSignedIn(true);
    } catch {}
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: window.location.origin + "/api/auth/callback/google",
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Google вхід недоступний");
      }
    } catch {
      toast.error("Помилка Google входу");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) {
      toast.error("Введіть email");
      return;
    }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "sign-in" }),
      });
      if (res.ok) {
        setOtpSent(true);
        toast.success("Код надіслано на email");
      } else {
        const data = await res.json();
        toast.error(data.message || "Помилка відправки коду");
      }
    } catch {
      toast.error("Помилка відправки коду");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in/email-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Невірний код");
      // Reload to trigger session query → provision → redirect
      window.location.href = ROUTES.DASHBOARD;
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // Show loading while provisioning after sign-in
  if (justSignedIn && isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Підготовка акаунту...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🎙️</div>
        <CardTitle className="text-2xl">Вхід</CardTitle>
        <CardDescription>Увійдіть у свій акаунт Transcriber</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {signInError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {signInError.message || "Помилка входу"}
          </div>
        )}

        {/* Google Sign In */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Увійти через Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">або</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "email" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => { setMode("email"); setOtpSent(false); }}
          >
            <Mail className="w-4 h-4 mr-1" /> Email + Пароль
          </Button>
          <Button
            variant={mode === "otp" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("otp")}
          >
            <KeyRound className="w-4 h-4 mr-1" /> Email OTP
          </Button>
        </div>

        {/* Email + Password */}
        {mode === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Увійти
            </Button>
          </form>
        )}

        {/* OTP */}
        {mode === "otp" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp-email">Email</Label>
              <Input id="otp-email" type="email" placeholder="you@example.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {!otpSent ? (
              <Button className="w-full" onClick={handleSendOtp} disabled={otpLoading}>
                {otpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Надіслати код
              </Button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-muted-foreground">Код надіслано на {email}</p>
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Код підтвердження</Label>
                  <Input id="otp-code" type="text" placeholder="000000" value={otp}
                    onChange={(e) => setOtp(e.target.value)} maxLength={6}
                    className="text-center text-2xl tracking-widest" required />
                </div>
                <Button type="submit" className="w-full" disabled={otpLoading}>
                  {otpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Підтвердити
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Немає акаунту?{" "}
          <Link href={ROUTES.SIGNUP} className="text-primary underline">
            Зареєструватися
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
