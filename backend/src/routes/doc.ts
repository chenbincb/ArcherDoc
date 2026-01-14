import { Router, Request, Response } from 'express';
import DocxGenerator from '../services/docxGenerator.js';
import { asyncHandler } from '../middleware/error.js';
import { logger } from '../middleware/logger.js';

const router = Router();

/**
 * POST /webhook/api/generate-docx
 * 根据翻译后的结构化数据生成 Word 文档
 */
router.post(
    '/generate-docx',
    asyncHandler(async (req: Request, res: Response) => {
        const { slides, filename } = req.body;

        logger.info('Generating Word document from items');

        if (!slides || !Array.isArray(slides)) {
            return res.status(400).json({
                success: false,
                error: 'slides array is required'
            });
        }

        try {
            const docxGenerator = new DocxGenerator();
            const buffer = await docxGenerator.generateFromContent(slides);

            const downloadName = filename || 'translated_document.docx';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);

            res.send(buffer);
            logger.success('Word document generated successfully');
        } catch (error: any) {
            logger.error('Word generation failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    })
);

export default router;
