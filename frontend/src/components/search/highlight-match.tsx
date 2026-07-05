import { Fragment } from "react";

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return <>{text}</>;

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmedQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return <>{text}</>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + trimmedQuery.length);
  const after = text.slice(index + trimmedQuery.length);

  return (
    <Fragment>
      {before}
      <mark className="rounded-sm bg-brass/25 text-ink">{match}</mark>
      {after}
    </Fragment>
  );
}
