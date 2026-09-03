package com.smarthire.config;

import com.smarthire.multitenancy.interceptor.TenantWebInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final TenantWebInterceptor tenantWebInterceptor;

    public WebMvcConfig(TenantWebInterceptor tenantWebInterceptor) {
        this.tenantWebInterceptor = tenantWebInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantWebInterceptor)
                .addPathPatterns("/api/v1/tenant/**");
    }
}
