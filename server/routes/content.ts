import express, { Router, Request, Response } from 'express';
import claudeService from '../services/claude';

const contentRouter = Router();

/**
 * Generate content using Claude AI
 */
contentRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      title,
      productDescription,
      keywords,
      toneOfVoice,
      writingPerspective,
      articleLength,
      enableTables,
      enableLists,
      enableH3s,
      headingsCount,
      introType,
      enableCitations,
      faqType,
      region,
      buyerProfile
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    // Generate content using Claude service
    const content = await claudeService.generateBlogContent({
      title,
      productDescription,
      keywords: Array.isArray(keywords) ? keywords : [],
      toneOfVoice: toneOfVoice || 'friendly',
      writingPerspective: writingPerspective || 'first_person_plural',
      articleLength: articleLength || 'medium',
      enableTables: enableTables === undefined ? true : enableTables,
      enableLists: enableLists === undefined ? true : enableLists,
      enableH3s: enableH3s === undefined ? true : enableH3s,
      headingsCount: headingsCount || '3',
      introType: introType || 'search_intent',
      enableCitations: enableCitations === undefined ? true : enableCitations,
      faqType: faqType || 'short',
      region: region || 'us',
      buyerProfile: buyerProfile || 'auto'
    });

    return res.status(200).json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error generating content:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default contentRouter;