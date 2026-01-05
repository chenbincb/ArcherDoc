import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JobData, JobType, JobStatus } from '../types/index.js';

/**
 * Job管理服务
 * 负责任务的创建、更新、查询和清理
 */
export class JobManager {
  private jobs: Map<string, JobData> = new Map();
  private readonly jobsDir: string;
  private readonly retentionDays: number;

  constructor(jobsDir: string = './jobs', retentionDays: number = 7) {
    this.jobsDir = jobsDir;
    this.retentionDays = retentionDays;
    this.initialize();
  }

  /**
   * 初始化Job管理器
   */
  private async initialize(): Promise<void> {
    try {
      // 确保目录存在
      await fs.mkdir(this.jobsDir, { recursive: true });

      // 从文件系统恢复Job数据(服务重启时)
      await this.loadExistingJobs();

      // 启动定时清理任务
      this.startCleanupScheduler();

      console.log(`✓ JobManager initialized with ${this.jobs.size} existing jobs`);
    } catch (error) {
      console.error('Failed to initialize JobManager:', error);
    }
  }

  /**
   * 创建新Job
   */
  async createJob(
    type: JobType,
    filename: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const jobDir = path.join(this.jobsDir, jobId);

    // 创建Job目录结构
    await fs.mkdir(jobDir, { recursive: true });
    await fs.mkdir(path.join(jobDir, 'slides'), { recursive: true });
    await fs.mkdir(path.join(jobDir, 'audio'), { recursive: true });
    await fs.mkdir(path.join(jobDir, 'video'), { recursive: true });
    await fs.mkdir(path.join(jobDir, 'images'), { recursive: true });

    // 创建Job数据
    const jobData: JobData = {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      metadata: {
        originalFilename: filename,
        ...metadata
      }
    };

    // 保存到内存和文件
    this.jobs.set(jobId, jobData);
    await this.saveJobMetadata(jobId, jobData);

    console.log(`✓ Created job ${jobId} (${type}): ${filename}`);
    return jobId;
  }

  /**
   * 更新Job状态
   */
  async updateJob(jobId: string, updates: Partial<JobData>): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // 合并更新
    Object.assign(job, updates);

    // 持久化到文件
    await this.saveJobMetadata(jobId, job);

    console.log(`✓ Updated job ${jobId}: status=${job.status}, progress=${job.progress}%`);
  }

  /**
   * 获取Job
   */
  getJob(jobId: string): JobData | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 获取所有Job
   */
  getAllJobs(): JobData[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 保存Job元数据到文件
   */
  private async saveJobMetadata(jobId: string, data: JobData): Promise<void> {
    try {
      const metadataPath = path.join(this.jobsDir, jobId, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Failed to save metadata for job ${jobId}:`, error);
    }
  }

  /**
   * 从文件系统加载现有Job
   */
  private async loadExistingJobs(): Promise<void> {
    try {
      const jobDirs = await fs.readdir(this.jobsDir);

      for (const jobId of jobDirs) {
        // 跳过隐藏文件
        if (jobId.startsWith('.')) continue;

        const metadataPath = path.join(this.jobsDir, jobId, 'metadata.json');
        try {
          const content = await fs.readFile(metadataPath, 'utf-8');
          const jobData: JobData = JSON.parse(content);

          // 转换日期对象
          jobData.createdAt = new Date(jobData.createdAt);
          if (jobData.completedAt) {
            jobData.completedAt = new Date(jobData.completedAt);
          }

          this.jobs.set(jobId, jobData);
        } catch (error) {
          console.error(`Failed to load job ${jobId}:`, error);
        }
      }

      console.log(`✓ Loaded ${this.jobs.size} existing jobs from disk`);
    } catch (error) {
      console.error('Failed to load existing jobs:', error);
    }
  }

  /**
   * 启动定时清理任务
   */
  private startCleanupScheduler(): void {
    // 计算下次运行时间(每天凌晨2点)
    const scheduleNextRun = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      const delay = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        this.cleanupExpiredJobs();
        scheduleNextRun(); // 递归调度
      }, delay);

      console.log(`✓ Next cleanup scheduled at ${tomorrow.toISOString()}`);
    };

    scheduleNextRun();
  }

  /**
   * 清理过期Job
   */
  private async cleanupExpiredJobs(): Promise<void> {
    const now = Date.now();
    const expiredTime = now - this.retentionDays * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    console.log(`Starting cleanup of jobs older than ${this.retentionDays} days...`);

    for (const [jobId, job] of this.jobs) {
      if (job.createdAt.getTime() < expiredTime) {
        try {
          const jobDir = path.join(this.jobsDir, jobId);
          await fs.rm(jobDir, { recursive: true, force: true });
          this.jobs.delete(jobId);
          cleanedCount++;
          console.log(`✓ Cleaned up expired job: ${jobId}`);
        } catch (error) {
          console.error(`✗ Failed to cleanup job ${jobId}:`, error);
        }
      }
    }

    console.log(`Cleanup completed: ${cleanedCount} jobs removed`);
  }

  /**
   * 手动删除指定Job
   */
  async deleteJob(jobId: string): Promise<void> {
    const jobDir = path.join(this.jobsDir, jobId);
    await fs.rm(jobDir, { recursive: true, force: true });
    this.jobs.delete(jobId);
    console.log(`✓ Deleted job: ${jobId}`);
  }

  /**
   * 获取Job目录路径
   */
  getJobDir(jobId: string): string {
    return path.join(this.jobsDir, jobId);
  }

  /**
   * 获取Job统计信息
   */
  getStats(): {
    total: number;
    byStatus: Record<JobStatus, number>;
    byType: Record<JobType, number>;
  } {
    const stats = {
      total: this.jobs.size,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0
      },
      byType: {
        article: 0,
        video: 0,
        image: 0,
        translation: 0
      }
    };

    for (const job of this.jobs.values()) {
      stats.byStatus[job.status]++;
      stats.byType[job.type]++;
    }

    return stats;
  }
}

// 导出单例
let jobManagerInstance: JobManager | null = null;

export const getJobManager = (): JobManager => {
  if (!jobManagerInstance) {
    jobManagerInstance = new JobManager(
      process.env.JOBS_DIR || './jobs',
      parseInt(process.env.RETENTION_DAYS || '7')
    );
  }
  return jobManagerInstance;
};

export default JobManager;
