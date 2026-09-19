package com.smarthire.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.api.ApiResponse;
import com.smarthire.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwt,
                                                   ObjectMapper mapper) throws Exception {
        http.csrf(csrf -> csrf.disable()).cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401); res.setContentType("application/json");
                            mapper.writeValue(res.getOutputStream(), ApiResponse.error("Authentication required", "UNAUTHORIZED"));
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403); res.setContentType("application/json");
                            mapper.writeValue(res.getOutputStream(), ApiResponse.error("Access denied", "FORBIDDEN"));
                        }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**",
                                "/actuator/health", "/actuator/health/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/master/auth/login", "/api/v1/master/auth/refresh", "/api/v1/master/auth/logout", "/api/v1/tenant/auth/login", "/api/v1/tenant/auth/google").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/master/consultations").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/master/tenants/check/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/tenant/users/invitations/accept").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/jobs", "/api/v1/public/jobs/**").permitAll()
                        .requestMatchers("/api/v1/master/**").hasRole("WORKSPACE_ADMIN")
                        .requestMatchers("/api/v1/tenant/users/**").hasAnyRole("TENANT_ADMIN", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/tenant/company/profile").hasAnyRole("TENANT_ADMIN", "ADMIN", "HR", "RECRUITER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tenant/company/profile").hasAnyRole("TENANT_ADMIN", "ADMIN")
                        .requestMatchers("/api/v1/**").hasAnyRole("TENANT_ADMIN", "ADMIN", "HR", "RECRUITER", "CANDIDATE")
                        .anyRequest().authenticated())
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
