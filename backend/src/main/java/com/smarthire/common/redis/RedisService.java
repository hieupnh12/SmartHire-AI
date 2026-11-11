package com.smarthire.common.redis;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * Thin Redis helpers for cache / OTP / blacklist / rate-limit.
 * Sync APIs use this directly; AI work goes through RabbitMQ.
 */
@Service
public class RedisService {

    private final StringRedisTemplate redis;

    public RedisService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void set(String key, String value, Duration ttl) {
        redis.opsForValue().set(key, value, ttl);
    }

    public Optional<String> get(String key) {
        return Optional.ofNullable(redis.opsForValue().get(key));
    }

    public void delete(String key) {
        redis.delete(key);
    }

    public boolean exists(String key) {
        Boolean result = redis.hasKey(key);
        return Boolean.TRUE.equals(result);
    }

    /** Returns true if key was set (first time) — useful for locks / rate windows. */
    public boolean setIfAbsent(String key, String value, Duration ttl) {
        Boolean ok = redis.opsForValue().setIfAbsent(key, value, ttl);
        return Boolean.TRUE.equals(ok);
    }

    public long increment(String key, Duration windowTtlIfFirst) {
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, windowTtlIfFirst);
        }
        return count == null ? 0L : count;
    }

    /** Scans keys matching pattern and deletes entries whose string value satisfies the predicate. */
    public void deleteMatchingValues(String keyPattern, Predicate<String> valuePredicate) {
        List<String> keysToDelete = new ArrayList<>();
        ScanOptions options = ScanOptions.scanOptions().match(keyPattern).count(200).build();
        redis.execute((RedisCallback<Void>) connection -> {
            try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                while (cursor.hasNext()) {
                    String key = new String(cursor.next(), StandardCharsets.UTF_8);
                    String val = redis.opsForValue().get(key);
                    if (val != null && valuePredicate.test(val)) {
                        keysToDelete.add(key);
                    }
                }
            }
            return null;
        });
        if (!keysToDelete.isEmpty()) {
            redis.delete(keysToDelete);
        }
    }
}

