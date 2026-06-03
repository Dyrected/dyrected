import { AdminUI, type AdminUIProps } from '@dyrected/admin';

export type DyrectedAdminProps = AdminUIProps;

export function DyrectedAdmin(props: DyrectedAdminProps) {
  return <AdminUI {...props} />;
}
