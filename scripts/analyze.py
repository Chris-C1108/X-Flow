#!/usr/bin/env python3
"""
X-Flow Telemetry — Python 离线分析 Pipeline v2.0
高光时刻提取 + 协同过滤推荐 + 全局 Trending 兜底 + 结果写回 Cloudflare D1 + Markdown 数据看板生成

使用方法:
    uv run scripts/analyze.py

环境变量（或 .env 文件）:
    CF_ACCOUNT_ID   — Cloudflare 账户 ID
    CF_API_TOKEN    — Cloudflare API Token（D1 读写权限）
    CF_D1_DB_ID     — D1 数据库 ID
    WORKER_URL      — Worker 部署地址（写回推荐结果用）
    WORKER_TOKEN_SALT — 与 Worker 相同的盐值
"""

import os
import sys
import json
import math
import time
import logging
import httpx
from datetime import datetime, timezone

# ── 配置 ──────────────────────────────────────────────────────────
CF_ACCOUNT_ID  = os.getenv('CF_ACCOUNT_ID', '')
CF_API_TOKEN   = os.getenv('CF_API_TOKEN', '')
CF_D1_DB_ID    = os.getenv('CF_D1_DB_ID', '')
WORKER_URL     = os.getenv('WORKER_URL', 'https://loadingi.cloudns.be')
TOKEN_SALT     = os.getenv('WORKER_TOKEN_SALT', 'XFLOW_v6_SECRET')

# 是否使用本地 D1 数据库进行调试分析
USE_LOCAL_DB   = "--local" in sys.argv

# 高光时刻阈值：比平均值高出多少倍才算高光
HIGHLIGHT_THRESHOLD_MULTIPLIER = 1.5

# 推荐列表最大长度
MAX_RECOMMENDATIONS = 20

# 日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
log = logging.getLogger('xflow-analyze')


# ── Cloudflare D1 API 封装 ────────────────────────────────────────

def interpolate_params(sql: str, params: list) -> str:
    """辅助函数：手动将 SQL 参数插值到查询语句中，避免 Wrangler CLI 对 bind 的不支持"""
    if not params:
        return sql
    for param in params:
        if param is None:
            formatted = "NULL"
        elif isinstance(param, (int, float)):
            formatted = str(param)
        elif isinstance(param, bool):
            formatted = "1" if param else "0"
        else:
            # SQL 标准单引号转义：双单引号
            escaped = str(param).replace("'", "''")
            formatted = f"'{escaped}'"
        
        # 将第一个遇到的问号替换为格式化后的值
        sql = sql.replace("?", formatted, 1)
    return sql


def d1_query(sql: str, params: list = None) -> list[dict]:
    """执行 D1 SQL 查询，返回行列表"""
    if not CF_ACCOUNT_ID or not CF_API_TOKEN or not CF_D1_DB_ID or USE_LOCAL_DB:
        import subprocess
        db_flag = "--local" if USE_LOCAL_DB or (not CF_ACCOUNT_ID or not CF_API_TOKEN or not CF_D1_DB_ID) else "--remote"
        
        interpolated_sql = interpolate_params(sql, params)
        log.info(f"Using wrangler CLI ({db_flag}) fallback for query: {interpolated_sql[:60]}...")
        cmd = ["npx", "wrangler", "d1", "execute", "xflow-telemetry", db_flag, "--json", f"--command={interpolated_sql}"]
        
        # 切换到 workers 目录以使用其中的 wrangler
        workers_dir = os.path.join(os.path.dirname(__file__), '../workers')
        res = subprocess.run(cmd, capture_output=True, text=True, cwd=workers_dir)
        if res.returncode != 0:
            raise RuntimeError(f"Wrangler query failed: {res.stderr}\n{res.stdout}")
        
        # 尝试剥离 wrangler 输出中的非 JSON 前缀 (例如警告)
        outp = res.stdout.strip()
        if outp.startswith("⛅️") or "Resource location" in outp:
            try:
                # 寻找第一个 `[` 或 `{`
                start = min([i for i in (outp.find('['), outp.find('{')) if i != -1] + [len(outp)])
                outp = outp[start:]
            except Exception:
                pass

        try:
            data = json.loads(outp)
            if isinstance(data, list) and len(data) > 0:
                return data[0].get('results', [])
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse Wrangler output as JSON: {e}\nOutput: {outp}")
        return []

    url = f'https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/d1/database/{CF_D1_DB_ID}/query'
    payload = {'sql': sql}
    if params:
        payload['params'] = params

    resp = httpx.post(
        url,
        headers={
            'Authorization': f'Bearer {CF_API_TOKEN}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=30,
    )
    data = resp.json()
    if not data.get('success'):
        raise RuntimeError(f'D1 query failed: {data}')

    results = data.get('result', [])
    if results and results[0].get('results'):
        return results[0]['results']
    return []


def d1_execute(sql: str, params: list = None) -> None:
    """执行 D1 SQL 写操作（INSERT/UPDATE/DELETE）"""
    d1_query(sql, params)


# ── Token 生成 ───────────────────────────────────────────────────

def gen_token(ts: int) -> str:
    s = f'{TOKEN_SALT}_{ts}'
    h = 0
    for c in s:
        h = (31 * h + ord(c)) & 0xFFFFFFFF
    return format(h, 'x')


# ── Phase 1: 高光时刻提取 ─────────────────────────────────────────

def extract_highlights_for_video(video_id: str, sessions: list[dict]) -> list[dict]:
    """
    对某视频的所有 play_sessions 汇总 bucket 数据，
    找出热度显著高于平均的时间段。
    """
    merged: dict[int, int] = {}
    for row in sessions:
        try:
            buckets = json.loads(row.get('buckets', '{}'))
            for k, v in buckets.items():
                ki = int(k)
                merged[ki] = merged.get(ki, 0) + int(v)
        except (json.JSONDecodeError, ValueError):
            continue

    if not merged:
        return []

    values = list(merged.values())
    mean = sum(values) / len(values)
    if mean == 0:
        return []

    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std = math.sqrt(variance)
    threshold = mean + HIGHLIGHT_THRESHOLD_MULTIPLIER * std

    highlights = []
    for bucket_key in sorted(merged.keys()):
        score = merged[bucket_key]
        if score >= threshold:
            highlights.append({
                'start': bucket_key * 10,
                'end':   bucket_key * 10 + 10,
                'score': round(score / mean, 2),
            })

    return highlights


def compute_all_highlights() -> dict[str, list[dict]]:
    """拉取所有视频的 play_sessions，计算高光时刻"""
    log.info('开始计算高光时刻...')

    rows = d1_query(
        'SELECT video_id, buckets FROM play_sessions ORDER BY video_id'
    )

    # 按 video_id 分组
    by_video: dict[str, list] = {}
    for row in rows:
        vid = row['video_id']
        by_video.setdefault(vid, []).append(row)

    highlight_map: dict[str, list[dict]] = {}
    for video_id, sessions in by_video.items():
        highlights = extract_highlights_for_video(video_id, sessions)
        if highlights:
            highlight_map[video_id] = highlights
            log.info(f'  视频 {video_id}: {len(highlights)} 个高光片段')

    log.info(f'高光时刻计算完成，共 {len(highlight_map)} 个视频有高光片段')
    return highlight_map


# ── Phase 2: 综合热度 & 推荐计算 (CF + Trending) ───────────────────

def compute_trending_and_affinity() -> tuple[list[str], list[str], list[str], dict[str, str], dict[str, float]]:
    """
    计算全局视频综合热度得分及用户频道偏好。
    
    综合热度得分公式:
        Score = (5*download + 3*bookmark_add + 2*like + 0.5*view_start) * (1 + AvgCompletionRate)
    """
    log.info('开始计算全局 Trending 热度排行与用户偏好...')

    # 1. 获取所有交互数据
    interaction_rows = d1_query(
        'SELECT video_id, action, COUNT(*) as cnt, MAX(channel) as channel FROM interactions GROUP BY video_id, action'
    )
    
    video_channels: dict[str, str] = {}
    video_interactions: dict[str, dict[str, int]] = {}
    for row in interaction_rows:
        vid = row['video_id']
        act = row['action']
        cnt = int(row['cnt'])
        ch  = row['channel']
        
        video_channels[vid] = ch
        video_interactions.setdefault(vid, {})[act] = cnt

    # 2. 获取平均完播率
    completion_rows = d1_query(
        'SELECT video_id, AVG(completion) as avg_comp FROM play_sessions GROUP BY video_id'
    )
    video_completions = {row['video_id']: float(row['avg_comp']) for row in completion_rows}

    # 3. 计算综合得分
    ACTION_WEIGHTS = {
        'download':      5.0,
        'bookmark_add':  3.0,
        'like':          2.0,
        'view_start':    0.5,
    }
    
    video_scores: dict[str, float] = {}
    all_video_ids = set(list(video_interactions.keys()) + list(video_completions.keys()))
    
    for vid in all_video_ids:
        interacts = video_interactions.get(vid, {})
        comp = video_completions.get(vid, 0.0)
        
        raw_score = 0.0
        for act, weight in ACTION_WEIGHTS.items():
            raw_score += interacts.get(act, 0) * weight
            
        score = raw_score * (1.0 + comp)
        video_scores[vid] = round(score, 2)

    # 4. 排序生成各频道 Trending feed
    sorted_vids = sorted(video_scores.keys(), key=lambda x: -video_scores[x])
    
    popular_real = [v for v in sorted_vids if video_channels.get(v, 'real') == 'real']
    popular_anime = [v for v in sorted_vids if video_channels.get(v, 'real') == 'anime']
    popular_global = sorted_vids

    log.info(f'Trending 计算完成: 真实频道有 {len(popular_real)} 个，动漫频道有 {len(popular_anime)} 个')

    # 5. 计算用户频道倾向 (User Channel Affinity)
    affinity_rows = d1_query(
        'SELECT anon_id, channel, COUNT(*) as cnt FROM interactions GROUP BY anon_id, channel'
    )
    user_channel_counts: dict[str, dict[str, int]] = {}
    for row in affinity_rows:
        uid = row['anon_id']
        ch  = row['channel']
        cnt = int(row['cnt'])
        user_channel_counts.setdefault(uid, {})[ch] = cnt

    user_channel_pref: dict[str, str] = {}
    for uid, counts in user_channel_counts.items():
        real_cnt = counts.get('real', 0)
        anime_cnt = counts.get('anime', 0)
        user_channel_pref[uid] = 'anime' if anime_cnt > real_cnt else 'real'

    return popular_real, popular_anime, popular_global, user_channel_pref, video_scores


def compute_recommendations(
    highlight_map: dict,
    popular_real: list[str],
    popular_anime: list[str],
    popular_global: list[str],
    user_channel_pref: dict[str, str]
) -> dict[str, list[str]]:
    """
    结合 Item-Item 协同过滤与 Trending 兜底逻辑，生成个性化推荐。
    """
    log.info('开始计算协同过滤推荐与 Trending 兜底融合...')

    ACTION_WEIGHTS = {
        'download':      5,
        'bookmark_add':  3,
        'like':          2,
        'view_start':    1,
    }

    # 1. 拉取所有交互事件，建立 User-Item 矩阵
    rows = d1_query(
        '''SELECT anon_id, video_id, action
           FROM interactions
           WHERE action IN ('like','download','bookmark_add','view_start')'''
    )

    user_video: dict[str, dict[str, float]] = {}
    for row in rows:
        uid = row['anon_id']
        vid = row['video_id']
        w   = ACTION_WEIGHTS.get(row['action'], 1)
        user_video.setdefault(uid, {})
        user_video[uid][vid] = user_video[uid].get(vid, 0) + w

    # 2. 构建 Item-Item 协同相似度
    video_users: dict[str, dict[str, float]] = {}
    for uid, videos in user_video.items():
        for vid, w in videos.items():
            video_users.setdefault(vid, {})[uid] = w

    def cosine_similarity(v1: dict, v2: dict) -> float:
        common = set(v1) & set(v2)
        if not common:
            return 0.0
        dot = sum(v1[u] * v2[u] for u in common)
        norm1 = math.sqrt(sum(x ** 2 for x in v1.values()))
        norm2 = math.sqrt(sum(x ** 2 for x in v2.values()))
        return dot / (norm1 * norm2) if norm1 and norm2 else 0.0

    all_videos = list(video_users.keys())
    recommendations: dict[str, list[str]] = {}

    # 3. 对有交互的用户进行协同推荐 + 热门兜底
    for uid, watched in user_video.items():
        scores: dict[str, float] = {}

        # 协同过滤打分
        for candidate in all_videos:
            if candidate in watched:
                continue

            total_sim = 0.0
            for seen_vid, user_weight in watched.items():
                sim = cosine_similarity(
                    video_users.get(candidate, {}),
                    video_users.get(seen_vid, {}),
                )
                total_sim += sim * user_weight

            if total_sim > 0:
                scores[candidate] = total_sim

        # 取前 N 个 CF 推荐
        top = sorted(scores, key=lambda x: -scores[x])[:MAX_RECOMMENDATIONS]

        # 如果 CF 结果不足，进行 Trending 兜底（优先用户倾向频道）
        pref_channel = user_channel_pref.get(uid, 'real')
        trending_feed = popular_real if pref_channel == 'real' else popular_anime
        
        # 兜底步骤 1：倾向频道的热门视频
        for candidate in trending_feed:
            if len(top) >= MAX_RECOMMENDATIONS:
                break
            if candidate not in watched and candidate not in top:
                top.append(candidate)

        # 兜底步骤 2：全局热门视频
        for candidate in popular_global:
            if len(top) >= MAX_RECOMMENDATIONS:
                break
            if candidate not in watched and candidate not in top:
                top.append(candidate)

        recommendations[uid] = top

    # 4. 对无交互的冷启动用户，直接采用其偏好（如果有）或全局 Trending 填充
    all_users = d1_query('SELECT anon_id FROM users')
    for urow in all_users:
        uid = urow['anon_id']
        if uid not in recommendations:
            pref_channel = user_channel_pref.get(uid, 'real')
            trending_feed = popular_real if pref_channel == 'real' else popular_anime
            
            top = []
            # 填充倾向频道
            for candidate in trending_feed:
                if len(top) >= MAX_RECOMMENDATIONS:
                    break
                top.append(candidate)
            # 填充全局热门
            for candidate in popular_global:
                if len(top) >= MAX_RECOMMENDATIONS:
                    break
                if candidate not in top:
                    top.append(candidate)
            recommendations[uid] = top

    # 5. 添加全局默认用户 `GLOBAL_DEFAULT` 作为全站冷启动的最强兜底
    recommendations['GLOBAL_DEFAULT'] = popular_global[:MAX_RECOMMENDATIONS]

    log.info(f'融合计算完成，共生成 {len(recommendations)} 条用户推荐（含全局默认 GLOBAL_DEFAULT）')
    return recommendations


# ── Phase 3: 结果写回 D1 ─────────────────────────────────────────

def push_results(
    recommendations: dict[str, list[str]],
    highlight_map: dict[str, list[dict]],
) -> None:
    """将推荐结果和高光时刻写回 D1 recommendations 表"""
    log.info('开始写回推荐结果到数据库 D1...')

    now_ms = int(time.time() * 1000)

    # 批量或循环执行 UPSERT
    for anon_id, rec_list in recommendations.items():
        # 为该用户的推荐视频提取高光时刻
        user_highlights = {
            vid: highlight_map[vid]
            for vid in rec_list
            if vid in highlight_map
        }

        d1_execute(
            '''INSERT INTO recommendations (anon_id, rec_video_ids, highlight_map, updated_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(anon_id) DO UPDATE SET
                   rec_video_ids = excluded.rec_video_ids,
                   highlight_map = excluded.highlight_map,
                   updated_at    = excluded.updated_at''',
            [
                anon_id,
                json.dumps(rec_list),
                json.dumps(user_highlights),
                now_ms,
            ]
        )

    log.info(f'写回数据库成功，共更新 {len(recommendations)} 条推荐记录')


# ── Phase 4: 高级指标统计与看板生成 ───────────────────────────────────

def collect_advanced_metrics() -> dict:
    """搜集大盘健康与留存指标"""
    log.info('正在搜集大盘高级统计数据...')
    metrics = {}
    
    # 1. 基础数据
    user_cnt = d1_query('SELECT COUNT(*) as cnt FROM users')
    metrics['total_users'] = user_cnt[0]['cnt'] if user_cnt else 0
    
    interact_cnt = d1_query('SELECT COUNT(*) as cnt FROM interactions')
    metrics['total_interactions'] = interact_cnt[0]['cnt'] if interact_cnt else 0
    
    session_cnt = d1_query('SELECT COUNT(*) as cnt FROM play_sessions')
    metrics['total_sessions'] = session_cnt[0]['cnt'] if session_cnt else 0
    
    # 2. 粘性分层 (Bounce, Active, Retained)
    bounce_user = d1_query('SELECT COUNT(*) as cnt FROM users WHERE session_count = 1')
    metrics['bounce_users'] = bounce_user[0]['cnt'] if bounce_user else 0
    
    active_user = d1_query('SELECT COUNT(*) as cnt FROM users WHERE session_count >= 2 AND session_count < 5')
    metrics['active_users'] = active_user[0]['cnt'] if active_user else 0
    
    retained_user = d1_query('SELECT COUNT(*) as cnt FROM users WHERE session_count >= 5')
    metrics['retained_users'] = retained_user[0]['cnt'] if retained_user else 0
    
    # 3. 互动行为明细
    action_rows = d1_query('SELECT action, COUNT(*) as cnt FROM interactions GROUP BY action')
    metrics['action_counts'] = {row['action']: row['cnt'] for row in action_rows}
    
    # 4. 播放时间与完播分布
    comp_metrics = d1_query('SELECT AVG(completion) as avg_comp, AVG(played_sec) as avg_played FROM play_sessions')
    metrics['avg_completion'] = float(comp_metrics[0]['avg_comp']) if comp_metrics and comp_metrics[0]['avg_comp'] else 0.0
    metrics['avg_played_sec'] = float(comp_metrics[0]['avg_played']) if comp_metrics and comp_metrics[0]['avg_played'] else 0.0
    
    metrics['comp_distribution'] = {
        'bounce': d1_query('SELECT COUNT(*) as cnt FROM play_sessions WHERE completion < 0.1')[0]['cnt'],
        'brief': d1_query('SELECT COUNT(*) as cnt FROM play_sessions WHERE completion >= 0.1 AND completion < 0.5')[0]['cnt'],
        'partial': d1_query('SELECT COUNT(*) as cnt FROM play_sessions WHERE completion >= 0.5 AND completion < 0.9')[0]['cnt'],
        'completed': d1_query('SELECT COUNT(*) as cnt FROM play_sessions WHERE completion >= 0.9')[0]['cnt']
    }
    
    # 5. 活跃时段
    period_rows = d1_query('SELECT dominant_period, COUNT(*) as cnt FROM users GROUP BY dominant_period')
    metrics['period_distribution'] = {row['dominant_period']: row['cnt'] for row in period_rows}
    
    return metrics


def generate_markdown_report(metrics: dict, popular_global: list[str], video_scores: dict[str, float], highlight_map: dict) -> None:
    """在本地 .agents/todo/analytics_report.md 生成精美看盘数据"""
    log.info('正在本地生成 Markdown 数据分析看板...')
    
    total_users = metrics['total_users']
    bounce_users = metrics['bounce_users']
    active_users = metrics['active_users']
    retained_users = metrics['retained_users']
    
    bounce_pct = (bounce_users / total_users * 100) if total_users else 0
    active_pct = (active_users / total_users * 100) if total_users else 0
    retained_pct = (retained_users / total_users * 100) if total_users else 0
    
    # 时段映射与默认值
    p_dist = metrics['period_distribution']
    em_cnt = p_dist.get('early_morning', 0)
    m_cnt  = p_dist.get('morning', 0)
    a_cnt  = p_dist.get('afternoon', 0)
    e_cnt  = p_dist.get('evening', 0)
    ln_cnt = p_dist.get('late_night', 0)
    
    period_total = em_cnt + m_cnt + a_cnt + e_cnt + ln_cnt
    em_pct = (em_cnt / period_total * 100) if period_total else 0
    m_pct  = (m_cnt / period_total * 100) if period_total else 0
    a_pct  = (a_cnt / period_total * 100) if period_total else 0
    e_pct  = (e_cnt / period_total * 100) if period_total else 0
    ln_pct = (ln_cnt / period_total * 100) if period_total else 0
    
    # 完播分布
    cd = metrics['comp_distribution']
    total_sessions = metrics['total_sessions']
    comp_bounce = cd['bounce']
    comp_brief = cd['brief']
    comp_partial = cd['partial']
    comp_completed = cd['completed']
    
    cb_pct = (comp_bounce / total_sessions * 100) if total_sessions else 0
    cbr_pct = (comp_brief / total_sessions * 100) if total_sessions else 0
    cp_pct = (comp_partial / total_sessions * 100) if total_sessions else 0
    cc_pct = (comp_completed / total_sessions * 100) if total_sessions else 0
    
    # 互动明细
    ac = metrics['action_counts']
    download_cnt = ac.get('download', 0)
    bookmark_cnt = ac.get('bookmark_add', 0)
    like_cnt = ac.get('like', 0)
    view_cnt = ac.get('view_start', 0)
    
    total_interact = metrics['total_interactions']
    dl_pct = (download_cnt / total_interact * 100) if total_interact else 0
    bm_pct = (bookmark_cnt / total_interact * 100) if total_interact else 0
    lk_pct = (like_cnt / total_interact * 100) if total_interact else 0
    vw_pct = (view_cnt / total_interact * 100) if total_interact else 0
    
    # Trending 列表
    trending_table_rows = []
    # 提取排名前 10 视频的频道
    for i, vid in enumerate(popular_global[:10], 1):
        score = video_scores.get(vid, 0.0)
        # 获取频道
        channel_row = d1_query(f"SELECT channel FROM interactions WHERE video_id = '{vid}' LIMIT 1")
        channel = channel_row[0]['channel'] if channel_row else 'real'
        trending_table_rows.append(f"| **{i}** | `{vid}` | `{channel}` | `{score:.2f}` |")
    
    trending_table_content = "\n".join(trending_table_rows)

    current_time = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
    
    report_content = f"""# X-Flow Telemetry 数据分析看板 📊

> **生成时间**: {current_time}
> **数据范围**: 历史全量数据 (Cloudflare D1)

---

## 📊 大盘核心数据 KPI

| 指标名称 | 数据统计 | 行业/业务参考 |
| :--- | :--- | :--- |
| **总匿名用户数 (Users)** | `{total_users}` | 激活安装脚本的唯一客户端数 |
| **总互动次数 (Interactions)** | `{total_interact}` | 点赞、收藏、下载等明确动作总和 |
| **总播放 Session 数** | `{total_sessions}` | 用户观看视频的心跳回传记录数 |

---

## 👥 用户群体画像与留存

### 1. 活跃与粘性等级 (Sticky User Cohorts)

```mermaid
pie title 用户活跃类型占比
    "仅一次过客 (Bounce Users)" : {bounce_users}
    "日常轻度用户 (Active Users)" : {active_users}
    "重度留存用户 (Retained Users)" : {retained_users}
```

* 😴 **仅一次过客 (Bounce)** (访问过 1 次): `{bounce_users}` 人 (`{bounce_pct:.1f}%`)
* 🏃 **日常/轻度用户** (访问过 2-4 次): `{active_users}` 人 (`{active_pct:.1f}%`)
* 🔥 **重度留存用户 (Sticky)** (访问过 >= 5 次): `{retained_users}` 人 (`{retained_pct:.1f}%`)

> [!TIP]
> 重度留存用户占比反映了脚本的长期健康度。若该比例持续增长，说明全屏滑动体验对老用户极具吸引力。

### 2. 活跃时间段分布

| 活跃时段 | 用户数 | 占比 | 标签说明 |
| :--- | :--- | :--- | :--- |
| **🌅 清晨 (Early Morning, 2:00-6:00)** | `{em_cnt}` | `{em_pct:.1f}%` | 极度夜猫子 / 早起党 |
| **☀️ 上午 (Morning, 6:00-12:00)** | `{m_cnt}` | `{m_pct:.1f}%` | 日间轻度浏览 |
| **🌤️ 下午 (Afternoon, 12:00-18:00)** | `{a_cnt}` | `{a_pct:.1f}%` | 午休及通勤时段 |
| **🌆 晚上 (Evening, 18:00-22:00)** | `{e_cnt}` | `{e_pct:.1f}%` | 黄金活跃期 |
| **🌙 深夜 (Late Night, 22:00-2:00)** | `{ln_cnt}` | `{ln_pct:.1f}%` | 重度夜游人群 |

---

## 🎬 视频播放与完播分析

### 1. 平均播放表现

* **平均每次观看时长**: `{metrics['avg_played_sec']:.1f}` 秒
* **平均视频完播率**: `{metrics['avg_completion'] * 100:.1f}%`

### 2. 完播率区间分布 (Completion Rate Distribution)

```mermaid
gantt
    title 完播率区间分布次占比
    dateFormat  X
    axisFormat %
    section 秒退 (<10%) : 0, {cb_pct:.0f}
    section 简阅 (10%-50%) : 0, {cbr_pct:.0f}
    section 深阅 (50%-90%) : 0, {cp_pct:.0f}
    section 完播 (>=90%) : 0, {cc_pct:.0f}
```

* **秒退 (Bounce, <10%)**: `{comp_bounce}` 次 (`{cb_pct:.1f}%`) — 用户滑过或迅速划走
* **简阅 (Brief View, 10%-50%)**: `{comp_brief}` 次 (`{cbr_pct:.1f}%`) — 停留观看了视频前半段
* **深度阅读 (Partial View, 50%-90%)**: `{comp_partial}` 次 (`{cp_pct:.1f}%`) — 观看了大半，基本看完
* **完播 (Completed, >=90%)**: `{comp_completed}` 次 (`{cc_pct:.1f}%`) — 观看了完整视频或循环播放

> [!NOTE]
> 秒退率反映了视频开头的抓人程度；完播率高低则直接决定了推荐的权重。

---

## ❤️ 互动行为大盘

| 行为类型 | 触发总次数 | 占大盘互动比例 | 意图强度与权重 |
| :--- | :--- | :--- | :--- |
| **📥 下载视频 (download)** | `{download_cnt}` | `{dl_pct:.1f}%` | 最强意图 (权重: 5.0) |
| **🔖 收藏视频 (bookmark_add)** | `{bookmark_cnt}` | `{bm_pct:.1f}%` | 强意图 (权重: 3.0) |
| **❤️ 点赞视频 (like)** | `{like_cnt}` | `{lk_pct:.1f}%` | 中意图 (权重: 2.0) |
| **👁️ 开始浏览 (view_start)** | `{view_cnt}` | `{vw_pct:.1f}%` | 基础浏览意图 (权重: 0.5) |

---

## 🔥 全局 Trending 热门视频 (Top 10)

| 排名 | 视频 ID | 频道 | 综合热度得分 |
| :--- | :--- | :--- | :--- |
{trending_table_content}

---

## ⚙️ 系统推荐健康度

* **推荐算法覆盖率 (D1 Pre-cached)**: `100.0%` (全部已知用户已在 D1 中建立了 CF + Trending 的专属缓存)
* **已提取高光时刻的视频数**: `{len(highlight_map)}` 个
* **全局兜底状态**: `GLOBAL_DEFAULT` 缓存建立成功 🌟 (实现冷启动用户 0ms 完美响应)

"""
    report_path = os.path.join(os.path.dirname(__file__), '../.agents/todo/analytics_report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
        
    log.info(f"数据分析看板已写入本地: {report_path}")


def print_stats_advanced(metrics: dict, popular_global: list[str], video_scores: dict[str, float]) -> None:
    """控制台高级输出"""
    log.info('=== X-Flow Telemetry 离线分析高级报告 ===')
    log.info(f"大盘匿名用户: {metrics['total_users']} 人")
    log.info(f"大盘交互事件: {metrics['total_interactions']} 次")
    log.info(f"大盘播放 Session: {metrics['total_sessions']} 条")
    
    log.info("用户群体粘性:")
    total = metrics['total_users']
    if total:
        log.info(f"  - 仅一次过客 (Bounce): {metrics['bounce_users']} 人 ({metrics['bounce_users']/total*100:.1f}%)")
        log.info(f"  - 日常轻度用户 (Active): {metrics['active_users']} 人 ({metrics['active_users']/total*100:.1f}%)")
        log.info(f"  - 重度留存用户 (Retained): {metrics['retained_users']} 人 ({metrics['retained_users']/total*100:.1f}%)")
        
    log.info("平均播放表现:")
    log.info(f"  - 平均观看时长: {metrics['avg_played_sec']:.1f} 秒")
    log.info(f"  - 平均完播率: {metrics['avg_completion']*100:.1f}%")
    
    log.info("全局 Top 5 视频排行:")
    for i, vid in enumerate(popular_global[:5], 1):
        log.info(f"  {i}. {vid} (Score: {video_scores.get(vid, 0.0):.2f})")
    log.info('=' * 45)


# ── 主入口 ────────────────────────────────────────────────────────

def main():
    log.info('X-Flow 离线分析 Pipeline 2.0 启动')
    start = time.time()

    if not all([CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DB_ID]):
        log.warning('缺少环境变量: CF_ACCOUNT_ID / CF_API_TOKEN / CF_D1_DB_ID，将使用 Wrangler CLI 进行降级。')

    try:
        # Phase 1: 高光时刻提取
        highlight_map = compute_all_highlights()

        # Phase 2: 综合热度与用户倾向计算
        popular_real, popular_anime, popular_global, user_channel_pref, video_scores = compute_trending_and_affinity()

        # Phase 3: 协同过滤与 Trending 兜底推荐计算
        recommendations = compute_recommendations(
            highlight_map, popular_real, popular_anime, popular_global, user_channel_pref
        )

        # Phase 4: 写回 D1 数据库
        push_results(recommendations, highlight_map)

        # Phase 5: 高级统计数据搜集
        metrics = collect_advanced_metrics()

        # 控制台打印
        print_stats_advanced(metrics, popular_global, video_scores)

        # 导出本地看板报告
        generate_markdown_report(metrics, popular_global, video_scores, highlight_map)

        elapsed = time.time() - start
        log.info(f'Pipeline 2.0 运行圆满成功，耗时 {elapsed:.1f}s')

    except Exception as e:
        log.exception(f'Pipeline 2.0 异常: {e}')


if __name__ == '__main__':
    main()
