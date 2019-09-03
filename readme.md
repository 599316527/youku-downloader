Youku Downloader
===========

20190903 测试有效。不保证未来优酷升级后是否还支持。

因为 flvcd 不支持优酷下载，然后又希望把优酷上的某些视频搞成音频放到 podcast app 里面听，所以搞了个自用的简易优酷视频下载工具。

## 用法

Chromium 不支持 h264，又没有 flash，用 Puppeteer bundled chromium 打开优酷都提示浏览器过旧无法播放视频，懒得去绕开检测的，直接 `PUPPETEER_EXECUTABLE_PATH` 指定用 Chrome。
实测直接用当前 chrome 的用户数据目录会 crash，所以指定单独的用户数据目录 `--user-data-dir=~/.config/puppeteer-chrome-dir`。

也可以用代理工具把 `https://g.alicdn.com/player/beta-ykplayer/1.8.1/youku-player.min.js` 中检查 mp4 支持的地方改成永远返回 true。

用 `USER_DATA_DIR` 指定用户数据目录，保存 cookie 等信息。

```
isSupportMP4: function() {
    return true;
```

`vid` 从视频页面 url 上得到 `https://v.youku.com/v_show/id_${program.vid}.html` 。

```bash
node ./cli.js --vid XNDMyMDQwMTAwMA==  # 提取视频信息生成下载脚本。
bash ./XNDMyMDQwMTAwMA==.sh # 下载 m3u8 文件，用 ffmpeg 下载并合并成 mp4
```

需要 `PATH` 环境变量能搜索到 `wget` 和 `ffmpeg`。特殊生成需求直接去改拼 sh 文件里面的 ffmpeg 参数。

## 原理

用 Chrome 去访问视频页面，可以不用管 youku 的各种防爬虫，监听下网络请求得到一个大 json ，里面包含了这个页面视频的所有信息。取出信息拼一个 shell 出来跑一下就开始下载视频了。


