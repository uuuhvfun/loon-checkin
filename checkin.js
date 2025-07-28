/*
 * 69云自动签到脚本 - 完整版
 * 
 * 功能：使用存储的Cookie自动执行签到，获取流量奖励
 * 
 * 配置方法：
 * 在Loon配置文件的[Script]部分添加：
 * cron "0 8-9 * * *" script-path=checkin.js, timeout=30, tag=69云自动签到
 * 
 * 时间配置说明：
 * "0 8-9 * * *"  = 每天8-9点执行（8:00和9:00）
 * "30 8 * * *"   = 每天8:30执行
 * "0 8,20 * * *" = 每天8:00和20:00执行
 * 
 * 作者: Your Name
 * 版本: 1.0.0
 * 更新时间: 2025-07-28
 */

const SCRIPT_NAME = "69云自动签到";
const VERSION = "1.0.0";

// 配置信息
const CONFIG = {
    // 签到接口URL
    checkinUrl: "https://69yun69.com/user/checkin",
    
    // Cookie存储键名（必须与Cookie获取脚本一致）
    cookieKey: "69yun_cookie",
    
    // 请求超时时间（毫秒）
    timeout: 15000,
    
    // User-Agent
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    
    // 随机延迟范围（秒）
    randomDelayRange: [10, 300] // 10秒到5分钟
};

// 生成随机延迟时间
function getRandomDelay() {
    const [min, max] = CONFIG.randomDelayRange;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return delay * 1000; // 转换为毫秒
}

// 验证Cookie有效性
function validateStoredCookie(cookie) {
    if (!cookie || typeof cookie !== 'string' || cookie.length < 50) {
        return { valid: false, reason: "Cookie为空或格式无效" };
    }
    
    // 检查必要字段
    const requiredFields = ['uid=', 'email=', 'key=', 'expire_in='];
    const missingFields = requiredFields.filter(field => !cookie.includes(field));
    
    if (missingFields.length > 0) {
        return { 
            valid: false, 
            reason: `Cookie缺少必要字段: ${missingFields.join(', ')}` 
        };
    }
    
    // 检查过期时间
    const expireMatch = cookie.match(/expire_in=([^;]+)/);
    if (expireMatch) {
        const expireTime = parseInt(expireMatch[1]) * 1000;
        const currentTime = Date.now();
        
        if (expireTime <= currentTime) {
            return { 
                valid: false, 
                reason: `Cookie已过期 (${new Date(expireTime).toLocaleString()})` 
            };
        }
        
        const remainingHours = Math.floor((expireTime - currentTime) / (1000 * 60 * 60));
        if (remainingHours < 24) {
            console.log(`⚠️ Cookie即将过期，剩余 ${remainingHours} 小时`);
        }
    }
    
    return { valid: true, reason: "Cookie验证通过" };
}

// 获取存储的Cookie
function getStoredCookie() {
    console.log("🍪 正在读取存储的Cookie...");
    
    const storedCookie = $persistentStore.read(CONFIG.cookieKey);
    
    if (!storedCookie) {
        const errorMsg = "未找到存储的Cookie";
        console.log(`❌ ${errorMsg}`);
        console.log("📋 可能的原因：");
        console.log("1. 尚未运行Cookie获取脚本");
        console.log("2. Cookie获取脚本配置错误");
        console.log("3. 未访问过网站让Cookie获取脚本工作");
        console.log("4. Cookie存储键名不匹配");
        console.log("");
        console.log("🛠️ 解决方案：");
        console.log("1. 确保Cookie获取脚本已正确配置");
        console.log("2. 用浏览器访问 https://69yun69.com/user 并登录");
        console.log("3. 检查Cookie获取脚本的日志");
        
        throw new Error(errorMsg);
    }
    
    console.log(`✅ Cookie读取成功，长度: ${storedCookie.length} 字符`);
    console.log(`📝 Cookie预览: ${storedCookie.substring(0, 80)}...`);
    
    // 验证Cookie
    const validation = validateStoredCookie(storedCookie);
    if (!validation.valid) {
        const errorMsg = `Cookie验证失败: ${validation.reason}`;
        console.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
    }
    
    console.log(`✅ Cookie验证成功: ${validation.reason}`);
    
    // 提取用户信息用于日志
    const uidMatch = storedCookie.match(/uid=([^;]+)/);
    const emailMatch = storedCookie.match(/email=([^;]+)/);
    if (uidMatch || emailMatch) {
        console.log("👤 用户信息:");
        if (uidMatch) console.log(`   用户ID: ${decodeURIComponent(uidMatch[1])}`);
        if (emailMatch) console.log(`   邮箱: ${decodeURIComponent(emailMatch[1])}`);
    }
    
    return storedCookie;
}

// 构建HTTP请求头
function buildRequestHeaders(cookie) {
    return {
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
}

// 执行签到请求
async function performCheckin(cookie) {
    console.log("📤 正在发送签到请求...");
    
    const headers = buildRequestHeaders(cookie);
    const request = {
        url: CONFIG.checkinUrl,
        method: "POST",
        headers: headers,
        timeout: CONFIG.timeout
    };
    
    console.log(`🎯 请求URL: ${CONFIG.checkinUrl}`);
    console.log(`⏱️ 超时时间: ${CONFIG.timeout}ms`);
    console.log(`🍪 Cookie长度: ${cookie.length} 字符`);
    
    return new Promise((resolve, reject) => {
        $httpClient.post(request, (error, response, body) => {
            if (error) {
                const errorMsg = `网络请求失败: ${JSON.stringify(error)}`;
                console.log(`❌ ${errorMsg}`);
                reject(new Error(errorMsg));
                return;
            }
            
            console.log(`📡 HTTP响应状态: ${response.status}`);
            console.log(`📄 响应体长度: ${body ? body.length : 0} 字符`);
            
            if (response.status !== 200) {
                const errorMsg = `HTTP请求失败，状态码: ${response.status}`;
                console.log(`❌ ${errorMsg}`);
                console.log(`📄 响应内容: ${body || '无响应内容'}`);
                reject(new Error(errorMsg));
                return;
            }
            
            if (!body) {
                const errorMsg = "服务器返回空响应";
                console.log(`❌ ${errorMsg}`);
                reject(new Error(errorMsg));
                return;
            }
            
            try {
                const data = JSON.parse(body);
                console.log("✅ 响应JSON解析成功");
                console.log(`📊 服务器响应: ${JSON.stringify(data, null, 2)}`);
                resolve(data);
            } catch (parseError) {
                const errorMsg = `JSON解析失败: ${parseError.message}`;
                console.log(`❌ ${errorMsg}`);
                console.log(`📄 原始响应: ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}`);
                reject(new Error(errorMsg));
            }
        });
    });
}

// 解析并处理签到结果
function processCheckinResult(data) {
    console.log("📊 正在处理签到结果...");
    
    if (data.ret === 1) {
        // 签到成功
        console.log("🎉 签到成功！");
        
        // 解析消息内容
        const message = data.msg || "签到成功，但未返回详细信息";
        console.log(`📝 服务器消息: ${message}`);
        
        // 解析流量信息
        let trafficInfo = "未知";
        let detailInfo = "";
        
        if (data.traffic) {
            trafficInfo = data.traffic;
            console.log(`📊 总流量: ${data.traffic}`);
        }
        
        if (data.trafficInfo) {
            console.log("📈 流量详细信息:");
            const todayUsed = data.trafficInfo.todayUsedTraffic || "未知";
            const lastUsed = data.trafficInfo.lastUsedTraffic || "未知";
            const unUsed = data.trafficInfo.unUsedTraffic || "未知";
            
            console.log(`   今日已用: ${todayUsed}`);
            console.log(`   最近使用: ${lastUsed}`);
            console.log(`   剩余流量: ${unUsed}`);
            
            detailInfo = `今日已用: ${todayUsed}\n剩余: ${unUsed}`;
        }
        
        // 提取今日获得的流量（从消息中解析）
        let gainedTraffic = "未知";
        const gainMatch = message.match(/获得了\s*([\d.]+\s*[KMGT]?B)/);
        if (gainMatch) {
            gainedTraffic = gainMatch[1];
            console.log(`🎁 今日获得流量: ${gainedTraffic}`);
        }
        
        // 发送成功通知
        const notificationTitle = "签到成功";
        const notificationBody = detailInfo || `获得流量: ${gainedTraffic}`;
        $notification.post(SCRIPT_NAME, notificationTitle, notificationBody);
        
        return {
            success: true,
            message: message,
            gainedTraffic: gainedTraffic,
            totalTraffic: trafficInfo,
            details: data.trafficInfo
        };
        
    } else {
        // 签到失败
        const errorMessage = data.msg || "签到失败，未知原因";
        console.log(`❌ 签到失败: ${errorMessage}`);
        
        // 分析常见失败原因
        if (errorMessage.includes("已签到") || errorMessage.includes("重复")) {
            console.log("ℹ️ 今日已经签到过了");
        } else if (errorMessage.includes("登录") || errorMessage.includes("auth")) {
            console.log("⚠️ 可能是Cookie过期，需要重新获取");
        } else if (errorMessage.includes("网络") || errorMessage.includes("超时")) {
            console.log("⚠️ 网络连接问题，稍后会自动重试");
        }
        
        // 发送失败通知
        $notification.post(SCRIPT_NAME, "签到失败", errorMessage);
        
        return {
            success: false,
            message: errorMessage,
            needReauth: errorMessage.includes("登录") || errorMessage.includes("auth")
        };
    }
}

// 随机延迟函数
async function randomDelay() {
    const delay = getRandomDelay();
    const seconds = Math.floor(delay / 1000);
    console.log(`⏰ 随机延迟 ${seconds} 秒，避免同时请求...`);
    
    return new Promise(resolve => {
        setTimeout(resolve, delay);
    });
}

// 主签到函数
async function performMainCheckin() {
    try {
        console.log("🚀 开始执行签到流程...");
        
        // 步骤1: 获取Cookie
        const cookie = getStoredCookie();
        console.log("");
        
        // 步骤2: 随机延迟
        await randomDelay();
        console.log("");
        
        // 步骤3: 执行签到请求
        const responseData = await performCheckin(cookie);
        console.log("");
        
        // 步骤4: 处理签到结果
        const result = processCheckinResult(responseData);
        console.log("");
        
        if (result.success) {
            console.log("🎊 签到流程完成，任务执行成功！");
            
            // 记录成功统计
            const successCount = parseInt($persistentStore.read("checkin_success_count") || "0") + 1;
            $persistentStore.write(successCount.toString(), "checkin_success_count");
            $persistentStore.write(Date.now().toString(), "last_checkin_time");
            
            console.log(`📈 累计成功签到: ${successCount} 次`);
        } else {
            console.log("⚠️ 签到流程完成，但签到未成功");
            
            if (result.needReauth) {
                console.log("🔄 建议重新访问网站获取Cookie");
            }
        }
        
        return result;
        
    } catch (error) {
        const errorMsg = `签到过程发生异常: ${error.message}`;
        console.log(`💥 ${errorMsg}`);
        
        // 发送异常通知
        $notification.post(SCRIPT_NAME, "签到异常", error.message);
        
        // 记录失败统计
        const failCount = parseInt($persistentStore.read("checkin_fail_count") || "0") + 1;
        $persistentStore.write(failCount.toString(), "checkin_fail_count");
        
        throw error;
    }
}

// 脚本主入口
async function main() {
    const startTime = new Date();
    console.log(`🎯 ${SCRIPT_NAME} v${VERSION} 启动`);
    console.log(`⏰ 执行时间: ${startTime.toLocaleString()}`);
    console.log(`🔧 配置信息:`);
    console.log(`   签到URL: ${CONFIG.checkinUrl}`);
    console.log(`   Cookie键: ${CONFIG.cookieKey}`);
    console.log(`   超时时间: ${CONFIG.timeout}ms`);
    console.log(`   延迟范围: ${CONFIG.randomDelayRange[0]}-${CONFIG.randomDelayRange[1]}秒`);
    console.log("=" .repeat(60));
    
    try {
        // 执行主要签到流程
        const result = await performMainCheckin();
        
        const endTime = new Date();
        const duration = Math.floor((endTime - startTime) / 1000);
        
        console.log("=" .repeat(60));
        console.log(`🏁 脚本执行完成，耗时: ${duration} 秒`);
        console.log(`📊 执行结果: ${result.success ? '✅ 成功' : '❌ 失败'}`);
        
        if (result.success && result.gainedTraffic) {
            console.log(`🎁 本次获得流量: ${result.gainedTraffic}`);
        }
        
    } catch (error) {
        console.log("=" .repeat(60));
        console.log(`💥 脚本执行失败: ${error.message}`);
        console.log("🛠️ 建议:");
        console.log("1. 检查网络连接");
        console.log("2. 确认Cookie是否有效");
        console.log("3. 检查网站是否正常访问");
        console.log("4. 查看详细日志排查问题");
    }
}

// 执行脚本
main().then(() => {
    console.log("🔚 脚本线程结束");
    $done();
}).catch((error) => {
    console.log(`💥 脚本线程异常结束: ${error.message}`);
    $done();
});
