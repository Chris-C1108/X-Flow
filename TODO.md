新站点适配 :
https://pektino.com  
很久以前为了兼容旧网站做了些api测试不知道是否还有效 - ' .agents/dev-docs/api-ceshi.md  
访问 http://truvaze.com/ 或跳转到 https://pektino.com/ （这是最新网址） 
x-ero-anime.com（动漫站） 是 https://pektino.com/ 的姐妹站，采集方案应该类似
---
cookie:
age_verified	1799119663383
site_lang	{"code":"zh-CN","label":"简体中文"}
日榜 https://pektino.com/zh-CN?_rsc=enn7m
周榜 https://pektino.com/zh-CN/weekly?_rsc=1y19b
月榜 https://pektino.com/zh-CN/monthly?_rsc=12xhn
所有 https://pektino.com/zh-CN/all?_rsc=17645

<div class="flex flex-wrap justify-end items-center gap-2 my-2"><button type="button" class="border border-gray-300 bg-white rounded-md py-2 px-3 text-sm cursor-pointer hover:bg-gray-50 inline-flex items-center bg-white dark:bg-gray-800 dark:text-gray-200"><img alt="" width="20" height="20" class="m-0 w-5 h-5 " src="/icons/search.svg"><span class="ml-1">筛选</span></button><div class="flex items-center gap-1"><span class="text-xs text-gray-500 dark:text-gray-400">时长</span><select id="ranking-time-range" class="border rounded-md py-2 px-3 text-sm disabled:opacity-60 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200" aria-label="时长" title="时长"><option value="0,0">全部</option><option value="0,300">0-5分钟</option><option value="300,900">5-15分钟</option><option value="900,1800">15-30分钟</option><option value="1800,3600">30分钟-1小时</option><option value="3600,0">1小时以上</option></select></div><div class="flex items-center gap-1"><span class="text-xs text-gray-500 dark:text-gray-400">排序</span><select id="ranking-sort" class="border rounded-md py-2 px-3 text-sm disabled:opacity-60 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200" aria-label="排序" title="排序"><option value="favorite">按点赞</option><option value="pv">按观看数</option><option value="time">按时长</option><option value="created">最近添加</option></select></div></div>

---
这个站是有评论区的
<div class="comment mt-6 pt-4"><div class="border-b pb-2 last:border-0"><h2 class="text-xl font-semibold">评论</h2></div><div class="space-y-2"><div class="border-b border-gray-200 dark:border-gray-700 pb-2 pt-2"><div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1"><span>2026年3月28日 09:51:53</span></div><p class="text-gray-800 dark:text-gray-200">这个是谁啊</p><div class="flex items-center gap-3 mt-1"><button aria-label="赞" title="赞" class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors bg-white border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 cursor-pointer"><span>👍</span><span>3</span></button><button aria-label="踩" title="踩" class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 cursor-pointer"><span>👎</span><span>0</span></button></div></div><div class="border-b border-gray-200 dark:border-gray-700 pb-2 pt-2"><div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1"><span>2026年3月28日 09:51:52</span></div><p class="text-gray-800 dark:text-gray-200">这个是谁啊</p><div class="flex items-center gap-3 mt-1"><button aria-label="赞" title="赞" class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors bg-white border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 cursor-pointer"><span>👍</span><span>1</span></button><button aria-label="踩" title="踩" class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 cursor-pointer"><span>👎</span><span>0</span></button></div></div></div><form class="comment-form"><textarea class="my-2 mx-auto block" id="message" name="message" placeholder="コメントを入力" required=""></textarea><button type="submit" class="bg-black text-white border-none px-5 py-[10px] w-full max-w-full md:max-w-[300px] cursor-pointer block mx-auto">添加评论</button></form></div>

---
请自行分析如何适配这个站点，可以call "chrome-devtools" MCP

另外 https://x-ero-anime.com/ 这个站依然是类似API 的 “动漫站” ，也需要添加适配

