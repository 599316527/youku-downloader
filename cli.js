const fs = require('fs');
const {promisify} = require('util');
const puppeteer = require('puppeteer');
const program = require('commander');
program.option('--vid <vid>', 'youku video encoded id');
program.parse(process.argv);

logToStderr(program.vid);

const emulateOptions = {
    viewport: {
        width: 1210,
        height: 746
    },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36'
};

async function main() {
    const browser = await puppeteer.launch({
        headless: false,
        handleSIGINT: false,
        // 指定单独的用户数据目录。实测直接用当前 chrome 的用户数据目录会 crash
        userDataDir: process.env.USER_DATA_DIR
    });
    const page = await browser.newPage();
    await page.emulate(emulateOptions);

    let gotVideoPromise = new Promise(function (resolve, reject) {
        page.on('response', async function (response) {
            let responseURL = response.url();
            if (responseURL.startsWith('https://acs.youku.com/h5/mtop.youku.play.ups.appinfo.get/1.1/')) {
                logToStderr('收到响应');
                let content = await response.text();
                content = content.substring(content.indexOf('(') + 1, content.lastIndexOf(')'));
                let data;
                try {
                    data = JSON.parse(content);
                }
                catch (err) {
                    reject(err);
                }
                if (data.data.data.error) {
                    console.log(data.data.data.error);
                }

                let {
                    video: {title, encodeid, stream_types},
                    videos: {list},
                    stream
                } = data.data.data;

                let streamType = stream_types.default[0];
                let selectedStream = stream.find(s => s.stream_type === streamType);

                logToStderr('其他视频');
                logToStderr(list.map(function ({title, encodevid}) {
                    return `${encodevid}\t${title}`;
                }).join('\n'));

                resolve({
                    title,
                    encodeid,
                    stream: selectedStream
                });
            }
        });
    });

    logToStderr('打开页面');
    await page.goto(`https://v.youku.com/v_show/id_${program.vid}.html`);
    let {title, encodeid, stream} = await gotVideoPromise;
    await page.close();

    await promisify(fs.writeFile)(`${encodeid}.sh`, `
wget -O "${title}_${encodeid}.m3u8" "${stream.m3u8_url}";
ffmpeg -protocol_whitelist file,http,https,tcp,tls -i "${title}_${encodeid}.m3u8" "${title}_${encodeid}.mp4";
    `);

}

function logToStderr(msg) {
    process.stderr.write(msg + '\n');
}

main().catch(function (err) {
    console.log(err)
    process.exit(1);
});