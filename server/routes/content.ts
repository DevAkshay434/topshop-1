import { Router, Request, Response } from 'express';
import claudeService from '../services/claude';

const contentRouter = Router();

// Generate content with Claude API
contentRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const {
      title,
      productDescription,
      keywords,
      toneOfVoice,
      writingPerspective,
      articleLength,
      headingsCount,
      introType,
      enableLists,
      enableTables,
      enableH3s,
      enableCitations,
      faqType,
      region,
      buyerProfile
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for content generation'
      });
    }

    const result = await claudeService.generateContent({
      title,
      productDescription,
      keywords,
      toneOfVoice,
      writingPerspective,
      articleLength,
      headingsCount,
      introType,
      enableLists,
      enableTables,
      enableH3s,
      enableCitations,
      faqType,
      region,
      buyerProfile
    });

    res.json({
      success: true,
      content: result
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate content'
    });
  }
});

// Generate image prompt
contentRouter.post('/image-prompt', async (req: Request, res: Response) => {
  try {
    const { title, productDescription } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required for image prompt generation'
      });
    }

    const imagePrompt = await claudeService.generateImagePrompt(title, productDescription);

    res.json({
      success: true,
      prompt: imagePrompt
    });
  } catch (error) {
    console.error('Error generating image prompt:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate image prompt'
    });
  }
});

// Analyze content
contentRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required for analysis'
      });
    }

    const analysis = await claudeService.analyzeContent(content);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze content'
    });
  }
});

export default contentRouter;