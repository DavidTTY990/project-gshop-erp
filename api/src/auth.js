/**
 * 比對請求帶來的帳密與 Script Properties 的 API_USER / API_KEY。
 * 未設定 Script Properties 時一律拒絕。
 */
function checkAuth(auth) {
  const props = PropertiesService.getScriptProperties();
  const user = props.getProperty('API_USER');
  const key = props.getProperty('API_KEY');
  if (!user || !key || !auth) return false;
  return auth.user === user && auth.key === key;
}

function test_checkAuth() {
  console.log('錯誤帳密：', checkAuth({ user: 'x', key: 'y' }));
  console.log('未帶帳密：', checkAuth(undefined));
}
