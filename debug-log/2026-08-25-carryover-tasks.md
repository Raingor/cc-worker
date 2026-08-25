# 2026-08-25 工作面板：昨日未完成任务结转到今天

## 需求
每日任务做不完的自动加到第二天，并单独分组显示为「昨日未完成」。
例：昨天没做的「CFC 出运资料更新」今天出现在结转分组。

用户确认三点：
1. 显示：三列看板上方单独开「📌 昨日未完成」区块（不混进 未完成/完成中/已完成）。
2. 去重：按任务名称（label）去重——今天已有同名任务则不结转，避免每日重复项天天堆叠。
3. 「昨日」界定：取最近一个有真实记录的工作日（自动跳过周末/请假空缺）。

## 改动

### server/checklist_store.py（核心逻辑，前后端共享只写一处）
- `_migrate_db()`：`ALTER TABLE checklists ADD COLUMN carry_seeded INTEGER DEFAULT 0`（幂等），标记某天是否已注入过结转，避免重复注入 + 用户删除后复活。
- `_recent_prior_date()`：查最近一个 `date < 今天` 且 `items` 非空('[]'/'') 的记录——跳过只有 carry-seed 占位符的空白天。
- `_seed_carryovers(token, date)`：仅当 date==今天、当天有模板(工作日)、`carry_seeded==0` 时执行：
  1. 取 prior 天已合并清单（`get_or_create(..., _seed=False)` 防递归）；
  2. 过滤未完成项（`not checked and status!='done'`）；
  3. 按 label 与今天现有任务去重；
  4. 生成结转项：id=`carry_<prior>_<origId>`、沿用 label/note、`is_carried=True`、`carried_from=prior`；
  5. 并入落库并置 `carry_seeded=1`（结转为空也置位，保证只种子一次）。
- `_mark_seeded()`：置位 carry_seeded，行不存在则插空行。
- `get_or_create(token, date, _seed=True)`：新增 `_seed` 递归守卫；今天首次加载先 `_seed_carryovers`；合并循环新增分支保留 `is_carried` 项（否则重载被丢弃）。
- `save_items()` clean dict 增加 `is_carried` / `carried_from` 两字段持久化。

### web/assets/dashboard.js
- `renderTasksTab`：拆分 `carried`(is_carried) 与 `regular`；三列看板只用 regular；上方渲染 `renderCarryBlock(carried)`。
- 抽出 `renderTaskCard(item)` 供看板列与结转块复用；删除按钮对 `is_custom || is_carried` 都开放。
- `renderCarryBlock`：按 `carried_from` 分组，标题「📌 昨日未完成」+ 计数，每组「结转自 MM/DD」。
- `doSaveChecklist` 的 items map 补 `is_carried` / `carried_from` 回传。

### web/assets/style.css
- 新增 `.oa-carry-block/.oa-carry-header/.oa-carry-title/.oa-carry-count/.oa-carry-group/.oa-carry-group-date`，琥珀色(`--amber`)调突出「遗留」感；结转块内卡片网格布局。

### web/index.html
- `style.css?v=9→v10`、`dashboard.js?v=9→v10` 绕缓存（既有惯例）。

## 验证
- `python3 -m py_compile server/checklist_store.py` ✅
- `node --check web/assets/dashboard.js` ✅
- 隔离 DB + patch `cs.datetime.now()` 端到端：
  - 周一存 1 条未完成 → 周二加载出现结转项、carried_from=周一、progress 计入 ✅
  - 二次加载不重复注入（carry_seeded 生效）✅
  - 删除结转项后重载不复活 ✅
  - label 去重：周一遗留「收到装箱单后更新 CFC MF」与周四模板同名 → 周四不重复结转 ✅

## 已知行为 / 遗留
- 若 CC 连续多天完全不碰面板，未触碰的模板项被视为「未完成」全部滚动结转，导致结转块变大。这是「未完成即结转」的固有语义（系统无法区分「没点开」与「故意跳过」）；正常使用中 CC 勾选任务后结转集会收敛。label 去重已防止同名项跨天叠加。
- AI 每日总结 `get_summary_context` 仍只基于模板项，未纳入结转项（本次不做）。

## 部署
- 后端：`REMOTE_HOST=cc-worker bash scripts/deploy-api.sh`（rsync + 重启 uwsgi，注意 pkill 后 sleep 释放端口）。
- 前端：推 main → GitHub Actions 自动发布。
- （部署待用户确认后执行。）
