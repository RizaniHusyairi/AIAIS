'use client';

import { useParams } from 'next/navigation';
import FormBeritaView from '../FormBeritaView';

export default function UbahBeritaPage() {
  const params = useParams();
  const id = Number(params?.id);

  return <FormBeritaView id={Number.isFinite(id) ? id : undefined} />;
}
