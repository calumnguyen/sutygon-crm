import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('DEBUG: Upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('DEBUG: Upload API received file:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userAgent: request.headers.get('user-agent'),
    });

    if (!file) {
      console.error('DEBUG: No file provided to upload API');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('DEBUG: Invalid file type:', file.type);
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only image files are allowed.` },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('DEBUG: File too large:', file.size, 'bytes');
      return NextResponse.json(
        { error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) must be less than 5MB` },
        { status: 400 }
      );
    }

    // Additional mobile validation
    if (file.size === 0) {
      console.error('DEBUG: File size is 0, likely mobile issue');
      return NextResponse.json(
        {
          error:
            'File appears to be empty (0 bytes). This often happens on mobile devices. Please try again.',
        },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage in database
    console.log('DEBUG: Converting file to base64...');
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    console.log('DEBUG: File converted to base64, length:', base64.length);

    // Generate a unique filename for reference
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${randomString}.${fileExtension}`;

    console.log('DEBUG: Returning data URL for database storage');

    return NextResponse.json({
      success: true,
      url: dataUrl, // This will be stored directly in the database
      filename: filename,
      size: file.size,
      type: file.type,
      message: 'File converted to base64 for database storage',
    });
  } catch (error) {
    console.error('DEBUG: Upload error details:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
