/**
 * Tiny dependency-free syntax highlighter.
 * Returns token spans so colours stay design tokens (works in both themes).
 * Good enough for the languages that show up in GitHub issue bodies.
 */

export type Token = { text: string; type: TokenType };

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "builtin"
  | "punctuation"
  | "added"
  | "removed"
  | "meta";

const KEYWORDS: Record<string, string[]> = {
  python: [
    "def","class","return","if","elif","else","for","while","import","from","as","in","not","and","or","is","None","True","False","try","except","finally","raise","with","yield","lambda","pass","break","continue","assert","global","nonlocal","async","await","del",
  ],
  javascript: [
    "const","let","var","function","return","if","else","for","while","import","from","as","export","default","new","class","extends","try","catch","finally","throw","typeof","await","async","null","undefined","true","false","this","switch","case","break","continue","delete","in","of",
  ],
  bash: ["cd","echo","export","if","then","fi","for","do","done","sudo","pip","python","git","source","set"],
  json: ["true","false","null"],
};

const BUILTINS: Record<string, string[]> = {
  python: [
    "print","len","range","list","dict","set","tuple","int","float","str","bool","isinstance","enumerate","zip","open","super","self","np","pd","object","type","Exception","ValueError","TypeError","KeyError",
  ],
  javascript: ["console","Math","JSON","Object","Array","Promise","document","window"],
};

const ALIASES: Record<string, string> = {
  py: "python",
  python3: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  sh: "bash",
  shell: "bash",
  console: "bash",
  zsh: "bash",
  yaml: "json",
  yml: "json",
  toml: "json",
  traceback: "python",
  pytb: "python",
};

export function normaliseLanguage(lang?: string | null): string {
  if (!lang) return "plain";
  const lower = lang.toLowerCase();
  return ALIASES[lower] ?? lower;
}

const COMMENT_PREFIX: Record<string, string> = {
  python: "#",
  bash: "#",
  javascript: "//",
};

function tokeniseLine(line: string, lang: string): Token[] {
  if (lang === "diff") {
    if (line.startsWith("+")) return [{ text: line, type: "added" }];
    if (line.startsWith("-")) return [{ text: line, type: "removed" }];
    if (line.startsWith("@@") || line.startsWith("diff ") || line.startsWith("index "))
      return [{ text: line, type: "meta" }];
    return [{ text: line, type: "plain" }];
  }

  const keywords = new Set(KEYWORDS[lang] ?? []);
  const builtins = new Set(BUILTINS[lang] ?? []);
  const commentPrefix = COMMENT_PREFIX[lang];
  const tokens: Token[] = [];
  let index = 0;

  const push = (text: string, type: TokenType) => {
    if (!text) return;
    const previous = tokens[tokens.length - 1];
    if (previous && previous.type === type) previous.text += text;
    else tokens.push({ text, type });
  };

  while (index < line.length) {
    const rest = line.slice(index);

    if (commentPrefix && rest.startsWith(commentPrefix)) {
      push(rest, "comment");
      break;
    }

    const stringMatch = /^(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?|`(?:\\.|[^`\\])*`?)/.exec(
      rest,
    );
    if (stringMatch) {
      push(stringMatch[0], "string");
      index += stringMatch[0].length;
      continue;
    }

    const numberMatch = /^\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b/i.exec(rest);
    if (numberMatch) {
      push(numberMatch[0], "number");
      index += numberMatch[0].length;
      continue;
    }

    const wordMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (wordMatch) {
      const word = wordMatch[0];
      push(word, keywords.has(word) ? "keyword" : builtins.has(word) ? "builtin" : "plain");
      index += word.length;
      continue;
    }

    const punctuationMatch = /^[{}[\]().,:;=+\-*/%<>!&|^~?@]+/.exec(rest);
    if (punctuationMatch) {
      push(punctuationMatch[0], "punctuation");
      index += punctuationMatch[0].length;
      continue;
    }

    push(rest[0]!, "plain");
    index += 1;
  }

  return tokens;
}

export function highlight(code: string, language?: string | null): Token[][] {
  const lang = normaliseLanguage(language);
  return code.replace(/\n$/, "").split("\n").map((line) => tokeniseLine(line, lang));
}

export const tokenClass: Record<TokenType, string> = {
  plain: "text-foreground/90",
  comment: "text-muted-foreground italic",
  string: "text-status-proposed",
  number: "text-chart-4",
  keyword: "text-primary",
  builtin: "text-chart-5",
  punctuation: "text-muted-foreground",
  added: "text-state-open",
  removed: "text-status-failed",
  meta: "text-chart-2",
};
