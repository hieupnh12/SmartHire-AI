package com.smarthire.tenant.company.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry.EntryType;
import com.smarthire.domain.tenant.entity.CompanyLocationDepartment;
import com.smarthire.domain.tenant.repository.CompanyDirectoryEntryRepository;
import com.smarthire.domain.tenant.repository.CompanyLocationDepartmentRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
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
    private final CompanyLocationDepartmentRepository locationDepartments;
    private final JobRepository jobRepository;

    @Transactional(readOnly = true)
    public CompanyDirectoryResponse get() {
        List<String> departments = new ArrayList<>();
        List<String> locations = new ArrayList<>();
        for (CompanyDirectoryEntry entry : entries.findAllByOrderByEntryTypeAscNameAsc()) {
            (entry.getEntryType() == EntryType.DEPARTMENT ? departments : locations).add(entry.getName());
        }

        Map<String, List<String>> locationDeptMap = new LinkedHashMap<>();
        for (String loc : locations) {
            locationDeptMap.put(loc, new ArrayList<>());
        }
        for (CompanyLocationDepartment cld : locationDepartments.findAllByOrderByLocationNameAscDepartmentNameAsc()) {
            locationDeptMap.computeIfAbsent(cld.getLocationName(), k -> new ArrayList<>()).add(cld.getDepartmentName());
        }

        Map<String, Long> locationJobCounts = fetchJobCounts(jobRepository.countJobsByLocation());
        Map<String, Long> departmentJobCounts = fetchJobCounts(jobRepository.countJobsByDepartment());

        return new CompanyDirectoryResponse(departments, locations, locationDeptMap, locationJobCounts, departmentJobCounts);
    }

    @Transactional
    public CompanyDirectoryResponse replace(UpdateCompanyDirectoryRequest request) {
        List<String> departments = new ArrayList<>(normalize(request.departments(), 128, "department"));
        List<String> locations = normalize(request.locations(), 255, "location");

        Map<String, List<String>> incomingMap = request.locationDepartments();
        List<CompanyLocationDepartment> newLocationDepts = new ArrayList<>();
        Map<String, List<String>> savedLocationDeptMap = new LinkedHashMap<>();

        for (String loc : locations) {
            savedLocationDeptMap.put(loc, new ArrayList<>());
        }

        if (incomingMap != null) {
            for (Map.Entry<String, List<String>> entry : incomingMap.entrySet()) {
                String locName = entry.getKey() == null ? "" : entry.getKey().trim();
                String matchedLoc = locations.stream()
                        .filter(l -> l.equalsIgnoreCase(locName))
                        .findFirst()
                        .orElse(null);
                if (matchedLoc == null) continue;

                List<String> depts = entry.getValue() == null ? List.of() : entry.getValue();
                List<String> normalizedDepts = normalize(depts, 128, "department");
                for (String deptName : normalizedDepts) {
                    if (departments.stream().noneMatch(d -> d.equalsIgnoreCase(deptName))) {
                        departments.add(deptName);
                    }
                    String matchedDept = departments.stream()
                            .filter(d -> d.equalsIgnoreCase(deptName))
                            .findFirst()
                            .orElse(deptName);

                    if (!savedLocationDeptMap.get(matchedLoc).contains(matchedDept)) {
                        savedLocationDeptMap.get(matchedLoc).add(matchedDept);
                        newLocationDepts.add(new CompanyLocationDepartment(matchedLoc, matchedDept));
                    }
                }
            }
            locationDepartments.deleteAllInBatch();
            if (!newLocationDepts.isEmpty()) {
                locationDepartments.saveAll(newLocationDepts);
            }
        } else {
            List<CompanyLocationDepartment> existing = locationDepartments.findAllByOrderByLocationNameAscDepartmentNameAsc();
            List<CompanyLocationDepartment> toKeep = new ArrayList<>();
            for (CompanyLocationDepartment cld : existing) {
                boolean locExists = locations.stream().anyMatch(l -> l.equalsIgnoreCase(cld.getLocationName()));
                boolean deptExists = departments.stream().anyMatch(d -> d.equalsIgnoreCase(cld.getDepartmentName()));
                if (locExists && deptExists) {
                    toKeep.add(cld);
                    savedLocationDeptMap.computeIfAbsent(cld.getLocationName(), k -> new ArrayList<>()).add(cld.getDepartmentName());
                }
            }
            locationDepartments.deleteAllInBatch();
            if (!toKeep.isEmpty()) {
                locationDepartments.saveAll(toKeep);
            }
        }

        entries.deleteAllInBatch();
        List<CompanyDirectoryEntry> replacements = new ArrayList<>();
        departments.forEach(name -> replacements.add(entry(EntryType.DEPARTMENT, name)));
        locations.forEach(name -> replacements.add(entry(EntryType.LOCATION, name)));
        entries.saveAll(replacements);

        Map<String, Long> locationJobCounts = fetchJobCounts(jobRepository.countJobsByLocation());
        Map<String, Long> departmentJobCounts = fetchJobCounts(jobRepository.countJobsByDepartment());

        return new CompanyDirectoryResponse(departments, locations, savedLocationDeptMap, locationJobCounts, departmentJobCounts);
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

    private static Map<String, Long> fetchJobCounts(List<Object[]> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        if (rows == null) return counts;
        for (Object[] row : rows) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                counts.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
            }
        }
        return counts;
    }

    private static List<String> normalize(List<String> values, int maxLength, String label) {
        Map<String, String> unique = new LinkedHashMap<>();
        if (values == null) return List.of();
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
