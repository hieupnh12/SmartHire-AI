package com.smarthire.tenant.notification.email;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
public class TenantEmailRenderer {

    private final ObjectProvider<TemplateEngine> templateEngineProvider;

    public TenantEmailRenderer(ObjectProvider<TemplateEngine> templateEngineProvider) {
        this.templateEngineProvider = templateEngineProvider;
    }

    public record RenderResult(String html, String textFallback) {}

    public String renderHtml(String templateName, TenantEmailModel model) {
        TemplateEngine engine = templateEngineProvider != null ? templateEngineProvider.getIfAvailable() : null;
        if (engine == null) {
            log.warn("Thymeleaf TemplateEngine not available, cannot render email template: {}", templateName);
            return null;
        }

        try {
            Context context = new Context();
            Map<String, Object> vars = new HashMap<>();
            vars.put("model", model);
            vars.put("brand", StringUtils.hasText(model.brand()) ? model.brand() : "SmartHire-AI");
            vars.put("badgeText", model.badgeText());
            vars.put("badgeColor", StringUtils.hasText(model.badgeColor()) ? model.badgeColor() : "blue");
            vars.put("title", model.title());
            vars.put("headline", model.headline());
            vars.put("recipientName", model.recipientName());
            vars.put("paragraphs", model.paragraphs());
            vars.put("details", model.details());
            vars.put("highlightBoxTitle", model.highlightBoxTitle());
            vars.put("highlightBoxValue", model.highlightBoxValue());
            vars.put("highlightBoxNote", model.highlightBoxNote());
            vars.put("ctaLabel", model.ctaLabel());
            vars.put("ctaUrl", model.ctaUrl());
            vars.put("securityNote", model.securityNote());
            vars.put("rawLinkPrompt", model.rawLinkPrompt());
            vars.put("supportEmail", StringUtils.hasText(model.supportEmail()) ? model.supportEmail() : "support@smarthire.top");
            vars.put("supportHotline", StringUtils.hasText(model.supportHotline()) ? model.supportHotline() : "0988.888.888");

            context.setVariables(vars);
            return engine.process("emails/tenant/" + templateName, context);
        } catch (Exception ex) {
            log.error("Failed to render Thymeleaf template emails/tenant/{}: {}", templateName, ex.getMessage(), ex);
            return null;
        }
    }

    public String buildTextFallback(TenantEmailModel model) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(model.brand())) {
            sb.append("[").append(model.brand()).append("]\n\n");
        }
        if (StringUtils.hasText(model.recipientName())) {
            sb.append("Xin chào ").append(model.recipientName()).append(",\n\n");
        } else {
            sb.append("Xin chào,\n\n");
        }
        if (StringUtils.hasText(model.headline())) {
            sb.append(model.headline()).append("\n\n");
        }
        if (model.paragraphs() != null) {
            for (String p : model.paragraphs()) {
                if (StringUtils.hasText(p)) {
                    sb.append(p).append("\n\n");
                }
            }
        }
        if (StringUtils.hasText(model.highlightBoxValue())) {
            if (StringUtils.hasText(model.highlightBoxTitle())) {
                sb.append(model.highlightBoxTitle()).append(": ");
            }
            sb.append(model.highlightBoxValue()).append("\n\n");
        }
        if (model.details() != null && !model.details().isEmpty()) {
            for (TenantEmailModel.DetailRow row : model.details()) {
                sb.append("- ").append(row.label()).append(": ").append(row.value()).append("\n");
            }
            sb.append("\n");
        }
        if (StringUtils.hasText(model.ctaUrl())) {
            String label = StringUtils.hasText(model.ctaLabel()) ? model.ctaLabel() : "Truy cập liên kết";
            sb.append(label).append(": ").append(model.ctaUrl()).append("\n\n");
        }
        if (StringUtils.hasText(model.securityNote())) {
            sb.append("Lưu ý: ").append(model.securityNote()).append("\n\n");
        }
        sb.append("Trân trọng,\nĐội ngũ ").append(StringUtils.hasText(model.brand()) ? model.brand() : "SmartHire-AI");
        return sb.toString();
    }

    public String renderOrFallback(String templateName, TenantEmailModel model) {
        String html = renderHtml(templateName, model);
        return StringUtils.hasText(html) ? html : buildTextFallback(model);
    }
}

