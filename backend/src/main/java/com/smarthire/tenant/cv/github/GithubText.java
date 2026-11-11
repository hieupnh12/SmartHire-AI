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

    /** Removes repetitive boilerplate (long license headers, long import blocks, excessive blank lines) before sending to LLM. */
    static String compactSource(String text, int maxBytes) {
        if (text == null || text.isBlank()) return "";
        String cleaned = stripLeadingLicense(text.replace("\r\n", "\n"));
        String[] lines = cleaned.split("\n", -1);
        StringBuilder out = new StringBuilder();
        int blankRun = 0;
        int importCount = 0;
        StringBuilder importBuffer = new StringBuilder();
        for (String rawLine : lines) {
            String line = rawLine.stripTrailing();
            String stripped = line.strip();
            boolean isImport = stripped.startsWith("import ") && (stripped.endsWith(";") || stripped.contains(" from "));
            if (isImport) {
                importCount++;
                importBuffer.append(line).append('\n');
                continue;
            }
            if (importCount > 0) {
                flushImports(out, importBuffer, importCount);
                importCount = 0;
                importBuffer.setLength(0);
            }
            if (stripped.isEmpty()) {
                blankRun++;
                if (blankRun <= 1) out.append('\n');
            } else {
                blankRun = 0;
                out.append(line).append('\n');
            }
        }
        if (importCount > 0) {
            flushImports(out, importBuffer, importCount);
        }
        return cap(out.toString().trim(), maxBytes);
    }

    /** Removes badge clutter and empty formatting lines from README to minimize prompt tokens. */
    static String compactReadme(String text, int maxBytes) {
        if (text == null || text.isBlank()) return "";
        String[] lines = text.replace("\r\n", "\n").split("\n");
        StringBuilder out = new StringBuilder();
        for (String line : lines) {
            String s = line.strip();
            if (s.isEmpty()) continue;
            if (s.startsWith("[![") || s.startsWith("![")) continue;
            if (out.length() > 0) out.append('\n');
            out.append(line.stripTrailing());
            if (out.length() >= maxBytes + 200) break;
        }
        return cap(out.toString(), maxBytes);
    }

    private static void flushImports(StringBuilder out, StringBuilder buf, int count) {
        if (count > 12) {
            out.append("// ... ").append(count).append(" imports omitted to save tokens\n");
        } else {
            out.append(buf);
        }
    }

    private static String stripLeadingLicense(String text) {
        String s = text.stripLeading();
        if (s.startsWith("/*")) {
            int end = s.indexOf("*/");
            if (end > 0) {
                String header = s.substring(0, end + 2).toLowerCase();
                if (header.contains("license") || header.contains("copyright") || header.contains("spdx-")) {
                    return s.substring(end + 2).stripLeading();
                }
            }
        }
        return text;
    }
}
