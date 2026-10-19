/** 尚未實作的頁面 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">建置中</p>
    </div>
  );
}
