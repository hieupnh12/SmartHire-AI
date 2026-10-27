import type { CodingLanguage } from "./questionContentValidation";

export type HarnessTemplateId = "two_ints" | "single_line" | "json_stdin" | "raw_program" | "sql_query";

export const harnessTemplateOptions: { id: HarnessTemplateId; label: string; hint: string }[] = [
  { id: "two_ints", label: "Hai số nguyên", hint: "stdin: a b → gọi solve(a, b)" },
  { id: "single_line", label: "Một dòng chuỗi", hint: "stdin: một dòng → gọi solve(line)" },
  { id: "json_stdin", label: "JSON từ stdin", hint: "stdin: JSON → parse rồi gọi solve(data)" },
  { id: "raw_program", label: "Chương trình đầy đủ", hint: "Ứng viên viết cả chương trình; harness chỉ chèn {{SOURCE}}" },
  { id: "sql_query", label: "Truy vấn SQL", hint: "Ứng viên viết SELECT; phù hợp category SQL" },
];

const templates: Record<HarnessTemplateId, Partial<Record<CodingLanguage, { starter: string; harness: string }>>> = {
  two_ints: {
    python: {
      starter: "def solve(a: int, b: int) -> int:\n    return a + b\n",
      harness: "{{SOURCE}}\na, b = map(int, input().split())\nprint(solve(a, b))\n",
    },
    java: {
      starter: "static int solve(int a, int b) {\n    return a + b;\n}\n",
      harness: "import java.util.*;\npublic class Main {\n{{SOURCE}}\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    int a = sc.nextInt(), b = sc.nextInt();\n    System.out.println(solve(a, b));\n  }\n}\n",
    },
    javascript: {
      starter: "function solve(a, b) {\n  return a + b;\n}\n",
      harness: "{{SOURCE}}\nconst fs = require('fs');\nconst [a, b] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(solve(a, b));\n",
    },
    cpp: {
      starter: "int solve(int a, int b) {\n    return a + b;\n}\n",
      harness: "#include <bits/stdc++.h>\nusing namespace std;\n{{SOURCE}}\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int a, b;\n    cin >> a >> b;\n    cout << solve(a, b) << \"\\n\";\n}\n",
    },
  },
  single_line: {
    python: {
      starter: "def solve(line: str) -> str:\n    return line.strip()\n",
      harness: "{{SOURCE}}\nprint(solve(input()))\n",
    },
    java: {
      starter: "static String solve(String line) {\n    return line.trim();\n}\n",
      harness: "import java.util.*;\npublic class Main {\n{{SOURCE}}\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    System.out.println(solve(sc.nextLine()));\n  }\n}\n",
    },
    javascript: {
      starter: "function solve(line) {\n  return line.trim();\n}\n",
      harness: "{{SOURCE}}\nconst fs = require('fs');\nconsole.log(solve(fs.readFileSync(0, 'utf8').replace(/\\n$/, '')));\n",
    },
    cpp: {
      starter: "string solve(string line) {\n    return line;\n}\n",
      harness: "#include <bits/stdc++.h>\nusing namespace std;\n{{SOURCE}}\nint main() {\n    string line;\n    getline(cin, line);\n    cout << solve(line) << \"\\n\";\n}\n",
    },
  },
  json_stdin: {
    python: {
      starter: "def solve(data):\n    return data\n",
      harness: "import json, sys\n{{SOURCE}}\nprint(json.dumps(solve(json.load(sys.stdin)), separators=(',', ':')))\n",
    },
    javascript: {
      starter: "function solve(data) {\n  return data;\n}\n",
      harness: "{{SOURCE}}\nconst fs = require('fs');\nconst data = JSON.parse(fs.readFileSync(0, 'utf8'));\nconsole.log(JSON.stringify(solve(data)));\n",
    },
  },
  raw_program: {
    python: { starter: "# Đọc stdin và in kết quả ra stdout\n", harness: "{{SOURCE}}\n" },
    java: {
      starter: "import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // TODO\n  }\n}\n",
      harness: "{{SOURCE}}\n",
    },
    javascript: { starter: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8');\n// TODO\n", harness: "{{SOURCE}}\n" },
    cpp: {
      starter: "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // TODO\n}\n",
      harness: "{{SOURCE}}\n",
    },
    sql: { starter: "SELECT 1;\n", harness: "{{SOURCE}}\n" },
  },
  sql_query: {
    sql: { starter: "SELECT * FROM employees WHERE id = 1;\n", harness: "{{SOURCE}}\n" },
  },
};

export function applyHarnessTemplate(
  templateId: HarnessTemplateId,
  languages: CodingLanguage[],
): { starterCode: Record<string, string>; harness: Record<string, string> } {
  const starterCode: Record<string, string> = {};
  const harness: Record<string, string> = {};
  for (const language of languages) {
    const pack = templates[templateId][language];
    if (!pack) continue;
    starterCode[language] = pack.starter;
    harness[language] = pack.harness;
  }
  return { starterCode, harness };
}

export function languagesForTemplate(templateId: HarnessTemplateId): CodingLanguage[] {
  return (Object.keys(templates[templateId]) as CodingLanguage[]);
}
