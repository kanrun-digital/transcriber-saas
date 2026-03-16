"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";

export default function LoginPage() {
  const { signIn, isSigningIn, signInError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn({ email, password });
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🎙️</div>
        <CardTitle className="text-2xl">Вхід</CardTitle>
        <CardDescription>Увійдіть у свій акаунт Transcriber</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {signInError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {signInError.message || "Помилка входу"}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Увійти
          </Button>
          <p className="text-sm text-muted-foreground">
            Немає акаунту?{" "}
            <Link href={ROUTES.SIGNUP} className="text-primary underline">
              Зареєструватися
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
