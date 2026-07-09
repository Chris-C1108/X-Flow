将代码从本地提交并推送到 GitHub，通常遵循“三板斧”流程：

暂存 (add) -> 提交 (commit) -> 推送 (push)。



### 第一步：暂存更改
将修改过的文件添加到暂存区。

git add .
（注：. 表示添加所有更改。如果只需添加特定文件，请使用 git add <文件名>）

### 第二步：提交到本地仓库
创建一个包含日志消息的新提交，记录你的修改内容。

git commit -m "这里填写你的提交说明"


### 第三步：推送到 GitHub
将本地的提交发送到远程 GitHub 仓库。

git push origin main
（注：旧版仓库默认分支可能是 master，请根据实际情况替换 main） 


2. 首次关联 GitHub 仓库的操作
如果你是第一次将本地文件夹推送到一个新的 GitHub 仓库，需要先进行初始化和关联：
初始化本地 Git 仓库：

git init


关联远程仓库：
从 GitHub 仓库页面获取仓库地址（SSH 或 HTTPS），然后执行：

git remote add origin <GitHub 仓库地址>


首次推送（建议使用 -u 参数建立追踪关系）：

git push -u origin main


3. 常用辅助命令
查看状态：git status（查看哪些文件被修改或已暂存）
拉取更新：git pull origin main（在推送前，建议先拉取 GitHub 上的最新改动，以防冲突）
查看日志：git log（查看历史提交记录） 



---
git config --list --show-origin
git config --global user.name "Chris-C1108"
git config --global user.email chen.m1108@gmail.com

分支更名后
git branch -m main master
git fetch origin
git branch -u origin/master master
git remote set-head origin -a