package com.smarthire.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI smartHireOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SmartHire-AI API")
                        .description("""
                                RESTful API for SmartHire-AI.

                                Async AI flows (CV analysis, matching, interview questions, scoring, OTP email)
                                are processed via **RabbitMQ**. See operation descriptions for queue/exchange names.
                                """)
                        .version("v1")
                        .contact(new Contact().name("SmartHire Team"))
                        .license(new License().name("Proprietary")));
    }
}

