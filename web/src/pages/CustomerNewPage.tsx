import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomerForm from '@/components/CustomerForm';
import { useCreateCustomer } from '@/lib/customers';

export default function CustomerNewPage() {
  const navigate = useNavigate();
  const create = useCreateCustomer();

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">新增客人</CardTitle>
      </CardHeader>
      <CardContent>
        <CustomerForm
          submitLabel="建立"
          pending={create.isPending}
          error={create.error}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (customer) => {
                toast.success(`已建立客人「${customer.name}」`);
                navigate(`/customers/${customer.customer_id}`, { replace: true });
              },
            })
          }
          onCancel={() => navigate('/')}
        />
      </CardContent>
    </Card>
  );
}
