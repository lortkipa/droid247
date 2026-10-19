import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import type { SyntaxColors } from '@/lib/theme';

/**
 * Syntax highlighting for code blocks: highlight.js grammars (through
 * lowlight, which returns a tree instead of HTML) rendered as nested Text.
 * Only common languages are included to keep the bundle small; aliases such
 * as `ts`, `py`, `sh` and `html` come with their grammars.
 */
const lowlight = createLowlight({
  bash,
  c,
  cpp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  python,
  rust,
  shell,
  sql,
  swift,
  typescript,
  xml,
  yaml,
});

type Tree = ReturnType<typeof lowlight.highlight>;
type TreeNode = Tree['children'][number];

/** highlight.js token class (without `hljs-`) → theme colour, following GitHub's theme. */
const classColors: Record<string, keyof SyntaxColors> = {
  keyword: 'keyword',
  doctag: 'keyword',
  'template-tag': 'keyword',
  type: 'keyword',
  title: 'function',
  attr: 'variable',
  attribute: 'variable',
  variable: 'variable',
  'template-variable': 'variable',
  property: 'variable',
  operator: 'variable',
  'selector-attr': 'variable',
  'selector-class': 'variable',
  'selector-id': 'variable',
  literal: 'number',
  number: 'number',
  section: 'number',
  string: 'string',
  regexp: 'string',
  link: 'string',
  built_in: 'type',
  symbol: 'type',
  bullet: 'type',
  comment: 'comment',
  quote: 'attribute',
  name: 'attribute',
  'selector-tag': 'attribute',
  'selector-pseudo': 'attribute',
  meta: 'meta',
  addition: 'addition',
  deletion: 'deletion',
};

function colorOf(classNames: unknown, syntax: SyntaxColors): string | undefined {
  if (!Array.isArray(classNames)) return undefined;
  for (const name of classNames) {
    const key = typeof name === 'string' ? classColors[name.replace(/^hljs-/, '')] : undefined;
    if (key) return syntax[key];
  }
  return undefined;
}

function render(nodes: TreeNode[], syntax: SyntaxColors): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === 'text') return node.value;
    if (node.type !== 'element') return null;
    const color = colorOf(node.properties.className, syntax);
    return (
      <Text key={index} style={color ? { color } : undefined}>
        {render(node.children, syntax)}
      </Text>
    );
  });
}

/** `code` as coloured Text pieces, or the plain string for an unknown language. */
export function highlightCode(code: string, language: string | undefined, syntax: SyntaxColors): ReactNode {
  const name = language?.trim().toLowerCase();
  if (!name || !lowlight.registered(name)) return code;
  try {
    return render(lowlight.highlight(name, code).children, syntax);
  } catch {
    return code;
  }
}
