import { CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/lib/api';

const SEP = '、';

/** 配件：點選 Settings 的常用項目（以「、」串接），也可直接輸入 */
export default function AccessoryInput({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  const { data: settings } = useSettings();
  const items = value.split(SEP).map((s) => s.trim()).filter(Boolean);

  const toggle = (name: string) => {
    const next = items.includes(name) ? items.filter((i) => i !== name) : [...items, name];
    onChange(next.join(SEP));
  };

  return (
    <div className="flex flex-col gap-2">
      {!!settings?.accessory?.length && (
        <div className="flex flex-wrap gap-2">
          {settings.accessory.map((name) => {
            const selected = items.includes(name);
            return (
              <Button
                key={name}
                type="button"
                variant={selected ? 'default' : 'outline'}
                className="h-9"
                aria-pressed={selected}
                onClick={() => toggle(name)}
              >
                {selected && <CheckIcon />}
                {name}
              </Button>
            );
          })}
        </div>
      )}
      <Input id={id} className="h-10" placeholder="其他配件可直接輸入，以「、」分隔" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
