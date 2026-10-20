import { useState } from 'react';

/**
 * 表單檢核時機：欄位離開焦點（onBlur）後才顯示該欄錯誤，送出時顯示全部。
 * errors 由呼叫端每次 render 依目前的值重新計算，因此離開過的欄位在修正後錯誤會立即消失。
 *
 * 用法：
 *   const errors = validate(values);
 *   const field = useFieldErrors(errors);
 *   <Input onBlur={field.touch('name')} aria-invalid={!!field.error('name')} />
 *   if (field.submit()) save();
 */
export function useFieldErrors<K extends string>(errors: Partial<Record<K, string>>) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  return {
    /** 該欄要顯示的錯誤；尚未離開過且尚未送出時為 undefined */
    error: (field: K) => (submitted || touched.has(field) ? errors[field] : undefined),
    /** 產生 onBlur 處理函式 */
    touch: (field: K) => () => setTouched((t) => (t.has(field) ? t : new Set(t).add(field))),
    /** 送出時呼叫：之後顯示全部錯誤；沒有錯誤時回傳 true */
    submit: () => {
      setSubmitted(true);
      return Object.values(errors).every((e) => !e);
    },
  };
}
