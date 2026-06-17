import { AdminUI, type AdminUIProps } from '@dyrected/admin';
import '@dyrected/admin/styles';

export type DyrectedAdminProps = AdminUIProps;

export function DyrectedAdmin(props: DyrectedAdminProps) {
  return <AdminUI {...props} />;
}
