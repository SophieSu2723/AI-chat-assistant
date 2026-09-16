# 意图与消息分类评估

- prompts/draft-intent.md：在线阶段，判断输入框草稿的路由（task / knowledge / mixed / none）
- prompts/message-classify.md：离线阶段，对群消息做结构化分类，并识别状态更新
- schemas.json：两个工具调用的 JSON schema，模型通过 tool_choice 强制按 schema 输出
- dataset.json：27 条草稿、24 条消息和 4 个事件最终状态的标注
- run-eval.mjs：评估脚本，Node 18+，无依赖

运行：

    node run-eval.mjs --baseline
    ANTHROPIC_API_KEY=... node run-eval.mjs --llm
    ANTHROPIC_API_KEY=... node run-eval.mjs --llm --model <model-id>

结果写入 results/。API key 只在本地环境变量中使用，不要提交到仓库。

指标：草稿路由准确率、按类精确率与召回率、误触发率（标注为 none 却触发提示的比例）；消息级各字段准确率；事件最终状态准确率，以及 72 小时内可联系请求集合是否与标注完全一致。
