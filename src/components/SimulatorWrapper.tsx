'use client';

import dynamic from 'next/dynamic';

const DivvySimulator = dynamic(() => import('@/components/DivvySimulator'), { ssr: false });

export default function SimulatorWrapper() {
  return <DivvySimulator />;
}
