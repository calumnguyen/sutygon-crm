import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inventoryItems, users } from '@/lib/db/schema';
import { and, gte, lte, isNotNull, count, desc, eq } from 'drizzle-orm';
import { decryptField } from '@/lib/utils/userEncryption';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: from and to dates' },
        { status: 400 }
      );
    }

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);

    // Validate dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Set time boundaries for proper date range filtering
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    console.log(
      `Fetching inventory adding report from ${fromDate.toISOString()} to ${toDate.toISOString()}`
    );

    // Query inventory items with employee info (including deleted users)
    const results = await db
      .select({
        employeeId: users.id,
        employeeName: users.name,
        itemsAdded: count(inventoryItems.id),
      })
      .from(inventoryItems)
      .innerJoin(users, eq(inventoryItems.addedBy, users.id))
      .where(
        and(
          gte(inventoryItems.addedAt, fromDate),
          lte(inventoryItems.addedAt, toDate),
          isNotNull(inventoryItems.addedBy),
          isNotNull(inventoryItems.addedAt)
        )
      )
      .groupBy(users.id, users.name)
      .orderBy(desc(count(inventoryItems.id)));

    // Decrypt employee names (they already include "(Deleted)" suffix if user was deleted)
    const decryptedResults = results.map((result) => {
      let decryptedName = 'Unknown User';
      try {
        decryptedName = decryptField(result.employeeName);
      } catch (error) {
        console.error(`Failed to decrypt name for user ${result.employeeId}:`, error);
      }

      return {
        employeeId: result.employeeId,
        employeeName: decryptedName,
        itemsAdded: result.itemsAdded,
      };
    });

    // Calculate summary statistics
    const totalItems = decryptedResults.reduce((sum, emp) => sum + emp.itemsAdded, 0);
    const totalEmployees = decryptedResults.length;
    const averagePerEmployee = totalEmployees > 0 ? Math.round(totalItems / totalEmployees) : 0;

    console.log(`Found ${totalItems} items added by ${totalEmployees} employees`);

    return NextResponse.json({
      success: true,
      data: {
        employees: decryptedResults,
        summary: {
          totalItems,
          totalEmployees,
          averagePerEmployee,
        },
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching inventory adding report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
