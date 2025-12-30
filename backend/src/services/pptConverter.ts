import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * PPT转换服务
 * 使用LibreOffice和pdftoppm将PPT转换为图片
 */
export class PPTConverter {
  private libreOfficePath: string;
  private pdftoppmPath: string;

  constructor() {
    // 检测操作系统并设置命令路径
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS
      this.libreOfficePath = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
      this.pdftoppmPath = 'pdftoppm';
    } else if (platform === 'linux') {
      // Linux
      this.libreOfficePath = 'soffice';
      this.pdftoppmPath = 'pdftoppm';
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * 将PPT转换为图片
   * @param inputPpt 输入的PPT文件路径
   * @param outputDir 输出目录
   * @returns 转换的图片数量
   */
  async convertToImages(inputPpt: string, outputDir: string): Promise<number> {
    console.log(`Starting PPT conversion: ${inputPpt} -> ${outputDir}`);

    try {
      // Step 1: PPT -> PDF
      console.log('Step 1: Converting PPT to PDF...');
      await this.convertToPdf(inputPpt, outputDir);

      // 获取PDF文件路径
      const pdfFilename = path.basename(inputPpt, path.extname(inputPpt)) + '.pdf';
      const pdfPath = path.join(outputDir, pdfFilename);

      // 检查PDF是否存在
      const pdfExists = await this.fileExists(pdfPath);
      if (!pdfExists) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Step 2: PDF -> PNG
      console.log('Step 2: Converting PDF to PNG images...');
      const imageCount = await this.convertPdfToImages(pdfPath, outputDir);

      // Step 3: 清理临时PDF文件
      console.log('Step 3: Cleaning up temporary PDF...');
      await fs.unlink(pdfPath);

      console.log(`✓ PPT conversion completed: ${imageCount} images generated`);
      return imageCount;
    } catch (error) {
      console.error('PPT conversion failed:', error);
      throw error;
    }
  }

  /**
   * PPT转PDF
   */
  private async convertToPdf(inputPpt: string, outputDir: string): Promise<void> {
    const command = `${this.libreOfficePath} --headless --convert-to pdf --outdir "${outputDir}" "${inputPpt}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5分钟超时
        env: { ...process.env, DISPLAY: ':0' } // Linux可能需要
      });

      if (stderr && !stderr.includes('Info')) {
        console.warn('LibreOffice warning:', stderr);
      }
    } catch (error: any) {
      throw new Error(`LibreOffice conversion failed: ${error.message}`);
    }
  }

  /**
   * PDF转PNG图片
   */
  private async convertPdfToImages(pdfPath: string, outputDir: string): Promise<number> {
    const outputPrefix = path.join(outputDir, 'slide_temp');
    const command = `pdftoppm -png "${pdfPath}" "${outputPrefix}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000 // 5分钟超时
      });

      // 查找生成的图片文件
      const files = await fs.readdir(outputDir);
      const pngFiles = files.filter(f => f.startsWith('slide_temp-') && f.endsWith('.png'));

      if (pngFiles.length === 0) {
        throw new Error('No PNG images were generated');
      }

      // 重命名文件: slide_temp-1.png -> slide_0.png
      pngFiles.sort();
      for (let i = 0; i < pngFiles.length; i++) {
        const oldPath = path.join(outputDir, pngFiles[i]);
        const newPath = path.join(outputDir, `slide_${i}.png`);
        await fs.rename(oldPath, newPath);
      }

      console.log(`✓ Generated ${pngFiles.length} PNG images`);
      return pngFiles.length;
    } catch (error: any) {
      throw new Error(`pdftoppm conversion failed: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证依赖工具是否已安装
   */
  async validateDependencies(): Promise<{
    libreOffice: boolean;
    pdftoppm: boolean;
  }> {
    const results = {
      libreOffice: false,
      pdftoppm: false
    };

    // 检查LibreOffice
    try {
      await execAsync(`which ${this.libreOfficePath.split(' ')[0]}`);
      results.libreOffice = true;
      console.log('✓ LibreOffice is available');
    } catch {
      console.error('✗ LibreOffice not found. Please install LibreOffice.');
    }

    // 检查pdftoppm
    try {
      await execAsync(`which ${this.pdftoppmPath}`);
      results.pdftoppm = true;
      console.log('✓ pdftoppm is available');
    } catch {
      console.error('✗ pdftoppm not found. Please install poppler-utils.');
    }

    return results;
  }
}

// 导出单例
let pptConverterInstance: PPTConverter | null = null;

export const getPPTConverter = (): PPTConverter => {
  if (!pptConverterInstance) {
    pptConverterInstance = new PPTConverter();
  }
  return pptConverterInstance;
};

export default PPTConverter;
