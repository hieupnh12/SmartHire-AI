package com.smarthire.common.seo;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.job.service.JobService;
import com.smarthire.tenant.job.service.JobService.PublicJobSitemapEntry;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class SeoServiceTest {

    @Mock
    private TenantRegistryService tenantRegistry;

    @Mock
    private JobService jobService;

    private SeoService seoService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        seoService = new SeoService(tenantRegistry, jobService, "smarthire.top");
        mockMvc = MockMvcBuilders.standaloneSetup(new SeoController(seoService)).build();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void masterDomain_ServesMasterRobotsAndSitemap() throws Exception {
        mockMvc.perform(get("/robots.txt").header("Host", "smarthire.top"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/plain"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Sitemap: https://smarthire.top/sitemap.xml")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Disallow: /admin")));

        mockMvc.perform(get("/sitemap.xml").header("Host", "www.smarthire.top"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/xml"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<loc>https://smarthire.top/</loc>")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<loc>https://smarthire.top/pricing</loc>")));
    }

    @Test
    void unknownHostHeader_FallsBackToCanonicalMasterOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Host", "evil.example.com");

        String robots = seoService.buildRobotsTxt(request);
        assertThat(robots).contains("Sitemap: https://smarthire.top/sitemap.xml");
        assertThat(robots).doesNotContain("evil.example.com");
    }

    @Test
    void activeTenantSubdomain_IncludesCareerRoutesAndPublishedJobsWithTenantContextCleanup() throws Exception {
        TenantInfo tenant = new TenantInfo();
        tenant.setCode("acme_code");
        tenant.setSubdomain("acme");
        when(tenantRegistry.requireActiveBySubdomain("acme")).thenReturn(tenant);
        when(jobService.publicSitemapEntries()).thenAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("acme_code");
            return List.of(new PublicJobSitemapEntry(42L, Instant.parse("2026-11-10T10:15:30Z")));
        });

        mockMvc.perform(get("/robots.txt").header("Host", "acme.smarthire.top"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Sitemap: https://acme.smarthire.top/sitemap.xml")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Disallow: /recruiter")));

        mockMvc.perform(get("/sitemap.xml").header("Host", "acme.smarthire.top"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<loc>https://acme.smarthire.top/</loc>")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<loc>https://acme.smarthire.top/jobs</loc>")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<loc>https://acme.smarthire.top/jobs/42</loc>")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("<lastmod>2026-11-10T10:15:30Z</lastmod>")));

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void unknownTenantSubdomain_DisallowsCrawlingAndReturnsNotFoundSitemap() throws Exception {
        when(tenantRegistry.requireActiveBySubdomain("missing"))
                .thenThrow(new BusinessException("Tenant subdomain not found", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));

        mockMvc.perform(get("/robots.txt").header("Host", "missing.smarthire.top"))
                .andExpect(status().isOk())
                .andExpect(content().string("User-agent: *\nDisallow: /\n"));

        mockMvc.perform(get("/sitemap.xml").header("Host", "missing.smarthire.top"))
                .andExpect(status().isNotFound());
    }
}

