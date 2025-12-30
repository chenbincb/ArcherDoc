# ArcherDoc AI - Git 使用规范手册

本手册旨在指导如何高效、安全地管理 ArcherDoc AI 项目的代码。项目目前采用 **GitHub + GitLab 双远程仓库** 同步机制。

## 1. 远程仓库配置 (Remote Config)

当前项目已配置 `origin` 为双向推送地址。

### 一键双推命令
```bash
# 以后提交代码只需运行这一条，将同时推送到 GitHub 和 GitLab
git push origin master
```

### 查看当前配置
```bash
git remote -v
```

---

## 2. 提交规范 (Commit Convention)

为了方便回溯重构历史，请遵循 `类型(模块): 描述` 的格式。

### 常见提交类型
- `feat`: 新增功能（如 `feat(backend): 增加 MiniMax 语音支持`）
- `fix`: 修复 Bug（如 `fix(frontend): 修复统计图表百分比显示`）
- `docs`: 文档变更（如 `docs: 更新 Git 使用规范`）
- `refactor`: 代码重构（不涉及功能变化）
- `perf`: 性能优化
- `style`: 格式调整（不影响逻辑）

---

## 3. 分支管理 (Branching Strategy)

- **`master` 分支**: 生产分支。只存放**已测试通过**、可以稳定运行的代码。
- **`feature/*` 分支**: 开发分支。开发新功能时，请从 `master` 切出新分支：
    ```bash
    git checkout -b feature/your-feature-name
    ```
- **`bugfix/*` 分支**: 紧急修复分支。

---

## 4. 核心安全规则 (Security Rules)

> [!IMPORTANT]
> **绝对禁止**将敏感信息提交到仓库。

1. **环境变量**: `backend/.env` 已被 `.gitignore` 屏蔽。
    - 如果新增了配置项，请同步更新 `backend/.env.example`。
2. **任务数据**: `backend/jobs/` 和 `backend/uploads/` 存储的是 AI 生成的二进制临时文件，严禁提交。
3. **构建产物**: `frontend/dist/` 和 `node_modules/` 不应进入 Git。

---

## 5. 日常开发工作流 (Daily Workflow)

### 步骤 1：同步远程代码
在开始工作前，养成拉取最新代码的习惯。
```bash
git pull origin master
```

### 步骤 2：本地开发并提交
```bash
git add .
git commit -m "feat(module): your message"
```

### 步骤 3：一键同步到云端
```bash
git push origin master
```

---

## 6. 定期维护

由于项目会产生大量 AI 临时文件，建议每月清理一次非 Git 管理的文件：
```bash
# 谨慎运行：清理所有被 gitignore 屏蔽的文件（包括生成的视频、图片等）
git clean -fdX
```

---
> 最后更新：2025-12-30
