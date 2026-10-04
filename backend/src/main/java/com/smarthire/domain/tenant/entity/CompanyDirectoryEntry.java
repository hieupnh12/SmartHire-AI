package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "company_directory_entries")
public class CompanyDirectoryEntry extends BaseEntity {

    public enum EntryType {
        DEPARTMENT,
        LOCATION
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 32)
    EntryType entryType;

    @Column(nullable = false, length = 255)
    String name;
}
