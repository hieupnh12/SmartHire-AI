package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry;
import com.smarthire.domain.tenant.entity.CompanyDirectoryEntry.EntryType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyDirectoryEntryRepository extends JpaRepository<CompanyDirectoryEntry, Long> {
    List<CompanyDirectoryEntry> findAllByOrderByEntryTypeAscNameAsc();
    boolean existsByEntryTypeAndNameIgnoreCase(EntryType entryType, String name);
}
