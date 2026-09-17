# 意图与消息分类评估

- prompts/draft-intent.md：在线阶段，判断输入框草稿的路由（task / knowledge / mixed / none）
- prompts/message-classify.md：离线阶段，对群消息做结构化分类，并识别状态更新
- schemas.json：两个工具调用的 JSON schema，模型通过函数调用按 schema 输出
- dataset.json：27 条草稿、24 条消息和 4 个事件最终状态的标注
- run-eval.mjs：评估脚本，Node 18+，无依赖（--rules 需要 Node 22.18+）

## 规则版

    node eval/run-eval.mjs --baseline   # 修复前的关键词规则，保留作对照
    node eval/run-eval.mjs --rules      # 当前 src/matching.ts

## 大模型版

| provider | 费用 | 环境变量 | 默认模型 | 默认限速 |
| --- | --- | --- | --- | --- |
| gemini | 免费额度，无需绑卡 | GEMINI_API_KEY（Google AI Studio 获取） | gemini-2.5-flash | 8 次/分钟 |
| github | 免费额度，用 GitHub 账号 | GITHUB_TOKEN（fine-grained token，勾选 Models: Read） | openai/gpt-4o-mini | 12 次/分钟 |
| ollama | 本地运行，完全免费 | 无 | qwen3:8b | 不限 |
| anthropic | 按用量付费 | ANTHROPIC_API_KEY | claude-haiku-4-5-20251001 | 不限 |

    GEMINI_API_KEY=... node eval/run-eval.mjs --llm --provider gemini
    GITHUB_TOKEN=...   node eval/run-eval.mjs --llm --provider github
                       node eval/run-eval.mjs --llm --provider ollama

可选参数：`--model <模型名>` 更换模型；`--rpm <数字>` 调整每分钟请求数，遇到限速时调低；`--out <名称>` 指定结果文件名。结果写入 results/，默认文件名为 `llm-<provider>.json`。

免费额度和可用模型名称会变化，报错提示模型不存在时，请到对应平台查看当前模型列表，再用 `--model` 指定。免费层的请求内容可能被平台用于改进模型；本数据集均为虚构内容，但不要用免费层处理真实群聊数据。

API key 和 token 只放在终端环境变量中，不要写进文件或提交到仓库。

## 指标

草稿路由准确率、按类精确率与召回率、误触发率（标注为 none 却触发提示的比例）；消息级各字段准确率；事件最终状态准确率，以及 72 小时内可联系请求集合是否与标注完全一致。请求失败会单独列出。
