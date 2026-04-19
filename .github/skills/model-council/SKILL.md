---
name: model-council
description: Query multiple LLM models in parallel and compare their responses. Use when the user asks to "compare models", "model council", "ask all models", or wants to see how different models answer the same question.
---

# Model Council Skill

## Purpose
Send the same prompt to multiple AI models in parallel and present their responses side-by-side so the user can compare quality, style, and accuracy.

## How to Execute

When the user invokes model council:

1. **Ask which models** (if not specified):
   "Which models should I query? Available: claude-opus-4.6-1m, claude-sonnet-4.6, gpt-5.4, gpt-4.1, gemini-3.1-pro. Default: the top 3."

2. **For each selected model**, send the user's prompt and collect the response.
   - Use `setModel()` to switch models between queries OR note that each response should be labeled with its model.
   - Collect responses sequentially (one model at a time) since we share a session.

3. **Present results** in a structured comparison format:

```
## 🏛️ Model Council Results

### Query: "{user's question}"

---

### Claude Opus 4.6-1M
{response}

**Tokens**: ~{estimate} | **Reasoning**: {quality assessment}

---

### GPT-5.4
{response}

**Tokens**: ~{estimate} | **Reasoning**: {quality assessment}

---

### Gemini 3.1 Pro
{response}

**Tokens**: ~{estimate} | **Reasoning**: {quality assessment}

---

## 🏆 Recommendation
Based on this comparison: {which model performed best and why}
```

4. **Ask the user** which response they prefer and note the preference in working memory for future reference.

## Guidelines
- Default to 3 models if user doesn't specify
- Show progress as each model responds ("Model 1/3 complete...")
- Include a brief quality assessment for each response
- Remember user's model preferences in working memory
- If a model fails or times out (>60s), note it and continue with others
