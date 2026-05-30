"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  resultCount,
  totalCount,
}: SearchInputProps) {
  const showCount =
    value.trim().length > 0 &&
    resultCount !== undefined &&
    totalCount !== undefined;

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 sm:max-w-xs"
      />
      {showCount && (
        <span className="text-sm text-zinc-500">
          {resultCount} of {totalCount} shown
        </span>
      )}
    </div>
  );
}
