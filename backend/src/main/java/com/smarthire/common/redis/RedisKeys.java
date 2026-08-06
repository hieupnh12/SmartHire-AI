package com.smarthire.common.redis;

/**
 * Canonical Redis key patterns for SmartHire-AI.
 * See docs/architecture/ASYNC_AND_CACHE.md
 */
public final class RedisKeys {

    private RedisKeys() {
    }

    public static String jobList(String filterHash) {
        return "cache:jobs:list:" + filterHash;
    }

    public static String dashboardSummary(Long orgOrUserId) {
        return "cache:dashboard:summary:" + orgOrUserId;
    }

    public static String emailOtp(Long userId) {
        return "otp:email:" + userId;
    }

    public static String jwtBlacklist(String jti) {
        return "auth:jwt:blacklist:" + jti;
    }

    public static String refreshSession(Long userId, String tokenId) {
        return "auth:refresh:" + userId + ":" + tokenId;
    }

    public static String rateLimit(String route, String identity) {
        return "ratelimit:" + route + ":" + identity;
    }

    public static String matchScore(Long jobId, Long cvId) {
        return "match:job:" + jobId + ":cv:" + cvId;
    }

    public static String cvAnalyzeLock(Long cvId) {
        return "lock:cv:analyze:" + cvId;
    }
}
