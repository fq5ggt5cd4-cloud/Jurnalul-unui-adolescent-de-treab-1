import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/lang";

const memCache: Record<string, string> = {};

export function cacheKey(text: string, from: string, to: string): string {
  let h = 0;
  const sample = text.substring(0, 300);
  for (let i = 0; i < sample.length; i++) {
    h = Math.imul(31, h) + sample.charCodeAt(i);
    h |= 0;
  }
  return `tr:${from}:${to}:${Math.abs(h)}:${text.length}`;
}

export function fromStore(key: string): string | null {
  if (memCache[key] !== undefined) return memCache[key];
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function toStore(key: string, val: string) {
  memCache[key] = val;
  try { sessionStorage.setItem(key, val); } catch {}
}

function normLang(lang: string): string {
  return lang === "zh" ? "zh-CN" : lang;
}

async function callMyMemory(text: string, from: string, to: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(trimmed.substring(0, 4900))}` +
    `&langpair=${normLang(from)}|${normLang(to)}` +
    `&de=translate@blog.ro`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText as string;
    }
  } catch {}
  return text;
}

export async function translateText(
  text: string,
  to: string,
  from = "ro"
): Promise<string> {
  if (!text?.trim() || to === from) return text;
  const key = cacheKey(text, from, to);
  const cached = fromStore(key);
  if (cached !== null) return cached;

  const result = await callMyMemory(text, from, to);
  toStore(key, result);
  return result;
}

export async function translateHtml(
  html: string,
  to: string,
  from = "ro"
): Promise<string> {
  if (!html?.trim() || to === from) return html;

  const key = cacheKey(html, from, to);
  const cached = fromStore(key);
  if (cached !== null) return cached;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const SELECTOR = "p, h1, h2, h3, h4, h5, h6, blockquote, li, td, th";
    const elements = Array.from(doc.querySelectorAll(SELECTOR));

    for (const el of elements) {
      const text = el.textContent?.trim();
      if (!text) continue;

      const translated = await callMyMemory(text, from, to);
      if (translated && translated !== text) {
        el.textContent = translated;
      }

      await new Promise((r) => setTimeout(r, 120));
    }

    const result = doc.body.innerHTML;
    toStore(key, result);
    return result;
  } catch {
    return html;
  }
}

// Registry for pre-warming translations on language hover
interface PrefetchEntry { text: string; from: string; isHtml: boolean }
const prefetchRegistry: PrefetchEntry[] = [];
const prefetchIds = new Set<string>();

export function registerForPrefetch(text: string, from = "ro", isHtml = false) {
  if (!text?.trim()) return;
  const id = `${from}:${isHtml}:${text.length}:${text.substring(0, 40)}`;
  if (prefetchIds.has(id)) return;
  prefetchIds.add(id);
  prefetchRegistry.push({ text, from, isHtml });
}

export function prefetchForLang(to: string) {
  if (!to || to === "ro") return;
  for (const { text, from, isHtml } of prefetchRegistry) {
    const key = cacheKey(text, from, to);
    if (fromStore(key) !== null) continue;
    if (isHtml) {
      translateHtml(text, to, from).catch(() => {});
    } else {
      translateText(text, to, from).catch(() => {});
    }
  }
}

export function useTranslatedText(text: string, from = "ro"): string {
  const { language } = useLang();
  const [out, setOut] = useState(text);
  const activeKey = useRef("");

  useEffect(() => {
    if (!text) { setOut(text); return; }
    if (language === from) { setOut(text); return; }

    const key = cacheKey(text, from, language);
    if (activeKey.current === key) return;
    activeKey.current = key;

    const cached = fromStore(key);
    if (cached !== null) { setOut(cached); return; }

    // Keep showing previous content (no revert to original) while fetching
    translateText(text, language, from).then((r) => {
      if (activeKey.current === key) setOut(r);
    });
  }, [text, language, from]);

  return out;
}
