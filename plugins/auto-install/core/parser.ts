import { init, parse } from "es-module-lexer";

export async function extractSpecifiers(code: string): Promise<string[]> {
  await init;

  try {
    const [imports] = parse(code);
    const specs: string[] = [];

    for (const item of imports) {
      const s = code.slice(item.s, item.e);
      if (s) specs.push(s);
    }

    const dynamic = extractDynamicImports(code);
    for (const d of dynamic) specs.push(d);

    return Array.from(new Set(specs));
  } catch {
    const staticSpecs = Array.from(
      code.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)
    ).map((m) => m[1]);

    const dynamicSpecs = extractDynamicImports(code);
    return Array.from(new Set([...staticSpecs, ...dynamicSpecs]));
  }
}

function extractDynamicImports(code: string): string[] {
  const specs: string[] = [];
  for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (m[1]) specs.push(m[1]);
  }
  return specs;
}

export function parsePackageName(specifier: string): string | null {
  const clean = specifier.split(/[?#]/, 1)[0];

  if (
    clean.startsWith(".") ||
    clean.startsWith("/") ||
    clean.startsWith("\0") ||
    clean.startsWith("virtual:") ||
    clean.startsWith("data:") ||
    clean.startsWith("node:") ||
    clean.startsWith("@/")
  ) {
    return null;
  }

  if (clean.startsWith("@")) {
    const parts = clean.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  return clean.split("/")[0];
}
