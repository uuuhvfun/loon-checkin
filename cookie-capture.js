/*
 * 69云Cookie自动获取脚本 for Loon
 * 
 * 此脚本用于监听69yun69.com的请求，自动提取并保存cookie
 * 配合签到脚本使用，无需手动填写cookie
 * 
 * 配置方法：
 * 在 Loon 配置文件的 [Script] 部分添加：
 * http-response ^https:\/\/69yun69\.com\/user\/ajax_data\/table\/paylist script-path=cookie-capture.js, requires-body=false, timeout=10, tag=69云Cookie获取
 * 
 * 在 [MITM] 部分添加：
 * hostname = 69yun69.com
 */

const COOKIE_KEY = "69yun_cookie";

// 从请求头中提取cookie
function extractCookie() {
    try {
        const requestHeaders = $request.headers;
        const cookie = requestHeaders['Cookie'] || requestHeaders['cookie'];
        
        if (!cookie) {
            console.log("❌ 未在请求头中找到cookie");
            return false;
        }
        
        // 验证cookie是否包含必要的字段
        const requiredFields = ['uid=', 'email=', 'key=', 'expire_in='];
        const hasRequiredFields = requiredFields.every(field => cookie.includes(field));
        
        if (!hasRequiredFields) {
            console.log("⚠️ Cookie缺少必要字段，跳过保存");
            return false;
        }
        
        // 保存cookie到持久化存储
        const success = $persistentStore.write(cookie, COOKIE_KEY);
        
        if (success) {
            console.log("✅ Cookie已成功保存");
            console.log(`📝 Cookie内容: ${cookie.substring(0, 100)}...`);
            
            // 提取用户信息用于通知
            const uidMatch = cookie.match(/uid=([^;]+)/);
            const emailMatch = cookie.match(/email=([^;]+)/);
            const uid = uidMatch ? decodeURIComponent(uidMatch[1]) : "未知";
            const email = emailMatch ? decodeURIComponent(emailMatch[1]) : "未知";
            
            $notification.post(
                "69云Cookie获取", 
                "Cookie已更新", 
                `用户ID: ${uid}\n邮箱: ${email}`
            );
            
            return true;
        } else {
            console.log("❌ Cookie保存失败");
            return false;
        }
        
    } catch (error) {
        console.log(`💥 提取Cookie时发生错误: ${error.message}`);
        return false;
    }
}

// 显示当前存储的cookie信息（用于调试）
function showStoredCookie() {
    const storedCookie = $persistentStore.read(COOKIE_KEY);
    if (storedCookie) {
        const uidMatch = storedCookie.match(/uid=([^;]+)/);
        const emailMatch = storedCookie.match(/email=([^;]+)/);
        const expireMatch = storedCookie.match(/expire_in=([^;]+)/);
        
        const uid = uidMatch ? decodeURIComponent(uidMatch[1]) : "未知";
        const email = emailMatch ? decodeURIComponent(emailMatch[1]) : "未知";
        const expire = expireMatch ? new Date(parseInt(expireMatch[1]) * 1000).toLocaleString() : "未知";
        
        console.log("📊 当前存储的Cookie信息:");
        console.log(`👤 用户ID: ${uid}`);
        console.log(`📧 邮箱: ${email}`);
        console.log(`⏰ 过期时间: ${expire}`);
    } else {
        console.log("❌ 未找到存储的Cookie");
    }
}

// 主执行函数
function main() {
    console.log("🔍 开始监听Cookie获取...");
    console.log(`📍 请求URL: ${$request.url}`);
    
    // 显示当前存储的cookie信息
    showStoredCookie();
    
    // 提取并保存新的cookie
    const result = extractCookie();
    
    if (result) {
        console.log("🎉 Cookie获取任务完成");
    } else {
        console.log("⚠️ 本次未获取到有效Cookie");
    }
}

// 执行脚本
main();
$done({});