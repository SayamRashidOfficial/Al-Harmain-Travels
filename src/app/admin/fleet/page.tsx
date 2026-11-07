import { redirect } from 'next/navigation';

export default function AdminFleetRedirectPage() {
  redirect('/admin/users');
}
