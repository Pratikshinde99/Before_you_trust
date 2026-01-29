import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
  { id: 'fraud', name: 'Fraud', description: 'Intentional deception for financial or personal gain' },
  { id: 'scam', name: 'Scam', description: 'Schemes designed to deceive victims' },
  { id: 'harassment', name: 'Harassment', description: 'Unwanted, aggressive behavior' },
  { id: 'misrepresentation', name: 'Misrepresentation', description: 'False or misleading claims about products, services, or identity' },
  { id: 'non_delivery', name: 'Non-Delivery', description: 'Failure to deliver promised goods or services' },
  { id: 'quality_issue', name: 'Quality Issue', description: 'Products or services not meeting stated specifications' },
  { id: 'safety_concern', name: 'Safety Concern', description: 'Potential harm to health or safety' },
  { id: 'data_breach', name: 'Data Breach', description: 'Unauthorized access to personal information' },
  { id: 'unauthorized_charges', name: 'Unauthorized Charges', description: 'Charges made without consent' },
  { id: 'other', name: 'Other', description: 'Incidents not fitting other categories' },
];

const SYSTEM_PROMPT = `You are a neutral incident categorization assistant for the "Before You Trust" platform. Your role is to analyze incident descriptions and categorize them objectively.

RULES:
- Be neutral and factual - never use accusatory or emotional language
- Do not make legal judgments or determinations of guilt
- Focus on observable behaviors and stated facts
- Provide confidence levels based on clarity of information
- When uncertain, acknowledge limitations

Available categories:
${CATEGORIES.map(c => `- ${c.id}: ${c.description}`).join('\n')}

Analyze the incident and provide:
1. Primary category (most fitting)
2. Secondary category (if applicable)
3. Confidence score (0-100)
4. Brief explanation of categorization logic (neutral, factual)
5. Key indicators that led to this categorization`;

/**
 * POST /ai-categorize-incident
 * 
 * Categorizes an incident into standardized types using AI
 * 
 * Request body: {
 *   title: string,
 *   description: string,
 *   what_was_promised?: string,
 *   what_actually_happened?: string
 * }
 * 
 * Response: {
 *   primary_category: string,
 *   secondary_category: string | null,
 *   confidence: number (0-100),
 *   explanation: string,
 *   indicators: string[],
 *   processing_note: string
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, description, what_was_promised, what_actually_happened } = await req.json();

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: 'Title and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `Please categorize this incident:

Title: ${title}
Description: ${description}
${what_was_promised ? `What was promised: ${what_was_promised}` : ''}
${what_actually_happened ? `What actually happened: ${what_actually_happened}` : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'categorize_incident',
              description: 'Categorize an incident into standardized types',
              parameters: {
                type: 'object',
                properties: {
                  primary_category: {
                    type: 'string',
                    enum: CATEGORIES.map(c => c.id),
                    description: 'The primary category for this incident'
                  },
                  secondary_category: {
                    type: 'string',
                    enum: [...CATEGORIES.map(c => c.id), 'none'],
                    description: 'A secondary category if applicable, or "none"'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0-100'
                  },
                  explanation: {
                    type: 'string',
                    description: 'Neutral, factual explanation of categorization logic'
                  },
                  indicators: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key indicators that led to this categorization'
                  }
                },
                required: ['primary_category', 'confidence', 'explanation', 'indicators'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_incident' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI categorization failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        primary_category: result.primary_category,
        secondary_category: result.secondary_category === 'none' ? null : result.secondary_category,
        confidence: result.confidence,
        explanation: result.explanation,
        indicators: result.indicators,
        processing_note: 'Categorization is AI-assisted and should be reviewed. It does not constitute a legal determination.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
