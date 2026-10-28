import { useState } from 'react';

/**
 * 表單檢核時機：欄位離開焦點（onBlur）後才顯示該欄錯誤；送出時顯示當下所有有錯的欄位。
 * errors 由呼叫端每次 render 依目前的值重新計算，因此已顯示的錯誤在修正後會立即消失。
 * 送出後才新增的欄位（例：新增一個品項）不會立刻顯示錯誤，仍等 onBlur 或下次送出。
 *
 * 用法：
 *   const errors = validate(values);
 *   const field = useFieldErrors(errors);
 *   <Input onBlur={field.touch('name')} aria-invalid={!!field.error('name')} />
 *   if (field.submit()) save();
 */
export function useFieldErrors<K extends string>(errors: Partial<Record<K, string>>) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(() => new Set());

  return {
    /** 該欄要顯示的錯誤；尚未離開過、也未在送出時出錯的欄位為 undefined */
    error: (field: K) => (touched.has(field) ? errors[field] : undefined),
    /** 產生 onBlur 處理函式 */
    touch: (field: K) => () => setTouched((t) => (t.has(field) ? t : new Set(t).add(field))),
    /** 送出時呼叫：把目前有錯的欄位標為已檢核；沒有錯誤時回傳 true */
    submit: () => {
      const invalid = (Object.keys(errors) as K[]).filter((k) => errors[k]);
      if (invalid.length > 0) setTouched((t) => new Set([...t, ...invalid]));
      return invalid.length === 0;
    },
  };
}
