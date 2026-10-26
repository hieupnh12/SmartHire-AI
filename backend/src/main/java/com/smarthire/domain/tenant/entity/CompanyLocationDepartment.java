package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "company_location_departments")
public class CompanyLocationDepartment extends BaseEntity {

    @Column(name = "location_name", nullable = false, length = 255)
    String locationName;

    @Column(name = "department_name", nullable = false, length = 128)
    String departmentName;

    public CompanyLocationDepartment(String locationName, String departmentName) {
        this.locationName = locationName;
        this.departmentName = departmentName;
    }
}
