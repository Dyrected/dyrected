export function replaceGeneratedRegion(source, name, content) {
  // MDX files use JSX comments; plain Markdown files use HTML comments.
  const mdxStart = `{/* GENERATED:${name}:START */}`;
  const mdxEnd = `{/* GENERATED:${name}:END */}`;
  const htmlStart = `<!-- GENERATED:${name}:START -->`;
  const htmlEnd = `<!-- GENERATED:${name}:END -->`;

  const preferMdx = source.includes(mdxStart) || source.includes(mdxEnd);
  const start = preferMdx ? mdxStart : htmlStart;
  const end = preferMdx ? mdxEnd : htmlEnd;

  const startCount = source.split(start).length - 1;
  const endCount = source.split(end).length - 1;
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(`Expected exactly one ${start} and ${end}`);
  }
  if (source.indexOf(start) > source.indexOf(end)) {
    throw new Error(`Generated region ${name} has reversed markers`);
  }
  const escaped = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(
    new RegExp(`${escaped}[\\s\\S]*?${escapedEnd}`),
    () => `${start}\n${content.trim()}\n${end}`,
  );
}
