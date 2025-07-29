/*
 * 69云Cookie自动获取脚本 - 完整版
 * 
 * 功能：自动监听网站请求，提取并保存Cookie用于签到
 * 
 * 配置方法：
 * 在Loon配置文件的[Script]部分添加：
 * http-response ^https:\/\/69yun69\.com\/user script-path=cookie-capture.js, requires-body=false, timeout=10, tag=69云Cookie获取
 * 
 * 在[MITM]部分添加：
 * hostname = 69yun69.com
 * 
 * 作者: Your Name
 * 版本: 1.0.0
 * 更新时间: 2025-07-28
 */

const SCRIPT_NAME = "69云Cookie获取";
const COOKIE_KEY = "69yun_cookie";
const VERSION = "1.0.0";

// 检查脚本运行环境
function checkEnvironment() {
    if (typeof $request === 'undefined') {
        const errorMsg = "脚本运行环境错误，请检查配置";
        console.log(`❌ ${errorMsg}`);
        console.log("📋 检查清单：");
        console.log("1. 确保配置为 http-response 类型脚本");
        console.log("2. 确保 MITM 功能已开启并添加了 69yun69.com");
        console.log("3. 确保已安装并信任 CA 证书");
        console.log("4. 确保访问的 URL 匹配脚本正则表达式");
        
        $notification.post(SCRIPT_NAME, "配置错误", errorMsg);
        return false;
    }
    return true;
}

// 验证cookie完整性和有效性
function validateCookie(cookie) {
    if (!cookie || cookie.length < 50) {
        return { valid: false, reason: "Cookie为空或长度过短" };
    }
    
    // 检查必要字段
    const requiredFields = [
        { field: 'uid=', name: '用户ID' },
        { field: 'email=', name: '邮箱' },
        { field: 'key=', name: '认证密钥' },
        { field: 'expire_in=', name: '过期时间' }
    ];
    
    const missingFields = [];
    requiredFields.forEach(item => {
        if (!cookie.includes(item.field)) {
            missingFields.push(item.name);
        }
    });
    
    if (missingFields.length > 0) {
        return { 
            valid: false, 
            reason: `缺少必要字段: ${missingFields.join(', ')}` 
        };
    }
    
    // 检查过期时间
    const expireMatch = cookie.match(/expire_in=([^;]+)/);
    if (expireMatch) {
        const expireTime = parseInt(expireMatch[1]) * 1000;
        const currentTime = Date.now();
        const remainingHours = Math.floor((expireTime - currentTime) / (1000 * 60 * 60));
        
        if (expireTime < currentTime) {
            return { 
                valid: false, 
                reason: `Cookie已过期 (${new Date(expireTime).toLocaleString()})` 
            };
        }
        
        if (remainingHours < 24) {
            console.log(`⚠️ Cookie即将过期，剩余时间: ${remainingHours}小时`);
        }
    }
    
    return { valid: true, reason: "Cookie验证通过" };
}

// 提取用户信息
function extractUserInfo(cookie) {
    const info = { raw: cookie };
    
    // 提取各个字段
    const fields = {
        uid: /uid=([^;]+)/,
        email: /email=([^;]+)/,
        key: /key=([^;]+)/,
        expire_in: /expire_in=([^;]+)/,
        ip: /ip=([^;]+)/,
        mtauth: /mtauth=([^;]+)/
    };
    
    Object.keys(fields).forEach(key => {
        const match = cookie.match(fields[key]);
        if (match) {
            info[key] = decodeURIComponent(match[1]);
        }
    });
    
    // 格式化过期时间
    if (info.expire_in) {
        info.expireDate = new Date(parseInt(info.expire_in) * 1000);
        info.expireDateString = info.expireDate.toLocaleString();
        info.remainingDays = Math.floor((info.expireDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    return info;
}

// 比较两个cookie是否相同
function isSameCookie(cookie1, cookie2) {
    if (!cookie1 || !cookie2) return false;
    
    // 提取关键字段进行比较，忽略可能变化的字段如时间戳
    const extractKey = (cookie) => {
        const uid = cookie.match(/uid=([^;]+)/);
        const key = cookie.match(/key=([^;]+)/);
        const expire = cookie.match(/expire_in=([^;]+)/);
        return `${uid?.[1]}_${key?.[1]}_${expire?.[1]}`;
    };
    
    return extractKey(cookie1) === extractKey(cookie2);
}

// 从请求头中提取cookie
function extractCookie() {
    try {
        const requestHeaders = $request.headers;
        const cookie = requestHeaders['Cookie'] || requestHeaders['cookie'];
        
        if (!cookie) {
            console.log("⚠️ 请求头中未找到Cookie字段");
            return false;
        }
        
        console.log(`📥 检测到Cookie，长度: ${cookie.length} 字符`);
        console.log(`📝 Cookie前80字符: ${cookie.substring(0, 80)}...`);
        
        // 验证cookie
        const validation = validateCookie(cookie);
        if (!validation.valid) {
            console.log(`❌ Cookie验证失败: ${validation.reason}`);
            return false;
        }
        
        console.log(`✅ Cookie验证成功: ${validation.reason}`);
        
        // 检查是否与已存储的cookie相同
        const storedCookie = $persistentStore.read(COOKIE_KEY);
        if (storedCookie && isSameCookie(storedCookie, cookie)) {
            console.log("ℹ️ Cookie未发生变化，当前Cookie仍然有效");
            console.log("📊 无需更新存储的Cookie");
            
            // 提取用户信息用于通知
            const userInfo = extractUserInfo(storedCookie);
            const validation = validateCookie(storedCookie);
            
            // 即使Cookie未变化，也发送状态通知
            const notificationBody = `Cookie状态: ✅ 已存在且有效\n用户: ${userInfo.uid || '未知'}\n剩余有效期: ${userInfo.remainingDays || '?'}天`;
            $notification.post(SCRIPT_NAME, "Cookie状态检查", notificationBody);
            
            return true;
        }
        
        if (storedCookie) {
            console.log("🔄 检测到Cookie变化，准备更新...");
        } else {
            console.log("🆕 首次获取Cookie，准备保存...");
        }
        
        // 保存新cookie
        const saveResult = $persistentStore.write(cookie, COOKIE_KEY);
        
        if (saveResult) {
            console.log("✅ Cookie保存成功");
            
            // 提取并显示用户信息
            const userInfo = extractUserInfo(cookie);
            console.log("👤 用户信息:");
            console.log(`   用户ID: ${userInfo.uid || '未知'}`);
            console.log(`   邮箱: ${userInfo.email || '未知'}`);
            console.log(`   过期时间: ${userInfo.expireDateString || '未知'}`);
            console.log(`   剩余天数: ${userInfo.remainingDays || '未知'} 天`);
            
            // 发送通知 - 区分首次获取和更新
            let notificationTitle, notificationBody;
            
            if (storedCookie) {
                // Cookie更新
                notificationTitle = "Cookie已更新";
                notificationBody = `🔄 检测到变化并已更新\n用户: ${userInfo.uid || '未知'}\n邮箱: ${userInfo.email || '未知'}\n有效期: ${userInfo.remainingDays || '?'}天`;
                console.log("🔄 Cookie更新完成");
            } else {
                // 首次获取
                notificationTitle = "Cookie已获取";
                notificationBody = `🆕 首次获取成功\n用户: ${userInfo.uid || '未知'}\n邮箱: ${userInfo.email || '未知'}\n有效期: ${userInfo.remainingDays || '?'}天`;
                console.log("🆕 Cookie首次获取完成");
            }
            
            $notification.post(SCRIPT_NAME, notificationTitle, notificationBody);
            
            return true;
        } else {
            console.log("❌ Cookie保存失败");
            $notification.post(SCRIPT_NAME, "保存失败", "Cookie保存到本地存储失败");
            return false;
        }
        
    } catch (error) {
        const errorMsg = `Cookie提取过程发生异常: ${error.message}`;
        console.log(`💥 ${errorMsg}`);
        $notification.post(SCRIPT_NAME, "提取异常", error.message);
        return false;
    }
}

// 显示当前存储的cookie信息
function showStoredCookieInfo() {
    const storedCookie = $persistentStore.read(COOKIE_KEY);
    if (storedCookie) {
        const userInfo = extractUserInfo(storedCookie);
        const validation = validateCookie(storedCookie);
        
        console.log("📊 当前存储的Cookie信息:");
        console.log(`   状态: ${validation.valid ? '✅ 有效' : '❌ 无效 - ' + validation.reason}`);
        console.log(`   用户ID: ${userInfo.uid || '未知'}`);
        console.log(`   邮箱: ${userInfo.email || '未知'}`);
        console.log(`   过期时间: ${userInfo.expireDateString || '未知'}`);
        console.log(`   剩余天数: ${userInfo.remainingDays || '未知'} 天`);
        console.log(`   存储长度: ${storedCookie.length} 字符`);
        
        return { exists: true, valid: validation.valid, userInfo };
    } else {
        console.log("📊 当前存储状态: ❌ 未找到Cookie");
        return { exists: false, valid: false, userInfo: null };
    }
}

// 主执行函数
function main() {
    const timestamp = new Date().toLocaleString();
    console.log(`🔍 [${timestamp}] ${SCRIPT_NAME} v${VERSION} 开始执行`);
    console.log(`📍 请求信息:`);
    console.log(`   URL: ${$request.url}`);
    console.log(`   方法: ${$request.method}`);
    console.log(`   请求头数量: ${Object.keys($request.headers).length}`);
    console.log("");
    
    // 检查运行环境
    if (!checkEnvironment()) {
        return;
    }
    
    // 显示当前存储的cookie信息
    const currentStatus = showStoredCookieInfo();
    console.log("");
    
    // 提取并处理新的cookie
    const extractResult = extractCookie();
    
    console.log("");
    if (extractResult) {
        console.log("🎉 Cookie处理完成");
        
        // 如果是首次获取cookie，给出使用提示
        if (!currentStatus.exists) {
            console.log("💡 温馨提示: 这是首次获取Cookie，现在可以使用自动签到功能了");
        }
    } else {
        console.log("⚠️ Cookie处理失败，请检查网络连接或重新登录");
    }
    
    console.log("=" .repeat(60));
}

// 执行脚本
try {
    main();
} catch (error) {
    console.log(`💥 脚本执行异常: ${error.message}`);
    $notification.post(SCRIPT_NAME, "脚本异常", error.message);
} finally {
    $done({});
}
