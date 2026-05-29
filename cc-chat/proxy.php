<?php
/**
 * CC Web Chat - CORS 代理
 *
 * 用途：如果 AI API 不支持浏览器直接调用（CORS 错误），
 * 将此文件放到任意 PHP 服务器上，前端 API 地址指向此文件。
 *
 * 使用方式：
 * 1. 修改下方 API_BASE_URL 和 API_KEY
 * 2. 上传到 PHP 服务器（如现有 Laravel 站点目录）
 * 3. 前端设置中 API 地址填 https://你的域名/proxy.php
 * 4. 前端 API Key 可留空（已在此配置）
 */

// ====== 配置 ======
define('API_BASE_URL', 'https://api.openai.com/v1');
define('API_KEY', 'sk-your-api-key-here');

// ====== CORS 头 ======
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ====== 获取前端请求体 ======
$input = file_get_contents('php://input');
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit;
}

// ====== 获取 API Key（优先用前端传来的，否则用配置的） ======
$apiKey = API_KEY;
if (defined('API_KEY') && API_KEY !== 'sk-your-api-key-here') {
    $apiKey = API_KEY;
} else {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        $apiKey = $m[1];
    }
}

// ====== 转发请求到 AI API ======
$url = API_BASE_URL . '/chat/completions';

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $input,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_WRITEFUNCTION => function ($ch, $data) {
        echo $data;
        ob_flush();
        flush();
        return strlen($data);
    },
]);

// 禁用输出缓冲
if (ob_get_level()) ob_end_clean();
ob_implicit_flush(true);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Proxy error: ' . $error]);
}
