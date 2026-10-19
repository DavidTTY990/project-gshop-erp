import { HashRouter, Route, Routes } from 'react-router';
import ApiTest from './ApiTest';

// GitHub Pages 沒有伺服器端路由，使用 HashRouter（網址形如 /#/orders）
function App() {
  return (
    <HashRouter>
      <h1>遊戲店 ERP</h1>
      <Routes>
        <Route path="/" element={<ApiTest />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
