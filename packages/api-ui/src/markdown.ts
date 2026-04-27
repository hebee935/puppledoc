import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

export function renderMarkdown(src: string): string {
  return openLinksInNewTab(marked.parse(src, { async: false }) as string);
}

export function renderMarkdownInline(src: string): string {
  return openLinksInNewTab(marked.parseInline(src, { async: false }) as string);
}

// marked doesn't add target/rel itself. A post-pass keeps the renderer
// untouched across versions (v15+ changed the token-based renderer API).
function openLinksInNewTab(html: string): string {
  return html.replace(/<a\s+([^>]*?)>/g, (match, attrs) => {
    if (/\btarget\s*=/.test(attrs)) return match;
    return `<a ${attrs} target="_blank" rel="noreferrer">`;
  });
}
