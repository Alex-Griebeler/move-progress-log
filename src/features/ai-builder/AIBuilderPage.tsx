import { useIsAdmin } from '@/hooks/useUserRole';
import { AIChat } from './AIChat';
import { PageLayout } from '@/components/PageLayout';
import { PageHeader } from '@/components/PageHeader';

export default function AIBuilderPage() {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-muted-foreground text-lg'>Acesso negado</p>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title='AI Builder'
        subtitle='Converse com o AI para criar tarefas e implementações'
      />
      <div className='p-6'>
        <AIChat />
      </div>
    </PageLayout>
  );
}
