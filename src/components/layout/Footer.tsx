"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/terms", "/privacy", "/tokushoho"];

export function Footer() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <footer className="w-full border-t border-gray-200 bg-white py-4 safe-area-bottom">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-center gap-3 text-xs font-mono text-gray-400">
        <Link href="/terms" className="hover:text-gray-600 transition-colors">
          利用規約
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/privacy" className="hover:text-gray-600 transition-colors">
          プライバシーポリシー
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/tokushoho" className="hover:text-gray-600 transition-colors">
          特定商取引法
        </Link>
      </div>
    </footer>
  );
}
