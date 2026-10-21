package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.GithubRepoCache;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GithubRepoCacheRepository extends JpaRepository<GithubRepoCache, Long> {
    Optional<GithubRepoCache> findByRepoFullNameAndCommitShaAndSkillFingerprintAndStrategyVersion(
            String repoFullName, String commitSha, String skillFingerprint, String strategyVersion);

    Optional<GithubRepoCache> findFirstByRepoFullNameAndSkillFingerprintAndStrategyVersionAndCommitShaNotOrderByIdDesc(
            String repoFullName, String skillFingerprint, String strategyVersion, String commitSha);
}
