// Minimal, escape-first markdown -> HTML for streamed AI reports.
// Escapes HTML first so model output can never inject markup, then applies a small,
// fixed set of inline/block transforms. (Ported from opcodestockapp.)
export function renderAiMarkdown(md: string): string {
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/^### (.*)$/gm, '<h4>$1</h4>')
    .replace(/^## (.*)$/gm, '<h3>$1</h3>')
    .replace(/^# (.*)$/gm, '<h2>$1</h2>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
    .replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n{2,}/g, '<br><br>');
}
