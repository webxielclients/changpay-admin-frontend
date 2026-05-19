import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'PIN setup is not supported in the admin app.' },
    { status: 404 }
  );
}