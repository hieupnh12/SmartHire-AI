package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class RankingDataRepository {
    @PersistenceContext private EntityManager em;
    public List<Job> jobs(String email) {
        return em.createQuery("select j from Job j where lower(j.createdBy.email) = lower(:email) and j.deletedAt is null order by j.id desc", Job.class)
                .setParameter("email", email).getResultList();
    }
    public Job job(long id, boolean lock) { return em.find(Job.class, id, lock ? LockModeType.PESSIMISTIC_WRITE : LockModeType.NONE); }
    public Application application(long id) { return em.find(Application.class, id); }
    public RankingConfig config(long jobId) { return em.find(RankingConfig.class, jobId); }
    public RankingSource source(long appId) { return em.find(RankingSource.class, appId); }
    public List<Application> applications(long jobId) {
        return em.createQuery("select a from Application a join fetch a.candidate where a.job.id = :id order by a.id", Application.class).setParameter("id", jobId).getResultList();
    }
    public List<ApplicationStatusHistory> history(long appId) {
        return em.createQuery("select h from ApplicationStatusHistory h where h.application.id = :id order by h.createdAt", ApplicationStatusHistory.class)
                .setParameter("id", appId).getResultList();
    }
    public List<JobSkill> requirements(long jobId) {
        return em.createQuery("select s from JobSkill s join fetch s.skill where s.job.id = :id order by s.id", JobSkill.class).setParameter("id", jobId).getResultList();
    }
    public List<Cv> cvs(long appId) {
        return em.createQuery("select c from Cv c where c.application.id = :id and c.job = c.application.job and c.user = c.application.candidate order by c.id", Cv.class).setParameter("id", appId).getResultList();
    }
    public List<CvSkill> skills(long cvId) {
        return em.createQuery("select s from CvSkill s left join fetch s.skill where s.cv.id = :id", CvSkill.class).setParameter("id", cvId).getResultList();
    }
    public String extraction(long cvId) {
        return em.createQuery("select e.extractionJson from CvExtraction e where e.cv.id = :id", String.class)
                .setParameter("id", cvId).getResultStream().findFirst().orElse(null);
    }
    public List<Submission> submissions(long appId) {
        return em.createQuery("select s from Submission s where s.application.id = :id and s.test.job = s.application.job order by s.id", Submission.class)
                .setParameter("id", appId).getResultList();
    }
    public List<AiInterview> aiInterviews(long appId) {
        return em.createQuery("select i from AiInterview i where i.application.id = :id order by i.id", AiInterview.class)
                .setParameter("id", appId).getResultList();
    }
    public void detachCv(long cvId) {
        em.createQuery("update RankingSource s set s.cvId = null where s.cvId = :id")
                .setParameter("id", cvId)
                .executeUpdate();
    }

    public void save(Object entity) { em.merge(entity); }
    public void replaceSnapshots(long jobId) {
        em.createQuery("delete from CandidateRanking r where r.job.id = :id").setParameter("id", jobId).executeUpdate();
        em.createQuery("delete from OverallScore s where s.application.job.id = :id").setParameter("id", jobId).executeUpdate();
    }
}
