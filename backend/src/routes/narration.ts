import { Router, Request, Response } from 'express';
import { getAIService } from '../services/aiService.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';
import { getJobManager } from '../services/jobManager.js';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

/**
 * POST /webhook/api/generate-narration
 * Generate narration for a specific slide on demand
 */
router.post(
  '/generate-narration',
  asyncHandler(async (req: Request, res: Response) => {
    const { jobId, slideId, slideTitle, slideContent, slideNotes } = req.body;

    logger.info('Generating narration for slide', { jobId, slideId });

    if (!jobId || slideId === undefined) {
      return res.status(400).json({
        success: false,
        error: 'jobId and slideId are required'
      });
    }

    try {
      // Get job to retrieve AI settings
      const jobManager = getJobManager();
      const job = jobManager.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      // Initialize AI service with job settings
      const aiService = getAIService(
        job.metadata.aiProvider || '',
        job.metadata.aiApiKey || '',
        job.metadata.aiModel || '',
        job.metadata.aiBaseUrl
      );

      // Generate narration using existing generateSpeech method
      const narration = await aiService.generateSpeech(
        slideTitle || '',
        slideContent || '',
        slideNotes || ''
      );

      // Clean up excessive newlines and normalize whitespace
      const cleanedNarration = narration
        .replace(/\n+/g, '\n')  // Replace multiple consecutive newlines with single newline
        .replace(/\n\s*\n/g, '\n')  // Remove blank lines
        .trim();  // Remove leading/trailing whitespace

      // Update notes.json file to include the new narration
      const jobDir = jobManager.getJobDir(jobId);
      const notesPath = path.join(jobDir, 'notes.json');

      let existingNotes = [];
      try {
        const notesData = await fs.readFile(notesPath, 'utf-8');
        existingNotes = JSON.parse(notesData);
      } catch (error) {
        // If notes.json doesn't exist, start with an empty array
        existingNotes = [];
      }

      // Update or add the narration for the specific slide
      const noteIndex = existingNotes.findIndex((note: any) => note.id === slideId);
      if (noteIndex !== -1) {
        existingNotes[noteIndex].note = cleanedNarration;
      } else {
        existingNotes.push({ id: slideId, note: cleanedNarration });
      }

      // Save updated notes back to file
      await fs.writeFile(notesPath, JSON.stringify(existingNotes, null, 2), 'utf-8');

      logger.success(`Narration generated for slide ${slideId} in job ${jobId}`);

      res.json({
        success: true,
        data: {
          slideId,
          narration: cleanedNarration
        }
      });
    } catch (error: any) {
      logger.error('Narration generation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  })
);

export default router;