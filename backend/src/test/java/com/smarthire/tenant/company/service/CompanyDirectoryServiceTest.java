package com.smarthire.tenant.company.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry.EntryType;
import com.smarthire.domain.tenant.entity.CompanyLocationDepartment;
import com.smarthire.domain.tenant.repository.CompanyDirectoryEntryRepository;
import com.smarthire.domain.tenant.repository.CompanyLocationDepartmentRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.UpdateCompanyDirectoryRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CompanyDirectoryServiceTest {

    @Mock
    private CompanyDirectoryEntryRepository entries;

    @Mock
    private CompanyLocationDepartmentRepository locationDepartments;

    @Mock
    private JobRepository jobRepository;

    private CompanyDirectoryService service;

    @BeforeEach
    void setUp() {
        service = new CompanyDirectoryService(entries, locationDepartments, jobRepository);
    }

    @Test
    void replaceTrimsAndDeduplicatesValues() {
        var result = service.replace(new UpdateCompanyDirectoryRequest(
                List.of(" Engineering ", "engineering", "HR"),
                List.of(" Hanoi ", "hanoi")));

        assertThat(result.departments()).containsExactly("Engineering", "HR");
        assertThat(result.locations()).containsExactly("Hanoi");
        verify(entries).deleteAllInBatch();
        verify(entries).saveAll(anyList());
    }

    @Test
    void replaceSavesLocationDepartmentsAssociation() {
        var request = new UpdateCompanyDirectoryRequest(
                List.of("Engineering", "HR"),
                List.of("Hà Nội", "Đà Nẵng"),
                Map.of("Hà Nội", List.of("Engineering", "HR"), "Đà Nẵng", List.of("Engineering"))
        );

        var result = service.replace(request);

        assertThat(result.departments()).containsExactly("Engineering", "HR");
        assertThat(result.locations()).containsExactly("Hà Nội", "Đà Nẵng");
        assertThat(result.locationDepartments()).containsKey("Hà Nội");
        assertThat(result.locationDepartments().get("Hà Nội")).containsExactly("Engineering", "HR");
        assertThat(result.locationDepartments().get("Đà Nẵng")).containsExactly("Engineering");
        verify(locationDepartments).deleteAllInBatch();
        verify(locationDepartments).saveAll(anyList());
    }

    @Test
    void requireEntryRejectsUnknownJobValue() {
        when(entries.existsByEntryTypeAndNameIgnoreCase(EntryType.DEPARTMENT, "Unknown")).thenReturn(false);

        assertThatThrownBy(() -> service.requireEntry(EntryType.DEPARTMENT, "Unknown"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("company directory");
    }
}
