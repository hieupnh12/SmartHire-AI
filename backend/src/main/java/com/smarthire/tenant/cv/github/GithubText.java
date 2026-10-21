package com.smarthire.tenant.cv.github;

import java.nio.charset.StandardCharsets;

final class GithubText {
    private GithubText() {}

    static String cap(String text, int maxBytes) {
        if (text == null || text.isEmpty()) return "";
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length <= maxBytes) return text;
        int used = 0;
        int index = 0;
        while (index < text.length()) {
            int point = text.codePointAt(index);
            int width = new String(Character.toChars(point)).getBytes(StandardCharsets.UTF_8).length;
            if (used + width > maxBytes) break;
            used += width;
            index += Character.charCount(point);
        }
        return text.substring(0, index);
    }
}
