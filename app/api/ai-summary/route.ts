interface AiSummary {
  verdict?: string;
  investmentThesis?: string;
  businessOverview?: string;
  keyDrivers?: string;
  technicalAnalysis?: string;
  newsCommentary?: string;
  valuationOutlook?: string;
  risks?: string;
  recommendationSummary?: string;
  error?: string;
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from "openai";
import buildAiSummaryPrompt from "@/app/utils/buildAiSummaryPrompt";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { ticker, data } = await req.json();
  if (!ticker) {
    return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  let parsedData;
  try {
    parsedData = data;
  } catch {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
  }

  const aiPrompt = buildAiSummaryPrompt(ticker, parsedData);

  let aiSummary: AiSummary | null = null;
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        { role: "system", content: "You are a financial analyst who outputs strictly JSON responses as instructed." },
        { role: "user", content: aiPrompt }
      ],
    });
    const rawContent = completion.choices[0].message?.content?.trim() || null;
    try {
      aiSummary = rawContent ? JSON.parse(rawContent) : { error: "No summary available." };
    } catch (err) {
      console.error("Failed to parse AI JSON:", rawContent);
      aiSummary = { error: "Failed to parse AI response JSON." };
    }
    if (aiSummary && typeof aiSummary === 'object' && !aiSummary.verdict) {
      aiSummary.verdict = "Neutral";
    }
    // Validate required fields
    const requiredFields = ["investmentThesis", "businessOverview", "verdict"];
    for (const field of requiredFields) {
      if (!(field in aiSummary!)) {
        console.warn(`Missing field in AI summary: ${field}`);
      }
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    aiSummary = { error: "No summary available due to an error." };
  }

  return NextResponse.json({ aiSummary });
}