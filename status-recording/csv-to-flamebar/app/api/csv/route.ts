import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');

  if (!path) {
    return NextResponse.json(
      { error: 'CSV path is required' },
      { status: 400 }
    );
  }

  try {
    const csvContent = await fs.readFile(path, 'utf-8');
    return NextResponse.json({
      success: true,
      data: csvContent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] CSV read error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to read CSV file',
        details: 'Check if the file path is correct and accessible',
      },
      { status: 500 }
    );
  }
}
