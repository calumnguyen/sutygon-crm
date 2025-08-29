import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';
import { decrypt } from '@/lib/utils/encryption';
import { and, gte, lte, eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Get query parameters
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const rating = searchParams.get('rating');

    if (!fromDate || !toDate) {
      return NextResponse.json({ success: false, error: 'Missing date parameters' });
    }

    // Build filters
    const filters = [
      gte(reviews.dateCreated, new Date(fromDate)),
      lte(reviews.dateCreated, new Date(toDate)),
    ];

    // Add rating filter if provided
    if (rating) {
      const ratingValues = rating
        .split(',')
        .map((r) => parseInt(r.trim()))
        .filter((r) => !isNaN(r));
      if (ratingValues.length > 0) {
        filters.push(inArray(reviews.rating, ratingValues));
      }
    }

    // Combine all filters
    let whereClause = undefined;
    if (filters.length > 0) {
      whereClause = filters.length === 1 ? filters[0] : and(...filters);
    }

    // Fetch reviews with filters
    const reviewsData = await db
      .select()
      .from(reviews)
      .where(whereClause)
      .orderBy(reviews.dateCreated);

    // Decrypt sensitive fields
    const decryptedReviews = reviewsData.map((review) => ({
      id: review.id,
      customerName: decrypt(review.customerName),
      phoneNumber: review.phoneNumber ? decrypt(review.phoneNumber) : null,
      emailAddress: review.emailAddress ? decrypt(review.emailAddress) : null,
      invoiceNumber: review.invoiceNumber ? decrypt(review.invoiceNumber) : null,
      rating: review.rating,
      ratingDescription: review.ratingDescription,
      helperName: review.helperName ? decrypt(review.helperName) : null,
      reviewDetail: decrypt(review.reviewDetail),
      dateCreated:
        review.dateCreated instanceof Date ? review.dateCreated.toISOString() : review.dateCreated,
      ipAddress: review.ipAddress ? decrypt(review.ipAddress) : null,
      deviceType: review.deviceType ? decrypt(review.deviceType) : null,
      browserType: review.browserType ? decrypt(review.browserType) : null,
    }));

    return NextResponse.json({
      success: true,
      data: decryptedReviews,
      count: decryptedReviews.length,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}
