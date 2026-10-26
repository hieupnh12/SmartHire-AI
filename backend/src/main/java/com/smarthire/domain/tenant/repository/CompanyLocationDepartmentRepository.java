package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CompanyLocationDepartment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyLocationDepartmentRepository extends JpaRepository<CompanyLocationDepartment, Long> {
    List<CompanyLocationDepartment> findAllByOrderByLocationNameAscDepartmentNameAsc();
    List<CompanyLocationDepartment> findByLocationNameIgnoreCase(String locationName);
    boolean existsByLocationNameIgnoreCaseAndDepartmentNameIgnoreCase(String locationName, String departmentName);
}
