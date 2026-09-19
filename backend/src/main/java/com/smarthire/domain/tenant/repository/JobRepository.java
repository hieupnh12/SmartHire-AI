package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Job;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByStatusAndDeletedAtIsNullOrderByIdDesc(JobStatus status);
    List<Job> findByDeletedAtIsNullOrderByIdDesc();

    @Query("select j from Job j left join fetch j.createdBy where j.id = :id")
    Optional<Job> findWithOwnerById(@Param("id") Long id);

    @Query("""
            select j from Job j
            where j.deletedAt is null
              and (:status is null or j.status = :status)
              and (:q is null or :q = '' or lower(j.title) like lower(concat('%', :q, '%'))
                   or lower(coalesce(j.location, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(j.department, '')) like lower(concat('%', :q, '%')))
            """)
    Page<Job> search(@Param("status") JobStatus status, @Param("q") String q, Pageable pageable);

    @Query("""
            select j from Job j
            where j.deletedAt is null
              and j.status = :published
              and (j.deadline is null or j.deadline >= :today)
              and (:q is null or :q = '' or lower(j.title) like lower(concat('%', :q, '%'))
                   or lower(coalesce(j.location, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(j.department, '')) like lower(concat('%', :q, '%')))
            order by j.publishedAt desc, j.id desc
            """)
    List<Job> publicOpen(@Param("today") LocalDate today, @Param("q") String q, @Param("published") JobStatus published);
}