import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
export default function Root() {
  redirect('/api/health');
}
