/*
 * 69云自动签到脚本 for Loon
 * 
 * 使用方法：
 * 1. 在 Loon 配置文件的 [Script] 部分添加：
 *    cron "0 8-9 * * *" script-path=checkin.js, timeout=10, tag=69云签到
 * 
 * 2. 将你的 cookie 信息填入下方的 COOKIE 变量中
 * 
 * 注意：请保护好你的 cookie 信息，不要泄露给他人
 */

// 配置信息
const CONFIG = {
    url: "https://69yun69.com/user/checkin",
    // 请将下面的 cookie 替换为你自己的
    cookie: "lang=zh-cn; uid=你的uid; email=你的邮箱; key=你的key; ip=你的ip; expire_in=你的过期时间; mtauth=你的认证; pop=yes",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
};

// 主函数
async function main() {
    try {
        console.log("🚀 开始执行签到...");
        
        const headers = {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,zh-HK;q=0.7",
            "cache-control": "no-cache",
            "content-length": "0",
            "cookie": CONFIG.cookie,
            "origin": "https://69yun69.com",
            "pragma": "no-cache",
            "priority": "u=1, i",
            "referer": "https://69yun69.com/user",
            "sec-ch-ua": '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "user-agent": CONFIG.userAgent,
            "x-requested-with": "XMLHttpRequest"
        };
        
        const request = {
            url: CONFIG.url,
            method: "POST",
            headers: headers,
            timeout: 10000
        };
        
        const response = await $httpClient.post(request);
        
        if (response.status === 200) {
            const data = JSON.parse(response.body);
            
            if (data.ret === 1) {
                // 签到成功
                const traffic = data.traffic || "未知";
                const todayUsed = data.trafficInfo?.todayUsedTraffic || "未知";
                const unUsed = data.trafficInfo?.unUsedTraffic || "未知";
                
                const successMsg = `✅ 签到成功！\n${data.msg}\n\n📊 流量信息:\n总流量: ${traffic}\n今日已用: ${todayUsed}\n剩余流量: ${unUsed}`;
                
                console.log(successMsg);
                $notification.post("69云签到", "签到成功", `获得流量: ${traffic}`);
                
            } else {
                // 签到失败
                const errorMsg = `❌ 签到失败: ${data.msg || "未知错误"}`;
                console.log(errorMsg);
                $notification.post("69云签到", "签到失败", data.msg || "未知错误");
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
    } catch (error) {
        const errorMsg = `💥 签到异常: ${error.message}`;
        console.log(errorMsg);
        $notification.post("69云签到", "签到异常", error.message);
    }
}

// 添加随机延时函数（避免在整点同时请求）
function randomDelay() {
    const delay = Math.floor(Math.random() * 60000); // 0-60秒随机延时
    console.log(`⏰ 随机延时 ${delay/1000} 秒`);
    return new Promise(resolve => setTimeout(resolve, delay));
}

// 执行脚本
(async () => {
    await randomDelay();
    await main();
    $done();
})();