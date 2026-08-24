"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ONBOARDED_KEY = "bizmentor:v1:onboarded";

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDED_KEY, "1");
}

/** 首页守卫：未完成 Onboarding 时跳转 /onboarding */
export function OnboardingGuard() {
  const router = useRouter();
  useEffect(() => {
    if (!isOnboarded()) router.replace("/onboarding");
  }, [router]);
  return null;
}