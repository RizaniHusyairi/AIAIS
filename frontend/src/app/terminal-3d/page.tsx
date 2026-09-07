import type { Metadata } from 'next';
import { metaHalaman } from '@/lib/seo';
import TerminalView from './TerminalView';

export const metadata: Metadata = metaHalaman({
  title: 'Terminal 3D | Bandara APT Pranoto Samarinda',
  description: 'Jelajahi model konsep eksterior terminal Bandara APT Pranoto dari berbagai sudut dengan tampilan 3D interaktif.',
  path: '/terminal-3d',
});

export default function TerminalPage() { return <TerminalView />; }
