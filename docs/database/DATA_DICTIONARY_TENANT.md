# Data Dictionary â€” Tenant DB (MySQL)

> Trá»Ÿ vá» [Database Design & ERD](README.md) Â· Xem thÃªm [Data Dictionary Master](DATA_DICTIONARY_MASTER.md)

**Database:** má»™t MySQL riÃªng cho má»—i doanh nghiá»‡p Â· **Sá»‘ báº£ng:** 46
**Nguá»“n:** `backend/src/main/resources/db/migration/tenant/V1â€¦V9`
**Entity:** `com.smarthire.domain.tenant.entity` Â· **Hibernate:** `hbm2ddl.auto = none`

KÃ½ hiá»‡u: `PK` khoÃ¡ chÃ­nh Â· `FK` khoÃ¡ ngoáº¡i Ä‘Ã£ khai bÃ¡o Â· `UQ` thuá»™c rÃ ng buá»™c unique Â· `IDX` cÃ³ index Â·
`ref*` trÃ´ng nhÆ° khoÃ¡ ngoáº¡i nhÆ°ng **khÃ´ng** cÃ³ rÃ ng buá»™c trong database.

**Quy Æ°á»›c Ã¡p dá»¥ng cho má»i báº£ng trong file nÃ y**

- `id` luÃ´n lÃ  `BIGINT AUTO_INCREMENT PRIMARY KEY`, trá»« `ranking_configs` vÃ  `ranking_sources` dÃ¹ng khoÃ¡ tá»± nhiÃªn, vÃ  `interview_participants` dÃ¹ng PK kÃ©p.
- `created_at` lÃ  `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- `updated_at` lÃ  `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` (chá»‰ cÃ³ á»Ÿ má»™t sá»‘ báº£ng).
- Cá»™t tráº¡ng thÃ¡i lÆ°u `VARCHAR(32)`, Ã¡nh xáº¡ báº±ng `@Enumerated(EnumType.STRING)`, **khÃ´ng** cÃ³ `CHECK` constraint.
- Entity dÃ¹ng `Instant` cho cá»™t thá»i gian vÃ  `@ManyToOne(fetch = LAZY)` cho khoÃ¡ ngoáº¡i.
- **KhÃ´ng báº£ng nÃ o cÃ³ cá»™t `tenant_id`** â€” cÃ¡ch ly dá»¯ liá»‡u do viá»‡c chá»n datasource Ä‘áº£m nhiá»‡m.

**Má»¥c lá»¥c**

- [A. Identity & Access](#a-identity--access) â€” 4 báº£ng
- [B. Job & Skill](#b-job--skill) â€” 4 báº£ng
- [C. Application pipeline](#c-application-pipeline) â€” 3 báº£ng
- [D. CV & AI screening](#d-cv--ai-screening) â€” 6 báº£ng
- [E. Ranking](#e-ranking) â€” 5 báº£ng
- [F. Test & Proctoring](#f-test--proctoring) â€” 10 báº£ng
- [G. Direct Interview](#g-direct-interview) â€” 5 báº£ng
- [H. AI Interview](#h-ai-interview) â€” 4 báº£ng
- [I. Notification](#i-notification) â€” 2 báº£ng
- [J. Practice](#j-practice) â€” 3 báº£ng

---

## A. Identity & Access

### A.1 `users` â€” NgÆ°á»i dÃ¹ng cá»§a doanh nghiá»‡p

Entity `User` (káº¿ thá»«a `BaseEntity`). Má»i vai trÃ² dÃ¹ng chung má»™t báº£ng, phÃ¢n biá»‡t báº±ng `role`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `email` | VARCHAR(255) | UQ | KhÃ´ng | â€” | Email Ä‘Äƒng nháº­p, unique trong pháº¡m vi tenant |
| `password_hash` | VARCHAR(255) | | CÃ³ | NULL | NULL vá»›i tÃ i khoáº£n chá»‰ Ä‘Äƒng nháº­p báº±ng OAuth |
| `full_name` | VARCHAR(255) | | KhÃ´ng | â€” | Há» tÃªn |
| `role` | VARCHAR(32) | | KhÃ´ng | â€” | `UserRole`: TENANT_ADMIN, ADMIN, HR, RECRUITER, CANDIDATE |
| `status` | VARCHAR(32) | | KhÃ´ng | `'ACTIVE'` | `UserStatus`: ACTIVE, LOCKED, DISABLED |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `uk_users_email`

### A.2 `oauth_accounts` â€” LiÃªn káº¿t Ä‘Äƒng nháº­p ngoÃ i

Entity `OauthAccount`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `user_id` | BIGINT | FK â†’ `users.id` | KhÃ´ng | â€” | TÃ i khoáº£n Ä‘Æ°á»£c liÃªn káº¿t |
| `provider` | VARCHAR(32) | UQ | KhÃ´ng | â€” | `OAuthProvider`: hiá»‡n chá»‰ `GOOGLE` |
| `provider_user_id` | VARCHAR(255) | UQ | KhÃ´ng | â€” | Äá»‹nh danh ngÆ°á»i dÃ¹ng phÃ­a provider |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

**RÃ ng buá»™c:** `fk_oauth_user`, `uk_oauth_provider_user (provider, provider_user_id)`

### A.3 `user_profiles` â€” Há»“ sÆ¡ má»Ÿ rá»™ng

Entity `UserProfile` (káº¿ thá»«a `BaseEntity`).

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `user_id` | BIGINT | FK â†’ `users.id`, UQ | KhÃ´ng | â€” | 1:1 vá»›i tÃ i khoáº£n |
| `phone` | VARCHAR(32) | | CÃ³ | NULL | Äiá»‡n thoáº¡i |
| `avatar_url` | VARCHAR(512) | | CÃ³ | NULL | áº¢nh Ä‘áº¡i diá»‡n |
| `bio` | TEXT | | CÃ³ | NULL | Giá»›i thiá»‡u báº£n thÃ¢n |
| `headline` | VARCHAR(255) | | CÃ³ | NULL | DÃ²ng tiÃªu Ä‘á» nghá» nghiá»‡p |
| `links_json` | JSON | | CÃ³ | NULL | LiÃªn káº¿t máº¡ng xÃ£ há»™i, portfolio |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_profile_user`, `uk_profile_user (user_id)`

### A.4 `member_invitations` â€” Lá»i má»i nhÃ¢n sá»±

Entity `MemberInvitation` (káº¿ thá»«a `BaseEntity`). KhÃ´ng cÃ³ khoÃ¡ ngoáº¡i tá»›i `users`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `email` | VARCHAR(255) | | KhÃ´ng | â€” | Email ngÆ°á»i Ä‘Æ°á»£c má»i |
| `full_name` | VARCHAR(255) | | KhÃ´ng | â€” | Há» tÃªn ngÆ°á»i Ä‘Æ°á»£c má»i |
| `role` | VARCHAR(32) | | KhÃ´ng | â€” | Vai trÃ² sáº½ Ä‘Æ°á»£c cáº¥p khi cháº¥p nháº­n |
| `token_hash` | VARCHAR(64) | UQ | KhÃ´ng | â€” | **Hash** cá»§a token má»i; token gá»‘c khÃ´ng bao giá» Ä‘Æ°á»£c lÆ°u hay log |
| `status` | VARCHAR(32) | | KhÃ´ng | `'PENDING'` | `InvitationStatus`: PENDING, ACCEPTED |
| `expires_at` | TIMESTAMP | | KhÃ´ng | â€” | Háº¡n dÃ¹ng cá»§a lá»i má»i |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `uk_member_invitations_token_hash`

---

## B. Job & Skill

### B.1 `jobs` â€” Tin tuyá»ƒn dá»¥ng

Entity `Job` (káº¿ thá»«a `BaseEntity`). Báº£ng Ä‘Æ°á»£c má»Ÿ rá»™ng qua V2 vÃ  V6.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `title` | VARCHAR(255) | | KhÃ´ng | â€” | TiÃªu Ä‘á» tin |
| `description` | TEXT | | KhÃ´ng | â€” | MÃ´ táº£ cÃ´ng viá»‡c |
| `location` | VARCHAR(255) | | CÃ³ | NULL | Äá»‹a Ä‘iá»ƒm lÃ m viá»‡c |
| `employment_type` | VARCHAR(32) | | CÃ³ | NULL | ToÃ n thá»i gian, bÃ¡n thá»i gian, há»£p Ä‘á»“ngâ€¦ |
| `status` | VARCHAR(32) | | KhÃ´ng | `'DRAFT'` | `JobStatus`: DRAFT, PUBLISHED, PAUSED, CLOSED, ARCHIVED |
| `created_by` | BIGINT | FK â†’ `users.id` | KhÃ´ng | â€” | Recruiter táº¡o tin |
| `published_at` | TIMESTAMP | | CÃ³ | NULL | Thá»i Ä‘iá»ƒm Ä‘Äƒng cÃ´ng khai (V2) |
| `paused_at` | TIMESTAMP | | CÃ³ | NULL | Thá»i Ä‘iá»ƒm táº¡m dá»«ng (V6) |
| `closed_at` | TIMESTAMP | | CÃ³ | NULL | Thá»i Ä‘iá»ƒm Ä‘Ã³ng tin |
| `deleted_at` | TIMESTAMP | | CÃ³ | NULL | XoÃ¡ má»m (V2); khÃ¡c vá»›i `status` |
| `department` | VARCHAR(128) | | CÃ³ | NULL | PhÃ²ng ban (V6) |
| `work_mode` | VARCHAR(32) | | CÃ³ | NULL | Onsite, hybrid, remote (V6) |
| `headcount` | INT | | CÃ³ | NULL | Sá»‘ lÆ°á»£ng cáº§n tuyá»ƒn (V6) |
| `deadline` | DATETIME | | Có | NULL | Hết hạn đăng tin (V6 DATE → V15 DATETIME). Hết giờ này job đóng và tự sàng CV |
| `salary_min` | DECIMAL(12,2) | | CÃ³ | NULL | LÆ°Æ¡ng tá»‘i thiá»ƒu (V6) |
| `salary_max` | DECIMAL(12,2) | | CÃ³ | NULL | LÆ°Æ¡ng tá»‘i Ä‘a (V6) |
| `salary_currency` | VARCHAR(8) | | CÃ³ | NULL | ÄÆ¡n vá»‹ tiá»n tá»‡ (V6) |
| `salary_visible` | BOOLEAN | | KhÃ´ng | TRUE | CÃ³ hiá»ƒn thá»‹ lÆ°Æ¡ng ra trang cÃ´ng khai khÃ´ng (V6) |
| `responsibilities` | TEXT | | CÃ³ | NULL | TrÃ¡ch nhiá»‡m cÃ´ng viá»‡c (V6) |
| `benefits` | TEXT | | CÃ³ | NULL | PhÃºc lá»£i (V6) |
| `min_years_experience` | DECIMAL(4,1) | | CÃ³ | NULL | Sá»‘ nÄƒm kinh nghiá»‡m tá»‘i thiá»ƒu (V6) |
| `education_level` | VARCHAR(64) | | CÃ³ | NULL | TrÃ¬nh Ä‘á»™ há»c váº¥n tá»‘i thiá»ƒu (V6) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_jobs_user`

### B.2 `skills` â€” Tá»« Ä‘iá»ƒn ká»¹ nÄƒng

Entity `Skill`. Báº£ng khÃ´ng cÃ³ cá»™t thá»i gian.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `name` | VARCHAR(128) | UQ | KhÃ´ng | â€” | TÃªn ká»¹ nÄƒng chuáº©n |
| `category` | VARCHAR(64) | | CÃ³ | NULL | NhÃ³m ká»¹ nÄƒng |
| `aliases_json` | JSON | | CÃ³ | NULL | CÃ¡c biáº¿n thá»ƒ tÃªn gom vá» ká»¹ nÄƒng nÃ y (V5) |

**RÃ ng buá»™c:** `uk_skills_name`

### B.3 `job_skills` â€” Ká»¹ nÄƒng yÃªu cáº§u cá»§a tin tuyá»ƒn dá»¥ng

Entity `JobSkill`. Báº£ng ná»‘i N-N cÃ³ thuá»™c tÃ­nh.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id`, UQ | KhÃ´ng | â€” | Tin tuyá»ƒn dá»¥ng |
| `skill_id` | BIGINT | FK â†’ `skills.id`, UQ | KhÃ´ng | â€” | Ká»¹ nÄƒng |
| `required` | BOOLEAN | | KhÃ´ng | TRUE | Báº¯t buá»™c hay chá»‰ lÃ  Ä‘iá»ƒm cá»™ng |
| `weight` | DECIMAL(5,2) | | KhÃ´ng | 1.00 | Trá»ng sá»‘ khi cháº¥m Ä‘iá»ƒm khá»›p |
| `min_level` | VARCHAR(32) | | CÃ³ | NULL | Cáº¥p Ä‘á»™ tá»‘i thiá»ƒu |

**RÃ ng buá»™c:** `fk_js_job`, `fk_js_skill`, `uk_job_skill (job_id, skill_id)`

### B.4 `recruitment_stages` â€” VÃ²ng tuyá»ƒn cá»§a tin tuyá»ƒn dá»¥ng

Entity `RecruitmentStage`. Báº£ng khÃ´ng cÃ³ cá»™t thá»i gian.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id` | KhÃ´ng | â€” | Tin tuyá»ƒn dá»¥ng sá»Ÿ há»¯u vÃ²ng nÃ y |
| `name` | VARCHAR(128) | | KhÃ´ng | â€” | TÃªn vÃ²ng |
| `sort_order` | INT | | KhÃ´ng | â€” | Thá»© tá»± trong pipeline |
| `is_terminal` | BOOLEAN | | KhÃ´ng | FALSE | ÄÃ¡nh dáº¥u vÃ²ng káº¿t thÃºc |

**RÃ ng buá»™c:** `fk_rs_job`

---

## C. Application pipeline

### C.1 `applications` â€” ÄÆ¡n á»©ng tuyá»ƒn (báº£ng trung tÃ¢m)

Entity `Application` (káº¿ thá»«a `BaseEntity`). Má»Ÿ rá»™ng qua V7.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id`, UQ, IDX | KhÃ´ng | â€” | Tin á»©ng tuyá»ƒn |
| `candidate_id` | BIGINT | FK â†’ `users.id`, UQ | KhÃ´ng | â€” | á»¨ng viÃªn |
| `stage_id` | BIGINT | FK â†’ `recruitment_stages.id` | CÃ³ | NULL | VÃ²ng tuyá»ƒn hiá»‡n táº¡i |
| `status` | VARCHAR(32) | IDX | KhÃ´ng | `'NEW'` | `ApplicationStatus` â€” 8 giÃ¡ trá»‹ |
| `source` | VARCHAR(64) | | CÃ³ | NULL | Nguá»“n á»©ng tuyá»ƒn |
| `notes` | TEXT | | CÃ³ | NULL | Ghi chÃº ná»™i bá»™ cá»§a recruiter |
| `referral_code` | VARCHAR(64) | | CÃ³ | NULL | MÃ£ giá»›i thiá»‡u (V7) |
| `tags` | VARCHAR(512) | | CÃ³ | NULL | NhÃ£n phÃ¢n loáº¡i, lÆ°u dáº¡ng chuá»—i (V7) |
| `assignee_id` | BIGINT | FK â†’ `users.id` | CÃ³ | NULL | NgÆ°á»i phá»¥ trÃ¡ch Ä‘Æ¡n (V7) |
| `archived_at` | TIMESTAMP | IDX | CÃ³ | NULL | LÆ°u trá»¯ Ä‘Æ¡n, tÃ¡ch khá»i danh sÃ¡ch hoáº¡t Ä‘á»™ng (V7) |
| `reject_reason` | TEXT | | CÃ³ | NULL | LÃ½ do tá»« chá»‘i (V7) |
| `withdrawn_at` | TIMESTAMP | | CÃ³ | NULL | Thá»i Ä‘iá»ƒm á»©ng viÃªn rÃºt Ä‘Æ¡n (V7) |
| `ai_interview_invited_at` | TIMESTAMP | | Có | NULL | Thời điểm đã gửi mail mời phỏng vấn AI sau khi CV đạt (V14) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_app_job`, `fk_app_candidate`, `fk_app_stage`, `fk_app_assignee`,
`uk_app_job_candidate (job_id, candidate_id)`
**Index:** `idx_app_job_status (job_id, status)`, `idx_app_archived (job_id, archived_at)`

### C.2 `application_status_history` â€” Nháº­t kÃ½ Ä‘á»•i tráº¡ng thÃ¡i

Entity `ApplicationStatusHistory`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `application_id` | BIGINT | FK â†’ `applications.id` | KhÃ´ng | â€” | ÄÆ¡n liÃªn quan |
| `from_status` | VARCHAR(32) | | CÃ³ | NULL | Tráº¡ng thÃ¡i trÆ°á»›c; NULL á»Ÿ láº§n ghi Ä‘áº§u tiÃªn |
| `to_status` | VARCHAR(32) | | KhÃ´ng | â€” | Tráº¡ng thÃ¡i sau |
| `changed_by` | BIGINT | ref* | CÃ³ | NULL | NgÆ°á»i thá»±c hiá»‡n â€” **khÃ´ng cÃ³ khoÃ¡ ngoáº¡i** |
| `note` | TEXT | | CÃ³ | NULL | Ghi chÃº kÃ¨m theo |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

**RÃ ng buá»™c:** `fk_ash_app`

### C.3 `hiring_decisions` â€” Quyáº¿t Ä‘á»‹nh tuyá»ƒn dá»¥ng

Entity `HiringDecision`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `application_id` | BIGINT | FK â†’ `applications.id` | KhÃ´ng | â€” | ÄÆ¡n Ä‘Æ°á»£c quyáº¿t Ä‘á»‹nh |
| `decision` | VARCHAR(32) | | KhÃ´ng | â€” | `HiringDecisionType`: HIRE, REJECT, HOLD |
| `reason` | TEXT | | CÃ³ | NULL | LÃ½ do |
| `decided_by` | BIGINT | ref* | KhÃ´ng | â€” | NgÆ°á»i quyáº¿t Ä‘á»‹nh â€” **khÃ´ng cÃ³ khoÃ¡ ngoáº¡i** |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

**RÃ ng buá»™c:** `fk_hd_app`

---

## D. CV & AI screening

### D.1 `cvs` â€” Há»“ sÆ¡ CV

Entity `Cv` (káº¿ thá»«a `BaseEntity`). Má»Ÿ rá»™ng qua V2, V5, V7, V8.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id` | **CÃ³** (tá»« V8) | NULL | Tin tuyá»ƒn dá»¥ng; Ä‘á»ƒ trá»‘ng khi CV thuá»™c kho há»“ sÆ¡ |
| `user_id` | BIGINT | FK â†’ `users.id` | KhÃ´ng | â€” | Chá»§ sá»Ÿ há»¯u CV |
| `application_id` | BIGINT | ref* | CÃ³ | NULL | ÄÆ¡n á»©ng tuyá»ƒn â€” **khÃ´ng cÃ³ khoÃ¡ ngoáº¡i** (V2) |
| `original_filename` | VARCHAR(255) | | KhÃ´ng | â€” | TÃªn file gá»‘c do ngÆ°á»i dÃ¹ng táº£i lÃªn |
| `file_url` | VARCHAR(512) | | KhÃ´ng | â€” | URL truy cáº­p file |
| `storage_key` | VARCHAR(512) | | CÃ³ | NULL | KhoÃ¡ lÆ°u trá»¯ ná»™i bá»™ (V5) |
| `mime_type` | VARCHAR(128) | | CÃ³ | NULL | Kiá»ƒu MIME Ä‘Ã£ xÃ¡c thá»±c (V5) |
| `file_size` | BIGINT | | CÃ³ | NULL | Dung lÆ°á»£ng byte (V5) |
| `checksum_sha256` | CHAR(64) | | CÃ³ | NULL | Checksum Ä‘á»ƒ phÃ¡t hiá»‡n file trÃ¹ng (V5) |
| `retain_until` | TIMESTAMP | | CÃ³ | NULL | Má»‘c háº¿t háº¡n lÆ°u trá»¯; V7 backfill 24 thÃ¡ng tá»« `created_at` |
| `status` | VARCHAR(32) | | KhÃ´ng | `'UPLOADED'` | `CvStatus` â€” 7 giÃ¡ trá»‹ theo cháº·ng pipeline |
| `error_code` | VARCHAR(64) | | CÃ³ | NULL | MÃ£ lá»—i khi pipeline há»ng (V5) |
| `error_message` | VARCHAR(512) | | CÃ³ | NULL | ThÃ´ng Ä‘iá»‡p lá»—i, bá»‹ cáº¯t cÃ²n tá»‘i Ä‘a 512 kÃ½ tá»± (V5) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_cvs_job`, `fk_cvs_user`

### D.2 `cv_documents` â€” VÄƒn báº£n thÃ´ (cháº·ng 1)

Entity `CvDocument`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `cv_id` | BIGINT | FK â†’ `cvs.id`, UQ | KhÃ´ng | â€” | CV nguá»“n |
| `raw_text` | LONGTEXT | | CÃ³ | NULL | ToÃ n bá»™ vÄƒn báº£n bÃ³c tá»« file |
| `page_count` | INT | | CÃ³ | NULL | Sá»‘ trang |
| `parser_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n bá»™ parser (V5) |
| `ocr_used` | BOOLEAN | | KhÃ´ng | FALSE | ÄÃ£ pháº£i dÃ¹ng OCR hay khÃ´ng (V5) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

**RÃ ng buá»™c:** `fk_cvdoc_cv`, `uk_cvdoc_cv (cv_id)`

### D.3 `cv_extractions` â€” BÃ³c tÃ¡ch cÃ³ cáº¥u trÃºc (cháº·ng 2)

Entity `CvExtraction`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `cv_id` | BIGINT | FK â†’ `cvs.id`, UQ | KhÃ´ng | â€” | CV nguá»“n |
| `extraction_json` | JSON | | KhÃ´ng | â€” | Há»c váº¥n, kinh nghiá»‡m, dá»± Ã¡nâ€¦ dáº¡ng cÃ³ cáº¥u trÃºc |
| `model_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n model AI |
| `prompt_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n prompt (V5) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | DATETIME | | CÃ³ | NULL | Kiá»ƒu `DATETIME` chá»© khÃ´ng pháº£i `TIMESTAMP` â€” MySQL 5.7 chá»‰ cho má»™t cá»™t `ON UPDATE` má»—i báº£ng (V5) |

**RÃ ng buá»™c:** `fk_cvext_cv`, `uk_cvext_cv (cv_id)`

### D.4 `cv_analyses` â€” PhÃ¢n tÃ­ch vÃ  tÃ³m táº¯t (cháº·ng 3)

Entity `CvAnalysis`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `cv_id` | BIGINT | FK â†’ `cvs.id`, UQ | KhÃ´ng | â€” | CV nguá»“n |
| `summary` | TEXT | | CÃ³ | NULL | TÃ³m táº¯t á»©ng viÃªn |
| `skills_json` | JSON | | CÃ³ | NULL | Ká»¹ nÄƒng tá»•ng há»£p |
| `years_experience` | DECIMAL(4,1) | | CÃ³ | NULL | Sá»‘ nÄƒm kinh nghiá»‡m Æ°á»›c tÃ­nh |
| `raw_json` | JSON | | CÃ³ | NULL | Pháº£n há»“i thÃ´ cá»§a model, Ä‘á»ƒ truy váº¿t |
| `model_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n model AI |
| `prompt_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n prompt (V5) |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

**RÃ ng buá»™c:** `fk_cv_analyses_cv`, `uk_cv_analyses_cv (cv_id)`

### D.5 `cv_skills` â€” Ká»¹ nÄƒng phÃ¡t hiá»‡n trong CV

Entity `CvSkill`. Báº£ng khÃ´ng cÃ³ cá»™t thá»i gian.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `cv_id` | BIGINT | FK â†’ `cvs.id` | KhÃ´ng | â€” | CV nguá»“n |
| `skill_id` | BIGINT | ref* | CÃ³ | NULL | Ká»¹ nÄƒng trong tá»« Ä‘iá»ƒn â€” **khÃ´ng cÃ³ khoÃ¡ ngoáº¡i**, Ä‘á»ƒ trá»‘ng khi chÆ°a map Ä‘Æ°á»£c |
| `skill_name` | VARCHAR(128) | | KhÃ´ng | â€” | TÃªn ká»¹ nÄƒng nhÆ° AI Ä‘á»c Ä‘Æ°á»£c |
| `confidence` | DECIMAL(5,2) | | CÃ³ | NULL | Äá»™ tin cáº­y cá»§a phÃ¡t hiá»‡n |
| `level` | VARCHAR(32) | | CÃ³ | NULL | Cáº¥p Ä‘á»™ Æ°á»›c tÃ­nh |

**RÃ ng buá»™c:** `fk_cvsk_cv`

### D.6 `match_scores` â€” Äiá»ƒm khá»›p job â†” CV

Entity `MatchScore`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id`, UQ | KhÃ´ng | â€” | Tin tuyá»ƒn dá»¥ng |
| `cv_id` | BIGINT | FK â†’ `cvs.id`, UQ | KhÃ´ng | â€” | CV Ä‘Æ°á»£c cháº¥m |
| `score` | DECIMAL(5,2) | | KhÃ´ng | â€” | Äiá»ƒm khá»›p |
| `breakdown_json` | JSON | | CÃ³ | NULL | Chi tiáº¿t cÃ¡ch tÃ­nh Ä‘iá»ƒm |
| `model_version` | VARCHAR(64) | | CÃ³ | NULL | PhiÃªn báº£n model cháº¥m |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_match_job`, `fk_match_cv`, `uk_match_job_cv (job_id, cv_id)`

---

## E. Ranking

### E.1 `overall_scores` â€” Äiá»ƒm tá»•ng há»£p cá»§a Ä‘Æ¡n

Entity `OverallScore`. Báº£ng chá»‰ cÃ³ `updated_at`, khÃ´ng cÃ³ `created_at`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `application_id` | BIGINT | FK â†’ `applications.id`, UQ | KhÃ´ng | â€” | ÄÆ¡n Ä‘Æ°á»£c cháº¥m |
| `overall` | DECIMAL(5,2) | | KhÃ´ng | â€” | Äiá»ƒm tá»•ng há»£p cuá»‘i cÃ¹ng |
| `breakdown_json` | JSON | | CÃ³ | NULL | ÄÃ³ng gÃ³p cá»§a tá»«ng nguá»“n Ä‘iá»ƒm |
| `ranking_version` | VARCHAR(32) | | CÃ³ | NULL | PhiÃªn báº£n thuáº­t toÃ¡n Ä‘Ã£ dÃ¹ng |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_os_app`, `uk_os_app (application_id)`

### E.2 `candidate_rankings` â€” Thá»© háº¡ng á»©ng viÃªn trong job

Entity `CandidateRanking`. Báº£ng chá»‰ cÃ³ `updated_at`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `job_id` | BIGINT | FK â†’ `jobs.id`, UQ | KhÃ´ng | â€” | Pháº¡m vi xáº¿p háº¡ng |
| `application_id` | BIGINT | FK â†’ `applications.id`, UQ | KhÃ´ng | â€” | ÄÆ¡n Ä‘Æ°á»£c xáº¿p háº¡ng |
| `rank_position` | INT | | KhÃ´ng | â€” | Vá»‹ trÃ­ trong báº£ng xáº¿p háº¡ng |
| `score` | DECIMAL(5,2) | | KhÃ´ng | â€” | Äiá»ƒm dÃ¹ng Ä‘á»ƒ xáº¿p háº¡ng |
| `ranking_version` | VARCHAR(32) | | CÃ³ | NULL | PhiÃªn báº£n thuáº­t toÃ¡n |
| `updated_at` | TIMESTAMP | | KhÃ´ng | now on update | |

**RÃ ng buá»™c:** `fk_cr_job`, `fk_cr_app`, `uk_cr_job_app (job_id, application_id)`

### E.3 `ranking_configs` â€” Cáº¥u hÃ¬nh trá»ng sá»‘ cháº¥m Ä‘iá»ƒm

Entity `RankingConfig`. **KhoÃ¡ chÃ­nh tá»± nhiÃªn** lÃ  `job_id`, Ã©p quan há»‡ 1:1 vá»›i `jobs`.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `job_id` | BIGINT | PK, FK â†’ `jobs.id` | KhÃ´ng | â€” | Tin tuyá»ƒn dá»¥ng sá»Ÿ há»¯u cáº¥u hÃ¬nh |
| `config_json` | JSON | | KhÃ´ng | â€” | Bá»™ trá»ng sá»‘ cho tá»«ng nguá»“n Ä‘iá»ƒm |
| `revision` | BIGINT | | KhÃ´ng | 1 | TÄƒng má»—i láº§n cáº¥u hÃ¬nh thay Ä‘á»•i |

**RÃ ng buá»™c:** `fk_rank_config_job`

### E.4 `ranking_sources` â€” Nguá»“n Ä‘iá»ƒm Ä‘Ã£ dÃ¹ng Ä‘á»ƒ xáº¿p háº¡ng

Entity `RankingSource`. **KhoÃ¡ chÃ­nh tá»± nhiÃªn** lÃ  `application_id`. Cáº£ ba cá»™t nguá»“n Ä‘á»u cÃ³ khoÃ¡ ngoáº¡i tháº­t.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `application_id` | BIGINT | PK, FK â†’ `applications.id` | KhÃ´ng | â€” | ÄÆ¡n Ä‘Æ°á»£c xáº¿p háº¡ng |
| `cv_id` | BIGINT | FK â†’ `cvs.id` | CÃ³ | NULL | CV Ä‘Ã£ dÃ¹ng Ä‘á»ƒ tÃ­nh Ä‘iá»ƒm |
| `submission_id` | BIGINT | FK â†’ `submissions.id` | CÃ³ | NULL | LÆ°á»£t thi Ä‘Ã£ dÃ¹ng |
| `ai_interview_id` | BIGINT | FK â†’ `ai_interviews.id` | CÃ³ | NULL | PhiÃªn AI Ä‘Ã£ dÃ¹ng |

**RÃ ng buá»™c:** `fk_rank_source_app`, `fk_rank_source_cv`, `fk_rank_source_submission`, `fk_rank_source_ai_interview`

### E.5 `recommendations` â€” Gá»£i Ã½ Ä‘a hÃ¬nh

Entity `Recommendation`. **KhÃ´ng cÃ³ khoÃ¡ ngoáº¡i nÃ o** â€” toÃ n váº¹n phá»¥ thuá»™c hoÃ n toÃ n vÃ o táº§ng service.

| Cá»™t | Kiá»ƒu | KhoÃ¡ | Null | Default | MÃ´ táº£ |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | KhÃ´ng | auto | |
| `subject_type` | VARCHAR(32) | | KhÃ´ng | â€” | Loáº¡i Ä‘á»‘i tÆ°á»£ng nháº­n gá»£i Ã½ |
| `subject_id` | BIGINT | ref* | KhÃ´ng | â€” | Id Ä‘á»‘i tÆ°á»£ng nháº­n, diá»…n giáº£i theo `subject_type` |
| `target_type` | VARCHAR(32) | | KhÃ´ng | â€” | Loáº¡i Ä‘á»‘i tÆ°á»£ng Ä‘Æ°á»£c gá»£i Ã½ |
| `target_id` | BIGINT | ref* | KhÃ´ng | â€” | Id Ä‘á»‘i tÆ°á»£ng Ä‘Æ°á»£c gá»£i Ã½ |
| `score` | DECIMAL(5,2) | | KhÃ´ng | â€” | Äá»™ phÃ¹ há»£p |
| `reason_json` | JSON | | CÃ³ | NULL | LÃ½ do gá»£i Ã½ |
| `created_at` | TIMESTAMP | | KhÃ´ng | now | |

---

## F. Test & Proctoring

### F.1 `tests` — Đề thi

Entity `JobTest` (class Java tránh xung đột JUnit `Test`).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `job_id` | BIGINT | FK → `jobs.id` | Không | — | Tin tuyển dụng sở hữu đề |
| `title` | VARCHAR(255) | | Không | — | Tên đề thi |
| `description` | TEXT | | Có | NULL | Mô tả |
| `duration_minutes` | INT | | Không | — | Thời lượng (phút) |
| `passing_score` | DECIMAL(10,2) | | Có | NULL | Điểm đạt |
| `status` | VARCHAR(32) | | Không | `'DRAFT'` | `TestStatus`: DRAFT, PUBLISHED, ARCHIVED |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_tests_job`

### F.2 `questions` — Câu hỏi

Entity `Question`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `test_id` | BIGINT | FK → `tests.id` | Không | — | Đề thi |
| `question_text` | TEXT | | Không | — | Nội dung câu hỏi |
| `question_type` | VARCHAR(32) | | Không | — | Loại câu hỏi |
| `points` | INT | | Không | 1 | Điểm tối đa |
| `question_order` | INT | | Không | 0 | Thứ tự |

**Ràng buộc:** `fk_questions_test`

### F.3 `options` — Lựa chọn trả lời

Entity `Option`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `question_id` | BIGINT | FK → `questions.id` | Không | — | Câu hỏi |
| `option_text` | TEXT | | Không | — | Nội dung lựa chọn |
| `is_correct` | BOOLEAN | | Không | FALSE | **Không lộ cho thí sinh** |

**Ràng buộc:** `fk_options_question`

### F.4 `submissions` — Lượt làm bài

Entity `Submission`. Điểm tổng nằm ngay trên bảng (không còn `attempt_scores`).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `test_id` | BIGINT | FK → `tests.id` | Không | — | Đề thi |
| `candidate_id` | BIGINT | FK → `users.id` | Không | — | Ứng viên |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn ứng tuyển |
| `started_at` | TIMESTAMP | | Có | NULL | Bắt đầu |
| `submitted_at` | TIMESTAMP | | Có | NULL | Nộp bài |
| `score` | DECIMAL(10,2) | | Có | NULL | Điểm tổng |
| `notes` | TEXT | | Có | NULL | Ghi chú |
| `status` | VARCHAR(32) | | Không | `'NOT_STARTED'` | `TestSubmissionStatus` |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_submissions_test`, `fk_submissions_candidate`, `fk_submissions_application`

### F.5 `answers` — Câu trả lời trong lượt làm

Entity `Answer`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `submission_id` | BIGINT | FK → `submissions.id` | Không | — | Lượt làm |
| `question_id` | BIGINT | FK → `questions.id` | Không | — | Câu hỏi |
| `selected_option_id` | BIGINT | FK → `options.id` | Có | NULL | Lựa chọn đã chọn |
| `answer_text` | TEXT | | Có | NULL | Tự luận |
| `is_correct` | BOOLEAN | | Có | NULL | Đúng/sai sau chấm |
| `score` | DECIMAL(10,2) | | Có | NULL | Điểm câu |

**Ràng buộc:** `fk_answers_submission`, `fk_answers_question`, `fk_answers_option`

### F.6 `coding_problems` — Bài lập trình

Entity `CodingProblem`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `test_id` | BIGINT | FK → `tests.id` | Không | — | Đề thi |
| `title` | VARCHAR(255) | | Không | — | Tên bài |
| `prompt` | TEXT | | Không | — | Đề bài |
| `time_limit_ms` | INT | | Không | 2000 | Giới hạn thời gian |
| `memory_mb` | INT | | Không | 256 | Giới hạn bộ nhớ |

**Ràng buộc:** `fk_cp_test`

### F.7 `test_cases` — Bộ test

Entity `TestCase`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `coding_problem_id` | BIGINT | FK → `coding_problems.id` | Không | — | Bài lập trình |
| `input_data` | TEXT | | Không | — | Input |
| `expected_output` | TEXT | | Không | — | Output mong đợi |
| `is_sample` | BOOLEAN | | Không | FALSE | Test mẫu công khai |
| `weight` | DECIMAL(5,2) | | Không | 1 | Trọng số |

**Ràng buộc:** `fk_tc_cp`

### F.8 `coding_submissions` — Bài nộp code

Entity `CodingSubmission`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `submission_id` | BIGINT | FK → `submissions.id` | Không | — | Lượt làm bài |
| `coding_problem_id` | BIGINT | FK → `coding_problems.id` | Không | — | Bài lập trình |
| `language` | VARCHAR(32) | | Không | — | Ngôn ngữ |
| `source_code` | LONGTEXT | | Không | — | Mã nguồn |
| `status` | VARCHAR(32) | | Không | `'QUEUED'` | `SubmissionStatus` |
| `result_json` | JSON | | Có | NULL | Kết quả chấm |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_cs_submission`, `fk_cs_cp`

### F.9 `proctor_events` — Sự kiện giám sát

Entity `ProctorEvent`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `submission_id` | BIGINT | FK → `submissions.id` | Không | — | Lượt làm đang giám sát |
| `event_type` | VARCHAR(64) | | Không | — | Loại sự kiện |
| `payload_json` | JSON | | Có | NULL | Payload |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pe_submission`

### F.10 `proctor_reports` — Báo cáo rủi ro

Entity `ProctorReport`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `submission_id` | BIGINT | FK → `submissions.id`, UQ | Không | — | Lượt làm |
| `risk_score` | DECIMAL(5,2) | | Không | — | Điểm rủi ro |
| `summary_json` | JSON | | Có | NULL | Tổng hợp |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pr_submission`, `uk_pr_submission (submission_id)`

---

## G. Direct Interview

### G.1 `interviews` — Phỏng vấn trực tiếp

Entity `Interview` (kế thừa `BaseEntity`).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn ứng tuyển |
| `interview_type` | VARCHAR(64) | | Không | — | TECHNICAL, HR, BEHAVIORAL… |
| `mode` | VARCHAR(64) | | Không | — | DIRECT / ONLINE / … |
| `status` | VARCHAR(32) | | Không | `'CREATED'` | `InterviewStatus` |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_interviews_application`

### G.2 `interview_schedules` — Lịch phỏng vấn

Entity `InterviewSchedule`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id` | Không | — | Phiên phỏng vấn |
| `scheduled_start` | TIMESTAMP | | Không | — | Bắt đầu |
| `scheduled_end` | TIMESTAMP | | Không | — | Kết thúc |
| `location` | VARCHAR(255) | | Có | NULL | Địa điểm |
| `meeting_url` | VARCHAR(512) | | Có | NULL | Link họp |
| `status` | VARCHAR(32) | | Không | `'PROPOSED'` | `ScheduleStatus` |

**Ràng buộc:** `fk_isched_interview`

### G.3 `interview_participants` — Người tham gia

Entity `InterviewParticipant`. PK kép.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `interview_id` | BIGINT | PK, FK → `interviews.id` | Không | — | Phiên |
| `user_id` | BIGINT | PK, FK → `users.id` | Không | — | Người tham gia |
| `participant_role` | VARCHAR(64) | | Không | — | PRIMARY / SECONDARY / OBSERVER… |
| `joined_at` | TIMESTAMP | | Có | NULL | Thời điểm tham gia |

**Ràng buộc:** `fk_ip_interview`, `fk_ip_user`

### G.4 `interview_security_settings` — Cấu hình bảo mật phiên

Entity `InterviewSecuritySetting` (kế thừa `BaseEntity`).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id`, UQ | Không | — | Phiên |
| `camera_required` | BOOLEAN | | Không | FALSE | |
| `microphone_required` | BOOLEAN | | Không | FALSE | |
| `screen_share_required` | BOOLEAN | | Không | FALSE | |
| `fullscreen_required` | BOOLEAN | | Không | FALSE | |
| `browser_restriction` | BOOLEAN | | Không | FALSE | |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now on update | |

**Ràng buộc:** `fk_iss_interview`, `uk_iss_interview (interview_id)`

### G.5 `interview_evaluations` — Đánh giá người phỏng vấn

Entity `InterviewEvaluation`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `interview_id` | BIGINT | FK → `interviews.id` | Không | — | Phiên |
| `evaluator_id` | BIGINT | FK → `users.id` | Không | — | Người đánh giá |
| `technical_score` | DECIMAL(10,2) | | Có | NULL | |
| `communication_score` | DECIMAL(10,2) | | Có | NULL | |
| `culture_score` | DECIMAL(10,2) | | Có | NULL | |
| `overall_score` | DECIMAL(10,2) | | Có | NULL | |
| `comments` | TEXT | | Có | NULL | |
| `recommendation` | VARCHAR(64) | | Có | NULL | |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ie_interview`, `fk_ie_evaluator`

---

## H. AI Interview

### H.1 `ai_interviews` — Phiên phỏng vấn AI

Entity `AiInterview`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `application_id` | BIGINT | FK → `applications.id` | Không | — | Đơn ứng tuyển |
| `workflow_stage_id` | BIGINT | FK → `recruitment_stages.id` | Có | NULL | Vòng workflow |
| `started_at` | TIMESTAMP | | Có | NULL | |
| `completed_at` | TIMESTAMP | | Có | NULL | |
| `overall_score` | DECIMAL(10,2) | | Có | NULL | Điểm tổng phiên |
| `status` | VARCHAR(32) | | Không | `'CREATED'` | `AiInterviewStatus` |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ai_int_application`, `fk_ai_int_stage`

### H.2 `ai_questions` — Câu hỏi AI

Entity `AiQuestion`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `ai_interview_id` | BIGINT | FK → `ai_interviews.id` | Không | — | Phiên |
| `question_text` | TEXT | | Không | — | Nội dung |
| `question_type` | VARCHAR(32) | | Không | — | Loại |
| `question_order` | INT | | Không | 0 | Thứ tự |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ai_q_interview`

### H.3 `ai_answers` — Câu trả lời AI interview

Entity `AiAnswer`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `ai_question_id` | BIGINT | FK → `ai_questions.id`, UQ | Không | — | Câu hỏi |
| `answer_text` | TEXT | | Có | NULL | Nội dung trả lời |
| `answer_duration` | INT | | Có | NULL | Thời lượng (giây) |
| `answered_at` | TIMESTAMP | | Có | NULL | Thời điểm trả lời |

**Ràng buộc:** `fk_ai_a_question`, `uk_ai_a_question (ai_question_id)`

### H.4 `ai_feedbacks` — Feedback AI theo câu trả lời

Entity `AiFeedback`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `ai_answer_id` | BIGINT | FK → `ai_answers.id`, UQ | Không | — | Câu trả lời |
| `score` | DECIMAL(10,2) | | Có | NULL | Điểm câu |
| `feedback_text` | TEXT | | Có | NULL | Nhận xét |
| `strengths` | TEXT | | Có | NULL | Điểm mạnh |
| `weaknesses` | TEXT | | Có | NULL | Điểm yếu |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ai_f_answer`, `uk_ai_f_answer (ai_answer_id)`

---

## I. Notification

### I.1 `notifications` — Thông báo in-app

Entity `Notification`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `user_id` | BIGINT | FK → `users.id` | Không | — | Người nhận |
| `type` | VARCHAR(64) | | Không | — | Loại |
| `title` | VARCHAR(255) | | Không | — | Tiêu đề |
| `body` | TEXT | | Có | NULL | Nội dung |
| `payload_json` | JSON | | Có | NULL | Payload điều hướng |
| `read_at` | TIMESTAMP | | Có | NULL | NULL = chưa đọc |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_notif_user`

### I.2 `email_outbox` — Hàng đợi email

Entity `EmailOutbox`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `to_email` | VARCHAR(255) | | Không | — | Địa chỉ nhận |
| `subject` | VARCHAR(255) | | Không | — | Tiêu đề |
| `body` | TEXT | | Không | — | Nội dung |
| `status` | VARCHAR(32) | | Không | `'PENDING'` | |
| `attempts` | INT | | Không | 0 | Số lần thử gửi |
| `created_at` | TIMESTAMP | | Không | now | |
| `sent_at` | TIMESTAMP | | Có | NULL | |

---

## J. Practice

### J.1 `practice_sessions` — Phiên tự luyện

Entity `PracticeSession`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `candidate_id` | BIGINT | FK → `users.id` | Không | — | Ứng viên |
| `topic` | VARCHAR(255) | | Có | NULL | Chủ đề |
| `started_at` | TIMESTAMP | | Có | NULL | |
| `completed_at` | TIMESTAMP | | Có | NULL | |
| `overall_score` | DECIMAL(10,2) | | Có | NULL | Điểm phiên |
| `status` | VARCHAR(32) | | Không | `'CREATED'` | `PracticeStatus` |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ps_user`

### J.2 `practice_answers` — Câu hỏi/trả lời luyện

Entity `PracticeAnswer`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `session_id` | BIGINT | FK → `practice_sessions.id` | Không | — | Phiên |
| `question_text` | TEXT | | Không | — | Câu hỏi |
| `question_type` | VARCHAR(32) | | Có | NULL | Loại |
| `question_order` | INT | | Có | NULL | Thứ tự |
| `answer_text` | TEXT | | Có | NULL | Trả lời |
| `answer_duration` | INT | | Có | NULL | Thời lượng |
| `audio_url` | VARCHAR(512) | | Có | NULL | File ghi âm |
| `answered_at` | TIMESTAMP | | Có | NULL | |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pa_ps`

### J.3 `practice_feedbacks` — Feedback từng câu luyện

Entity `PracticeFeedback`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT | PK | Không | auto | |
| `practice_answer_id` | BIGINT | FK → `practice_answers.id` | Không | — | Câu trả lời |
| `score` | DECIMAL(10,2) | | Có | NULL | Điểm |
| `feedback_text` | TEXT | | Có | NULL | Nhận xét |
| `strengths` | TEXT | | Có | NULL | Điểm mạnh |
| `weaknesses` | TEXT | | Có | NULL | Điểm yếu |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_pf_answer`
