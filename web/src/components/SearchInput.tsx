import type { FormEvent } from 'react';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

/** 搜尋框：邊打字邊搜尋；鍵盤上的「搜尋」只收起鍵盤 */
export default function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        enterKeyHint="search"
        className="h-10 pl-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
