/*
 * 69云自动签到脚本 for Loon
 * 
 * 使用方法：
 * 1. 在 Loon 配置文件的 [Script] 部分添加：
 *    # Cookie获取脚本
 *    http-response ^https:\/\/69yun69\.com\/user\/ajax_data\/table\/paylist script-path=cookie-capture.js, requires-body=false, timeout=10, tag=69云Cookie获取
 *    
 *    # 自动签到脚本  
 *    cron "0 8-9 * * *" script-path=checkin.js, timeout=10, tag=69云签到
 * 
 * 2. 在 Loon 配置文件的 [MITM] 部分添加：
 *    hostname = 69yun69.com
 * 
 * 注意：首次使用需要先访问网站让脚本获取cookie
 */

// 配置信息
const CONFIG = {
    url: "https://69yun69.com/user/checkin",
    cookieKey: "69yun_cookie", // 必须与cookie获取脚本中的COOKIE_KEY一致
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
};

// 调试函数：检查存储状态
function debugStorage() {
    console.log("🔍 调试存储状态...");
    
    // 检查cookie是否存在
    const storedCookie = $persistentStore.read(CONFIG.cookieKey);
    if (storedCookie) {
        console.log(`✅ 找到存储的Cookie (key: ${CONFIG.cookieKey})`);
        console.log(`📏 长度: ${storedCookie.length} 字符`);
        console.log(`📝 前100字符: ${storedCookie.substring(0, 100)}...`);
        
        // 检查关键字段
        const fields = ['uid=', 'email=', 'key=', 'expire_in='];
        fields.forEach(field => {
            if (storedCookie.includes(field)) {
                console.log(`✅ 包含字段: ${field}`);
            } else {
                console.log(`❌ 缺少字段: ${field}`);
            }
        });
    } else {
        console.log(`❌ 未找到存储的Cookie (key: ${CONFIG.cookieKey})`);
        
        // 列出所有存储的key
        console.log("📋 尝试列出所有存储的key...");
        // 注意：$persistentStore 没有列出所有key的方法，但我们可以尝试常见的key
        const commonKeys = ['69yun_cookie', 'cookie', 'user_cookie'];
        commonKeys.forEach(key => {
            const value = $persistentStore.read(key);
            if (value) {
                console.log(`🔍 找到key: ${key}, 长度: ${value.length}`);
            }
        });
    }
}

// 获取存储的cookie
function getCookie() {
    const storedCookie = $persistentStore.read(CONFIG.cookieKey);
    if (!storedCookie) {
        console.log("❌ 未找到存储的Cookie");
        console.log("📋 请检查：");
        console.log("1. 是否已访问网站让Cookie获取脚本工作");
        console.log("2. Cookie获取脚本是否正常运行");
        console.log("3. MITM功能是否正常");
        throw new Error("未找到cookie，请先访问网站让脚本获取cookie");
    }
    
    console.log("✅ 成功读取存储的Cookie");
    console.log(`📝 Cookie长度: ${storedCookie.length}`);
    console.log(`📝 Cookie前100字符: ${storedCookie.substring(0, 100)}...`);
    
    // 验证cookie基本格式
    if (!storedCookie.includes('uid=') || !storedCookie.includes('key=')) {
        console.log("⚠️ Cookie格式可能有问题");
    }
    
    return storedCookie;
}

// 主函数
async function main() {
    try {
        console.log("🚀 开始执行签到...");
        
        // 调试存储状态
        debugStorage();
        
        const cookie = getCookie();
        console.log("📝 将使用以下Cookie进行签到");
        
        const headers = {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,zh-HK;q=0.7",
            "cache-control": "no-cache",
            "content-length": "0",
            "cookie": cookie,
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
        
        console.log("📤 发送签到请求...");
        console.log(`🎯 URL: ${CONFIG.url}`);
        console.log(`🍪 Cookie预览: ${cookie.substring(0, 100)}...`);
        
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
