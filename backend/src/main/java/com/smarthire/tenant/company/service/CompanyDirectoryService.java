package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry.EntryType;
import com.smarthire.domain.tenant.repository.CompanyDirectoryEntryRepository;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.CompanyDirectoryResponse;
import com.smarthire.tenant.company.dto.CompanyDirectoryModels.UpdateCompanyDirectoryRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyDirectoryService {
    private final CompanyDirectoryEntryRepository entries;

    @Transactional(readOnly = true)
    public CompanyDirectoryResponse get() {
        List<String> departments = new ArrayList<>();
        List<String> locations = new ArrayList<>();
        for (CompanyDirectoryEntry entry : entries.findAllByOrderByEntryTypeAscNameAsc()) {
            (entry.getEntryType() == EntryType.DEPARTMENT ? departments : locations).add(entry.getName());
        }
        return new CompanyDirectoryResponse(departments, locations);
    }

    @Transactional
    public CompanyDirectoryResponse replace(UpdateCompanyDirectoryRequest request) {
        List<String> departments = normalize(request.departments(), 128, "department");
        List<String> locations = normalize(request.locations(), 255, "location");
        entries.deleteAllInBatch();
        List<CompanyDirectoryEntry> replacements = new ArrayList<>();
        departments.forEach(name -> replacements.add(entry(EntryType.DEPARTMENT, name)));
        locations.forEach(name -> replacements.add(entry(EntryType.LOCATION, name)));
        entries.saveAll(replacements);
        return new CompanyDirectoryResponse(departments, locations);
    }

    public void requireEntry(EntryType type, String raw) {
        if (raw == null || raw.isBlank()) return;
        String value = raw.trim();
        if (!entries.existsByEntryTypeAndNameIgnoreCase(type, value)) {
            throw new BusinessException(
                    type == EntryType.DEPARTMENT ? "Department is not in the company directory" : "Location is not in the company directory",
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    type == EntryType.DEPARTMENT ? "DEPARTMENT_NOT_IN_DIRECTORY" : "LOCATION_NOT_IN_DIRECTORY");
        }
    }

    private static List<String> normalize(List<String> values, int maxLength, String label) {
        Map<String, String> unique = new LinkedHashMap<>();
        for (String raw : values) {
            String value = raw == null ? "" : raw.trim();
            if (value.isEmpty()) continue;
            if (value.length() > maxLength) {
                throw new BusinessException(label + " exceeds " + maxLength + " characters", HttpStatus.BAD_REQUEST, "DIRECTORY_VALUE_TOO_LONG");
            }
            unique.putIfAbsent(value.toLowerCase(Locale.ROOT), value);
        }
        return List.copyOf(unique.values());
    }

    private static CompanyDirectoryEntry entry(EntryType type, String name) {
        CompanyDirectoryEntry entry = new CompanyDirectoryEntry();
        entry.setEntryType(type);
        entry.setName(name);
        return entry;
    }
}
