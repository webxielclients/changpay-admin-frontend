import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email is required',
        },
        { status: 400 }
      );
    }

    // TODO: Implement actual OTP resend logic
    // - Generate new OTP
    // - Store in Redis with expiry
    // - Send email with new OTP

    // Mock response for development
    return NextResponse.json({
      success: true,
      message: 'OTP resent successfully',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}