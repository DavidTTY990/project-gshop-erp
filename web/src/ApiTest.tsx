import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function ApiTest() {
  const [result, setResult] = useState('連線中…');

  useEffect(() => {
    fetch(`${API_URL}?action=customers`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) setResult(`讀到 ${json.data.length} 位客戶`);
        else setResult(`錯誤：${json.error}`);
      })
      .catch((err) => setResult(`連線失敗：${err.message}`));
  }, []);

  return <p>{result}</p>;
}
