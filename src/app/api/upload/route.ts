import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only image files are allowed.` },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for base64 encoding)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) must be less than 2MB. Please compress the image or choose a smaller file.`,
        },
        { status: 400 }
      );
    }

    // Additional mobile validation
    if (file.size === 0) {
      return NextResponse.json(
        {
          error:
            'File appears to be empty (0 bytes). This often happens on mobile devices. Please try again.',
        },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage in database
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Check if base64 string is too large (max 3MB for database)
    const maxBase64Size = 3 * 1024 * 1024; // 3MB
    if (dataUrl.length > maxBase64Size) {
      return NextResponse.json(
        {
          error: `Image is too large after encoding (${(dataUrl.length / 1024 / 1024).toFixed(2)}MB). Please choose a smaller image or compress it.`,
        },
        { status: 400 }
      );
    }

    // Generate a unique filename for reference
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${randomString}.${fileExtension}`;

    return NextResponse.json({
      success: true,
      url: dataUrl, // This will be stored directly in the database
      filename: filename,
      size: file.size,
      type: file.type,
      message: 'File converted to base64 for database storage',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
