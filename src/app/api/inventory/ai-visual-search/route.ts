import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/utils/authMiddleware';
import OpenAI from 'openai';
import { db } from '@/lib/db';
import { inventoryItems, tags, inventoryTags, aiTrainingData } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { decryptTagData } from '@/lib/utils/inventoryEncryption';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to extract Vietnamese patterns and motifs from text intelligently
function extractVietnamesePatterns(text: string): string[] {
  const patterns: string[] = [];
  const lowerText = text.toLowerCase();

  // High-priority Vietnamese cultural patterns that should be recognized first
  const highPriorityPatterns = [
    'gạch men',
    'hoa sen',
    'chim hạc',
    'chữ thọ',
    'tứ linh',
    'tứ quý',
    'bát bửu',
    'phượng hoàng',
    'rồng',
    'lân',
    'hoa mai',
    'hoa đào',
    'hoa cúc',
    'hoa lan',
    'hoa hồng',
    'hoa huệ',
    'hoa ly',
    'mẫu đơn',
    'kẻ ô',
    'ô vuông',
    'hình vuông',
    'song long',
    'long phụng',
    'ngũ phúc',
    'bát tiên',
    'chữ phúc',
    'chữ lộc',
    'chữ khang',
  ];

  // Check for high-priority patterns first
  for (const pattern of highPriorityPatterns) {
    if (lowerText.includes(pattern)) {
      patterns.push(pattern);
    }
  }

  // Common Vietnamese pattern keywords that indicate cultural motifs
  const patternIndicators = [
    'hoa văn',
    'họa tiết',
    'motif',
    'pattern',
    'design',
    'thêu',
    'embroidery',
    'hoa',
    'flower',
    'chim',
    'bird',
    'rồng',
    'dragon',
    'phượng',
    'phoenix',
    'chữ',
    'letter',
    'ký tự',
    'symbol',
    'biểu tượng',
    'truyền thống',
    'traditional',
    'văn hóa',
    'cultural',
    'dân tộc',
    'ethnic',
    'cổ truyền',
    'ancient',
    'gạch',
    'men',
  ];

  // Extract potential patterns by looking for descriptive phrases
  const words = lowerText.split(/\s+/);

  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];

    // Look for pattern indicators followed by descriptive words
    if (patternIndicators.includes(currentWord) && nextWord) {
      const potentialPattern = `${currentWord} ${nextWord}`;
      if (!patterns.includes(potentialPattern)) {
        patterns.push(potentialPattern);
      }
    }

    // Look for standalone cultural words
    if (currentWord.length > 2 && isVietnameseCulturalWord(currentWord)) {
      if (!patterns.includes(currentWord)) {
        patterns.push(currentWord);
      }
    }
  }

  // Also extract any words that appear to be cultural patterns based on context
  const culturalContextWords = extractCulturalContextWords(lowerText);
  patterns.push(...culturalContextWords);

  // Remove duplicates and limit to top 15 patterns
  const uniquePatterns = [...new Set(patterns)];
  return uniquePatterns.slice(0, 15);
}

// Function to check if a word is likely a Vietnamese cultural term
function isVietnameseCulturalWord(word: string): boolean {
  // Vietnamese cultural words often have specific characteristics
  const culturalSuffixes = ['sen', 'mai', 'đào', 'cúc', 'lan', 'hồng', 'huệ', 'ly'];
  const culturalPrefixes = ['hoa', 'chim', 'chữ', 'tứ', 'bát', 'ngũ', 'song'];

  return (
    culturalSuffixes.some((suffix) => word.endsWith(suffix)) ||
    culturalPrefixes.some((prefix) => word.startsWith(prefix)) ||
    (word.length >= 4 &&
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(word))
  );
}

// Function to extract cultural context words from text
function extractCulturalContextWords(text: string): string[] {
  const culturalWords: string[] = [];

  // Look for phrases that describe cultural elements
  const culturalPhrases = [
    /hoa văn\s+(\w+)/g,
    /họa tiết\s+(\w+)/g,
    /thêu\s+(\w+)/g,
    /chữ\s+(\w+)/g,
    /(\w+)\s+hoa/g,
    /(\w+)\s+chim/g,
    /(\w+)\s+long/g,
    /(\w+)\s+phượng/g,
  ];

  culturalPhrases.forEach((regex) => {
    const matches = text.match(regex);
    if (matches) {
      matches.forEach((match) => {
        const word = match.split(/\s+/)[1];
        if (word && word.length > 2 && !culturalWords.includes(word)) {
          culturalWords.push(word);
        }
      });
    }
  });

  return culturalWords;
}

// Cache for inventory knowledge base
let inventoryKnowledgeBase: string[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Store verification status for AI search
// Note: This is in-memory storage and will be cleared when the server restarts
const aiSearchVerifications = new Map<string, { verified: boolean; expiresAt: number }>();

async function buildInventoryKnowledgeBase() {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_DURATION && inventoryKnowledgeBase.length > 0) {
    return inventoryKnowledgeBase;
  }

  try {
    // Try to get training data first (if available)
    const trainingData = await db
      .select({
        name: aiTrainingData.name,
        category: aiTrainingData.category,
        imageUrl: aiTrainingData.imageUrl,
        tags: aiTrainingData.tags,
        description: aiTrainingData.description,
      })
      .from(aiTrainingData)
      .where(eq(aiTrainingData.isActive, true))
      .limit(100);

    if (trainingData.length > 0) {
      // Use training data with enhanced pattern recognition
      const knowledgeEntries = trainingData.map((item) => {
        const tags = item.tags ? JSON.parse(item.tags) : [];
        const hasImage = item.imageUrl ? 'Có hình ảnh' : 'Không có hình ảnh';

        // Extract Vietnamese patterns and motifs from description
        const description = item.description || '';
        const patterns = extractVietnamesePatterns(description);

        return `SẢN PHẨM: ${item.name} | DANH MỤC: ${item.category} | HÌNH ẢNH: ${hasImage} | HOA VĂN: ${patterns.join(', ')} | TAGS: ${tags.join(', ')} | MÔ TẢ: ${item.description}`;
      });

      inventoryKnowledgeBase = knowledgeEntries;
      lastCacheUpdate = now;

      console.log(`Using training data with ${knowledgeEntries.length} items`);
      return knowledgeEntries;
    } else {
      // Fallback to sample data with pattern extraction
      const sampleItems = await db
        .select({
          id: inventoryItems.id,
          name: inventoryItems.name,
          category: inventoryItems.category,
          imageUrl: inventoryItems.imageUrl,
        })
        .from(inventoryItems)
        .limit(100);

      // Get tags for these items
      const itemIds = sampleItems.map((item) => item.id);
      const itemTags = await db
        .select({
          itemId: inventoryTags.itemId,
          tagName: tags.name,
        })
        .from(inventoryTags)
        .innerJoin(tags, eq(inventoryTags.tagId, tags.id))
        .where(inArray(inventoryTags.itemId, itemIds));

      // Group tags by item
      const tagsByItem = itemTags.reduce(
        (acc, tag) => {
          if (!acc[tag.itemId]) acc[tag.itemId] = [];
          acc[tag.itemId].push(decryptTagData({ name: tag.tagName }).name);
          return acc;
        },
        {} as Record<number, string[]>
      );

      // Build knowledge base entries with pattern recognition
      const knowledgeEntries = sampleItems.map((item) => {
        const itemTags = tagsByItem[item.id] || [];
        const hasImage = item.imageUrl ? 'Có hình ảnh' : 'Không có hình ảnh';

        // Extract patterns from item name and tags
        const allText = `${item.name} ${itemTags.join(' ')}`;
        const patterns = extractVietnamesePatterns(allText);

        return `SẢN PHẨM: ${item.name} | DANH MỤC: ${item.category} | HÌNH ẢNH: ${hasImage} | HOA VĂN: ${patterns.join(', ')} | TAGS: ${itemTags.join(', ')}`;
      });

      inventoryKnowledgeBase = knowledgeEntries;
      lastCacheUpdate = now;

      console.log(`Built knowledge base with ${knowledgeEntries.length} items`);
      return knowledgeEntries;
    }
  } catch (error) {
    console.error('Failed to build knowledge base:', error);
    return [];
  }
}

export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Check if this is a verification check request (JSON)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.checkVerification) {
        console.log('🔍 API: Verification check requested');
        console.log('🔍 API: Verification map size:', aiSearchVerifications.size);
        console.log(
          '🔍 API: Verification map entries:',
          Array.from(aiSearchVerifications.entries())
        );

        // Check if user has verified AI search access
        const userId = request.user?.id?.toString() || 'unknown';
        console.log('🔍 API: User ID:', userId);
        const verification = aiSearchVerifications.get(userId);
        console.log('🔍 API: Verification status:', verification);
        console.log('🔍 API: Current time:', Date.now());

        // Check if verification exists, is verified, and not expired
        const isVerified =
          verification && verification.verified && Date.now() <= verification.expiresAt;

        console.log('🔍 API: Is verified:', isVerified);

        if (!isVerified) {
          console.log('🔒 API: Verification required, returning 403');
          return NextResponse.json(
            {
              error: 'Yêu cầu xác thực',
              reason: 'verification_required',
              message: 'Bạn cần xác thực để sử dụng tính năng Sutygon-Bot',
            },
            { status: 403 }
          );
        }

        console.log('✅ API: Verification successful');
        return NextResponse.json({
          success: true,
          message: 'Đã xác thực Sutygon-Bot',
        });
      }
    }

    // For form data (actual image search)
    if (contentType.includes('multipart/form-data')) {
      // Check if user has verified AI search access for actual search
      const userId = request.user?.id?.toString() || 'unknown';
      const verification = aiSearchVerifications.get(userId);

      if (!verification || !verification.verified || Date.now() > verification.expiresAt) {
        return NextResponse.json(
          {
            error: 'Yêu cầu xác thực',
            reason: 'verification_required',
            message: 'Bạn cần xác thực để sử dụng tính năng Sutygon-Bot',
          },
          { status: 403 }
        );
      }

      const formData = await request.formData();
      const imageFile = formData.get('image') as File;
      const userQuery = (formData.get('query') as string) || '';

      if (!imageFile) {
        return NextResponse.json({ error: 'Không có hình ảnh được cung cấp' }, { status: 400 });
      }

      if (!imageFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Loại tệp không hợp lệ. Chỉ cho phép tệp hình ảnh.' },
          { status: 400 }
        );
      }

      // Build inventory knowledge base
      const knowledgeBase = await buildInventoryKnowledgeBase();
      const knowledgeContext = knowledgeBase.slice(0, 20).join('\n'); // Use top 20 items for context

      // Convert image to base64
      const arrayBuffer = await imageFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${imageFile.type};base64,${base64}`;

      // Also search the database for items with relevant patterns
      let databaseSearchResults: Record<string, unknown>[] = [];
      let patterns: string[] = []; // Move to outer scope
      try {
        // First, let the AI analyze the image to identify patterns
        const imageAnalysisPrompt = `
Bạn là chuyên gia phân tích hình ảnh thời trang Việt Nam. Hãy phân tích hình ảnh này và xác định các hoa văn văn hóa Việt Nam có thể nhìn thấy.

Đặc biệt chú ý đến các hoa văn sau:
- "gạch men" (hoa văn gạch mosaic)
- "hoa sen" (hoa sen)
- "chim hạc" (chim hạc)
- "chữ thọ" (chữ thọ)
- "tứ linh" (rồng, lân, quy, phụng)
- "tứ quý" (mai, lan, cúc, trúc)
- "bát bửu" (8 bảo vật)
- "phượng hoàng" (phượng hoàng)
- "rồng" (rồng)
- "lân" (lân)

Trả lời bằng JSON với format:
{
  "patterns": ["hoa văn 1", "hoa văn 2"],
  "colors": ["màu chính", "màu phụ"],
  "style": "phong cách",
  "description": "mô tả ngắn gọn"
}

Chỉ trả lời bằng JSON, không có text khác.
        `;

        const imageAnalysisResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: imageAnalysisPrompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: dataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        });

        console.log('🔍 Full AI response object:', JSON.stringify(imageAnalysisResponse, null, 2));
        console.log('🔍 AI response choices:', imageAnalysisResponse.choices);
        console.log('🔍 AI response usage:', imageAnalysisResponse.usage);

        const imageAnalysis = imageAnalysisResponse.choices[0]?.message?.content;
        console.log('🔍 Raw AI image analysis response:', imageAnalysis);

        // Check if AI response is empty or contains error
        if (!imageAnalysis) {
          console.error('🔍 AI returned empty response');
          throw new Error('AI returned empty response');
        }

        if (
          imageAnalysis.toLowerCase().includes("i'm sorry") ||
          imageAnalysis.toLowerCase().includes("can't assist") ||
          imageAnalysis.toLowerCase().includes('cannot assist')
        ) {
          console.error('🔍 AI rejected the request:', imageAnalysis);
          throw new Error(`AI rejected the request: ${imageAnalysis}`);
        }

        // Extract patterns from the analysis
        try {
          if (imageAnalysis) {
            console.log('🔍 Attempting to parse AI response as JSON:', imageAnalysis);
            const analysis = JSON.parse(imageAnalysis);
            patterns = analysis.patterns || [];
            console.log('🔍 Parsed AI analysis:', analysis);
            console.log('🔍 Extracted patterns from AI analysis:', patterns);
          }
        } catch (parseError) {
          console.error('🔍 Failed to parse image analysis as JSON:', parseError);
          console.log('🔍 Raw analysis that failed to parse:', imageAnalysis);

          // Try to extract patterns from text response if JSON parsing fails
          if (imageAnalysis) {
            console.log('🔍 Attempting to extract patterns from text response...');
            const textPatterns = extractVietnamesePatterns(imageAnalysis);
            if (textPatterns.length > 0) {
              patterns = textPatterns;
              console.log('🔍 Extracted patterns from text response:', patterns);
            } else {
              console.log('🔍 No patterns could be extracted from text response');
            }
          }
        }

        // If no patterns found, use default Vietnamese patterns
        if (patterns.length === 0) {
          patterns = [
            'gạch men',
            'hoa sen',
            'chim hạc',
            'chữ thọ',
            'tứ linh',
            'tứ quý',
            'bát bửu',
            'phượng hoàng',
            'rồng',
            'lân',
          ];
          console.log('🔍 No patterns found in AI analysis, using default patterns:', patterns);
        }

        console.log('🔍 Final patterns to search for:', patterns);

        // Search for items with the identified patterns
        for (const pattern of patterns) {
          console.log(`🔍 Searching for pattern: "${pattern}"`);
          const searchUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory/search-typesense?q=${encodeURIComponent(pattern)}&limit=5`;
          console.log(`🔍 Search URL: ${searchUrl}`);

          const searchResponse = await fetch(searchUrl, {
            headers: {
              Authorization: `Bearer ${request.headers.get('authorization')}`,
            },
          });

          console.log(`🔍 Search response status for "${pattern}":`, searchResponse.status);
          console.log(
            `🔍 Search response headers:`,
            Object.fromEntries(searchResponse.headers.entries())
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            console.log(`🔍 Search data for "${pattern}":`, JSON.stringify(searchData, null, 2));
            if (searchData.items && searchData.items.length > 0) {
              console.log(
                `🔍 Found ${searchData.items.length} items for pattern "${pattern}":`,
                searchData.items.map((item: Record<string, unknown>) => item.name as string)
              );
              databaseSearchResults.push(...searchData.items);
            } else {
              console.log(
                `🔍 No items found for pattern "${pattern}" - search returned empty results`
              );
            }
          } else {
            const errorText = await searchResponse.text();
            console.log(
              `🔍 Search failed for pattern "${pattern}":`,
              searchResponse.status,
              searchResponse.statusText,
              errorText
            );
          }
        }

        // Remove duplicates
        databaseSearchResults = databaseSearchResults.filter(
          (item, index, self) => index === self.findIndex((t) => t.id === item.id)
        );

        console.log(
          `🔍 Database search found ${databaseSearchResults.length} items with patterns:`,
          patterns
        );
      } catch (searchError) {
        console.warn('Database search failed:', searchError);
      }

      // Enhanced prompt with inventory knowledge
      const prompt = `
Bạn là một chuyên gia thời trang Việt Nam chuyên về áo dài và trang phục truyền thống. Bạn có kiến thức sâu rộng về kho hàng Sutygon và các hoa văn văn hóa Việt Nam.

=== KIẾN THỨC VỀ KHO HÀNG SUTYGON ===
${knowledgeContext}
=== HẾT KIẾN THỨC KHO HÀNG ===

${
  databaseSearchResults.length > 0
    ? `
=== KẾT QUẢ TÌM KIẾM CƠ SỞ DỮ LIỆU ===
${databaseSearchResults.map((item) => `SẢN PHẨM: ${item.name} | DANH MỤC: ${item.category} | ID: ${item.formattedId}`).join('\n')}
=== HẾT KẾT QUẢ TÌM KIẾM ===
`
    : ''
}

NHIỆM VỤ: Phân tích hình ảnh này và tìm sản phẩm tương tự nhất trong kho hàng Sutygon, sử dụng kiến thức về hoa văn từ dữ liệu huấn luyện.

QUY TẮC PHÂN TÍCH:
1. **Ưu tiên hoa văn văn hóa**: Tìm kiếm các hoa văn đặc trưng như "gạch men", "hoa sen", "chim hạc", "chữ thọ", "tứ linh", v.v.
2. **Sử dụng từ vựng chính xác**: Dùng đúng tên hoa văn Việt Nam như "gạch men" cho hoa văn gạch, "hoa sen" cho hoa sen, v.v.
3. **So sánh chính xác**: Khớp hoa văn, màu sắc, chất liệu với sản phẩm trong kho hàng
4. **Chỉ đề xuất sản phẩm thực**: Không tạo sản phẩm không có trong kho hàng

PHÂN TÍCH CHI TIẾT:
- **Loại sản phẩm**: Xác định chính xác từ danh mục có sẵn
- **Hoa văn**: Tìm kiếm và sử dụng tên hoa văn chính xác như "gạch men", "hoa sen", "chim hạc", "chữ thọ", "tứ linh", "tứ quý", "bát bửu"
- **Màu sắc**: Liệt kê màu chính và màu phụ có thể nhìn thấy
- **Chất liệu**: Xác định từ mô tả sản phẩm (lụa, gấm, thổ cẩm, v.v.)
- **Phong cách**: Truyền thống, hiện đại, trang trọng, thường ngày
- **Đặc điểm**: Cổ áo, tay áo, đường may, chi tiết đặc biệt

${userQuery ? `YÊU CẦU CỤ THỂ: ${userQuery}` : ''}

TRẢ LỜI BẰNG JSON:
{
  "description": "Mô tả tổng quan về sản phẩm trong hình, sử dụng từ vựng tương tự như trong kho hàng",
  "category": "Danh mục chính xác (chỉ chọn từ: Áo dài, Áo sơ mi, Quần, Váy, Áo khoác, Phụ kiện)",
  "colors": ["Màu chính", "Màu phụ"],
  "pattern": "Mô tả hoa văn sử dụng tên chính xác như 'gạch men', 'hoa sen', 'chim hạc', 'chữ thọ', v.v.",
  "style": "Phong cách",
  "materials": ["Chất liệu chính"],
  "features": ["Đặc điểm nổi bật"],
  "keywords": ["Từ khóa 1", "Từ khóa 2", "Từ khóa 3"],
  "similarItems": ["Tên sản phẩm TƯƠNG TỰ NHẤT từ kho hàng", "Tên sản phẩm thứ 2 nếu có"]
}

QUAN TRỌNG:
- Tất cả giá trị phải bằng tiếng Việt
- "similarItems" chỉ chứa tên sản phẩm CÓ THỰC trong kho hàng Sutygon
- Sử dụng tên hoa văn chính xác như "gạch men", "hoa sen", "chim hạc", "chữ thọ", "tứ linh", v.v.
- Ưu tiên sản phẩm có hoa văn tương tự từ trường "HOA VĂN"
- Nếu không tìm thấy sản phẩm tương tự, để trống "similarItems"
- Tập trung vào độ chính xác, không tạo thông tin giả
- Ưu tiên sản phẩm có hình ảnh trong kho hàng
- Học và sử dụng các hoa văn từ dữ liệu huấn luyện thay vì danh sách cố định
- Đặc biệt chú ý đến hoa văn "gạch men" khi thấy hoa văn gạch mosaic
`;

      // Call OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 800,
      });

      const aiResponse = response.choices[0]?.message?.content;

      if (!aiResponse) {
        return NextResponse.json({ error: 'Phân tích AI thất bại' }, { status: 500 });
      }

      // Parse the JSON response
      let analysis;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        console.error('Failed to parse AI response:', aiResponse);
        return NextResponse.json(
          {
            error: 'Không thể phân tích kết quả AI',
            rawResponse: aiResponse,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        analysis,
        rawResponse: aiResponse,
        knowledgeBaseSize: knowledgeBase.length,
        databaseSearchResults: databaseSearchResults.slice(0, 10), // Include up to 10 database search results
        searchTermsUsed: patterns, // Use the patterns found by AI
        debug: {
          patternsFound: patterns,
          databaseSearchCount: databaseSearchResults.length,
          databaseSearchItems: databaseSearchResults.map((item: Record<string, unknown>) => ({
            id: item.id,
            name: item.name,
            category: item.category,
          })),
          searchUrls: patterns.map(
            (pattern) =>
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/inventory/search-typesense?q=${encodeURIComponent(pattern)}&limit=5`
          ),
        },
      });
    }

    // If neither JSON nor form data, return error
    return NextResponse.json(
      {
        error: 'Content type không được hỗ trợ',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('AI visual search error:', error);
    return NextResponse.json(
      {
        error: 'Phân tích AI thất bại',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

// Endpoint to mark AI search as verified for a user
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      console.log('⚠️ No JSON body in PUT request, using empty object');
    }

    // Debug endpoint to clear verification map
    if (body.clearVerification) {
      aiSearchVerifications.clear();
      console.log('🧹 Cleared verification map');
      return NextResponse.json({
        success: true,
        message: 'Verification map cleared',
      });
    }

    const userId = request.user?.id?.toString() || 'unknown';

    // Mark user as verified for AI search (valid for 1 hour)
    aiSearchVerifications.set(userId, {
      verified: true,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    console.log('✅ User verified for AI search:', userId);

    return NextResponse.json({
      success: true,
      message: 'Xác thực Sutygon-Bot thành công',
    });
  } catch (error) {
    console.error('AI search verification error:', error);
    return NextResponse.json({ error: 'Xác thực thất bại' }, { status: 500 });
  }
});
