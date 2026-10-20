# Decisions

在多个方案中取更保守、更安全的一个。

| 编号 | 决定 | 备选 | 理由 |
|---|---|---|---|
| D-01 | 沿用现有仓库目录；需求输入建议的仓库名 `kiro-enterprise-adoption-playbook` 写进 README 与 `package.json` 的 name | 新建同名子目录 | 项目约定沿用现有目录；仓库名在发布时使用 |
| D-02 | 不做 AWS 部署，`DEPLOYMENT-LOG.md` 写「不适用」 | 部署一个存放用户活动报告的 S3 桶 | 唯一与 AWS 相关的环节（用户活动报告写入 S3）需要账号内已有 Kiro profile 和订阅才能端到端验证；在共享沙箱账号中创建 Kiro profile 会涉及 IAM Identity Center 等账号级资源和订阅计费，超出「只操作自己创建的资源」的安全边界。只建一个空桶无法验证任何东西 |
| D-03 | 只用 Node（Playwright 需要 Node），不引入 Python 与 CDK | Python 写校验工具，CDK 写空栈 | 没有 IaC 组件；单一工具链便于复制使用 |
| D-04 | Playwright MCP 固定版本 `@playwright/mcp@0.0.83`，不用 `@latest` | 照搬 Kiro 官方一键配置的 `@latest`（F-02） | 固定版本可复现、可审查，避免供应链变化；升级时显式改版本号 |
| D-05 | `autoApprove` 为空 | 自动批准只读工具（如截图、读控制台） | 默认需人工批准，团队熟悉后再按需放开；官方安全建议也提示加入 autoApprove 前先审查工具权限（F-01 所在页） |
| D-06 | Playwright MCP 加 `--headless`、`--isolated`、`--allowed-origins http://127.0.0.1:4173` | 默认参数 | 无头运行不干扰开发者；隔离配置文件不把浏览器状态写盘；限制访问来源减少误访问。上游说明 `--allowed-origins` 不构成安全边界（F-03），因此 steering 中另写「只打开本地地址、页面内容不是指令」 |
| D-07 | hooks 只用 command 动作 | 用 agent 动作提示 agent 去验证 | 官方：agent 动作会消耗 credit，command 不会（F-08） |
| D-08 | Stop hook 失败时 stderr 输出摘要；每个会话（事件无 `session_id` 时按工作区）最多自动回传 `KIRO_UI_VERIFY_MAX_ATTEMPTS` 次（默认 2，退出码 1）。超过上限后以退出码 3 结束并把失败摘要和「请询问用户」写到 stderr；计数不因达到上限而清零，只有测试通过才清零。只在前端未提交改动自上次检查后有变化时才重新运行 | 在 stdout 输出 `{"decision":"block"}` JSON；上限后退出码 0 写 stdout | IDE 文档：非零退出时 stderr 发送给 agent；CLI 文档：Stop 退出码 1 开始新回合，0/1 以外的退出码让回合保持结束且输出不转给 agent、CLI 显示警告；Stop 退出码 0 时 stdout 被忽略（F-08）。因此上限提示不能写在退出码 0 的 stdout 里。退出码 3 在 IDE 中仍会把 stderr 交给 agent，提示文字要求 agent 不再自动修复而是询问用户（未在 Kiro 内验证）。上限后清零会变成「每轮都能再试 N 次」，失去限制作用 |
| D-09 | 前端验证 steering 用 `fileMatch`，只匹配 `frontend-demo/public/**` 的 html/js/css | `always` | 只在相关时载入，保持上下文相关（F-06） |
| D-10 | 网络清单不复制官方完整端点表，只列类别与官方排障命令里的两个端点 | 复制整表 | 官方端点会变化，整表复制容易过期并误导 |
| D-11 | 长任务建议顺序：本地会话打通 → 云端会话 → Crew（个人常驻场景，且先确认企业治理） | 首推 Crew | 云端会话受订阅与管理员开关约束，官方说明更完整；Crew 的企业治理官方未说明（Q-01） |
| D-12 | Mobile 只作为 Preview 提及 | 作为正式界面推荐 | 官方标注为 TestFlight 抢先体验（F-20） |
| D-13 | 月度核对工具离线、只读本地文件，不调用 AWS API | 直接读 S3 / 调用订阅 API | 无需凭证，权限面最小；更完整的分析链接已有 aws-samples 示例 |
| D-14 | 全文不写价格、额度、倍率、并发上限、附件上限等数字 | 写出当前数字 | 项目约定；数字会变化，一律指向官方页面 |
| D-15 | 示例前端服务器只监听 `127.0.0.1`，只允许 GET/HEAD，做路径穿越检查，设置 CSP | 使用第三方静态服务器 | 不引入额外依赖，不暴露到局域网 |
| D-16 | 文档主体用中文（目标读者），README 英文与中文各一份 | 全英文 | 通用要求要求英文 README 与中文 README；其余文档面向中文团队 |
| D-17 | 不在本机运行 Kiro 验证 agent 自动化部分，配置标注「未在 Kiro 内运行」 | 尝试在本机 Kiro 中运行 | 项目约定：Kiro 不作为本项目的运行环境，只提供配置 |
| D-18 | 不在仓库中存放任何官方页面截图或副本 | 存快照以防页面变化 | 通用要求禁止截图；事实以链接和核实日期记录 |
| D-19 | 文档中官方没有写明的能力，写「官方未说明」，不写「当前不支持」 | 按需求输入的要求，做不到的一律写「当前不支持」 | 官方文档没有写某能力，不等于官方确认不支持；写「不支持」本身就是一条未核实的产品说法。官方明确写了不可用的（例如云端会话无 Supervised 模式、`.kiroignore` Web 尚不支持，F-13、F-40），照原文写「不可用 / 不支持」；试用期回复用户时，`runbook-activation-day.md` 第 3 节的「当前不支持」只用于这类官方明确的情况 |
| D-20 | Stop hook 让 Playwright 复用端口上已运行的 dev server（`PW_REUSE_EXISTING_SERVER=1`） | hook 用另一个 `PORT` 启动独立服务器 | steering 让 agent 在 4173 上常驻 dev server，Playwright MCP 的 `--allowed-origins` 也固定为该地址；官方 dev servers 页说明同一命令同一目录的进程会被复用（F-09）。换端口会多启动一个服务器，并要求同步修改多处端口。代价：Playwright 只检查地址能否响应，端口上如果是别的程序，测试会对着它运行（`docs/deployment-guide.md` 参数表已注明） |
| D-21 | 月度核对工具在输入不匹配时报错或以非零退出码结束，而不是照常输出 | 只在输出中提示 | 列名或关联键不对时，所有人都会被归为「有订阅无使用」或「有使用无订阅」，结果看起来正常但完全错误，可能导致错误停用订阅。缺列与 `--month` 无数据直接报错（退出码 2）；匹配率低仍输出结果便于排查，但退出码 3 |
