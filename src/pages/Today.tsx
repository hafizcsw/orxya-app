const Today = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">اليوم</h1>
      <div className="grid gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">التقرير اليومي</h2>
          <p className="text-muted-foreground">قريباً...</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">إجراءات سريعة</h2>
          <p className="text-muted-foreground">قريباً...</p>
        </div>
      </div>
    </div>
  );
};

export default Today;
