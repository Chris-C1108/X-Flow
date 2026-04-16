#!/usr/bin/env python3
"""
X-Flow Telemetry — Python 离线分析 Pipeline
高光时刻提取 + 协同过滤推荐 + 结果写回 Cloudflare D1

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

def d1_query(sql: str, params: list = None) -> list[dict]:
    """执行 D1 SQL 查询，返回行列表"""
    if not CF_ACCOUNT_ID or not CF_API_TOKEN or not CF_D1_DB_ID:
        import subprocess
        log.info("Missing CF credentials, falling back to local wrangler CLI...")
        cmd = ["npx", "wrangler", "d1", "execute", "xflow-telemetry", "--remote", "--json", f"--command={sql}"]
        if params:
            for p in params:
                cmd.extend(["--bind", str(p)])
        
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


# ── Token 生成（与 Worker 一致）───────────────────────────────────

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

    Args:
        video_id: 视频 ID
        sessions: play_sessions 表中该视频的所有行

    Returns:
        高光片段列表: [{'start': 秒, 'end': 秒, 'score': 热度倍数}]
    """
    # 合并所有 bucket
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


# ── Phase 2: 协同过滤推荐 ─────────────────────────────────────────

def compute_recommendations(highlight_map: dict) -> dict[str, list[str]]:
    """
    基于 Item-Item 协同过滤生成推荐列表

    交互权重:
        download      = 5  (最强意图)
        bookmark_add  = 3
        like          = 2
        view_start    = 1  (最弱)

    Returns:
        {anon_id: [video_id1, video_id2, ...]}
    """
    log.info('开始计算协同过滤推荐...')

    ACTION_WEIGHTS = {
        'download':      5,
        'bookmark_add':  3,
        'like':          2,
        'view_start':    1,
    }

    # 拉取所有交互事件
    rows = d1_query(
        '''SELECT anon_id, video_id, action
           FROM interactions
           WHERE action IN ('like','download','bookmark_add','view_start')'''
    )

    # 构建 user-item 交互矩阵: {user: {video: weight_sum}}
    user_video: dict[str, dict[str, float]] = {}
    for row in rows:
        uid = row['anon_id']
        vid = row['video_id']
        w   = ACTION_WEIGHTS.get(row['action'], 1)
        user_video.setdefault(uid, {})
        user_video[uid][vid] = user_video[uid].get(vid, 0) + w

    # 构建 item-item 共现矩阵（余弦相似度）
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

    # 为每个用户生成推荐
    recommendations: dict[str, list[str]] = {}

    for uid, watched in user_video.items():
        scores: dict[str, float] = {}

        for candidate in all_videos:
            if candidate in watched:
                continue  # 已看过，不推荐

            # Item-Item CF: 候选视频与用户已看视频的相似度加权求和
            total_sim = 0.0
            for seen_vid, user_weight in watched.items():
                sim = cosine_similarity(
                    video_users.get(candidate, {}),
                    video_users.get(seen_vid, {}),
                )
                total_sim += sim * user_weight

            if total_sim > 0:
                scores[candidate] = total_sim

        # 按得分排序，取前 N 个
        top = sorted(scores, key=lambda x: -scores[x])[:MAX_RECOMMENDATIONS]
        if top:
            recommendations[uid] = top

    log.info(f'协同过滤完成，共 {len(recommendations)} 个用户有推荐结果')
    return recommendations


# ── Phase 3: 结果写回 D1 ─────────────────────────────────────────

def push_results(
    recommendations: dict[str, list[str]],
    highlight_map: dict[str, list[dict]],
) -> None:
    """将推荐结果和高光时刻写回 D1 recommendations 表"""
    log.info('开始写回推荐结果...')

    now_ms = int(time.time() * 1000)

    # 为所有有推荐结果的用户更新
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

    log.info(f'写回完成，共更新 {len(recommendations)} 条推荐记录')


# ── 统计报告（可选）──────────────────────────────────────────────

def print_stats() -> None:
    """打印基础统计信息"""
    log.info('=== X-Flow 使用统计 ===')

    user_count = d1_query('SELECT COUNT(*) as cnt FROM users')
    log.info(f"总用户数: {user_count[0]['cnt'] if user_count else 'N/A'}")

    period_dist = d1_query(
        'SELECT dominant_period, COUNT(*) as cnt FROM users GROUP BY dominant_period ORDER BY cnt DESC'
    )
    log.info('活跃时段分布:')
    for row in period_dist:
        log.info(f"  {row['dominant_period']}: {row['cnt']} 人")

    top_liked = d1_query(
        """SELECT video_id, COUNT(*) as likes
           FROM interactions WHERE action='like'
           GROUP BY video_id ORDER BY likes DESC LIMIT 10"""
    )
    log.info('Top 10 点赞视频:')
    for i, row in enumerate(top_liked, 1):
        log.info(f"  {i}. {row['video_id']} ({row['likes']} likes)")

    log.info('=' * 30)


# ── 主入口 ────────────────────────────────────────────────────────

def main():
    log.info('X-Flow 离线分析 Pipeline 启动')
    start = time.time()

    # 验证配置
    if not all([CF_ACCOUNT_ID, CF_API_TOKEN, CF_D1_DB_ID]):
        log.warning('缺少环境变量: CF_ACCOUNT_ID / CF_API_TOKEN / CF_D1_DB_ID，将使用 Wrangler CLI 进行降级。')
        # 虽然使用降级，但不要直接退出


    try:
        # 统计报告
        print_stats()

        # Phase 1: 高光时刻
        highlight_map = compute_all_highlights()

        # Phase 2: 协同过滤推荐
        recommendations = compute_recommendations(highlight_map)

        # Phase 3: 写回 D1
        push_results(recommendations, highlight_map)

        elapsed = time.time() - start
        log.info(f'Pipeline 完成，耗时 {elapsed:.1f}s')

    except Exception as e:
        log.exception(f'Pipeline 异常: {e}')


if __name__ == '__main__':
    main()
