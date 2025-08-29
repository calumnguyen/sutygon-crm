import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';
import { and, gte, lte, sql, count, avg } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Build date filter
    let dateFilter = undefined;
    if (fromDate && toDate) {
      dateFilter = and(
        gte(reviews.dateCreated, new Date(fromDate)),
        lte(reviews.dateCreated, new Date(toDate))
      );
    }

    // Get reviews for weighted calculation (with date filter)
    const allReviews = await db
      .select({
        rating: reviews.rating,
        dateCreated: reviews.dateCreated,
      })
      .from(reviews)
      .where(dateFilter);

    // Calculate weighted average based on time periods (within the filtered date range)
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

    let weightedSum = 0;
    let totalWeight = 0;
    let totalReviews = 0;

    allReviews.forEach((review) => {
      const reviewDate = new Date(review.dateCreated);
      let weight = 1; // Default weight

      if (reviewDate >= oneMonthAgo) {
        weight = 4; // This month - highest weight
      } else if (reviewDate >= threeMonthsAgo) {
        weight = 3; // Within 3 months
      } else if (reviewDate >= sixMonthsAgo) {
        weight = 2; // Within 6 months
      } else {
        weight = 1; // Beyond 6 months - lowest weight
      }

      weightedSum += review.rating * weight;
      totalWeight += weight;
      totalReviews++;
    });

    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Get rating distribution for graph (1-10) with date filter
    const ratingDistribution = await db
      .select({
        rating: reviews.rating,
        count: count(),
      })
      .from(reviews)
      .where(dateFilter)
      .groupBy(reviews.rating)
      .orderBy(reviews.rating);

    // Create complete distribution (1-10) with 0 for missing ratings
    const completeDistribution = [];
    for (let i = 1; i <= 10; i++) {
      const existingRating = ratingDistribution.find((item) => item.rating === i);
      completeDistribution.push({
        rating: i,
        count: existingRating ? Number(existingRating.count) : 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalReviews: totalReviews,
        weightedAverageRating: Number(weightedAverage.toFixed(1)),
        ratingDistribution: completeDistribution,
      },
    });
  } catch (error) {
    console.error('Error fetching review analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review analytics' },
      { status: 500 }
    );
  }
}
