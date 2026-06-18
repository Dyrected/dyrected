import { AdminUI, type AdminUIProps } from '@dyrected/admin';
import '@dyrected/admin/styles';

// @internal – AdminUIProps includes `initialToken` which is not for public docs.
// It is used internally by Dyrected Cloud and should not be documented or promoted.
export type DyrectedAdminProps = AdminUIProps;

export function DyrectedAdmin(props: DyrectedAdminProps) {
  return <AdminUI {...props} />;
}
